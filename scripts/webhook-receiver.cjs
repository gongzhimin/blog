const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const PORT = 9000;
const SECRET_TOKEN = process.env.BLOG_WEBHOOK_TOKEN || 'zhimin_secret_post_2026';
const GITHUB_REPO = process.env.BLOG_GITHUB_REPO || 'gongzhimin/blog';
const GITHUB_BRANCH = process.env.BLOG_GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.BLOG_GITHUB_TOKEN;
const BLOG_ROOT = '/var/www/blog';
const IMAGE_DIR = '/public/images/mobile';
const GITHUB_API_BASE = 'https://api.github.com';

const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndownService.use(gfm);

function toBase64(buffer) {
  return Buffer.isBuffer(buffer) ? buffer.toString('base64') : Buffer.from(buffer).toString('base64');
}

function normalizeTitleToSlug(title) {
  return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').trim() || 'post';
}

function extractFrontmatterTitle(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  const titleMatch = match[1].match(/^title:\s*["']?(.+?)["']?$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}

function findLifePostMatches(blogRoot, title) {
  const contentDir = path.join(blogRoot, 'src/content/life');
  if (!fs.existsSync(contentDir)) {
    return [];
  }

  const slug = normalizeTitleToSlug(title);
  return fs
    .readdirSync(contentDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const filepath = path.join(contentDir, fileName);
      const content = fs.readFileSync(filepath, 'utf8');
      return {
        filepath,
        title: extractFrontmatterTitle(content),
        mtimeMs: fs.statSync(filepath).mtimeMs,
      };
    })
    .filter((file) => file.title === title)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function buildLifePostPlan({ blogRoot, title, markdown, date, randomSuffix = Math.floor(Math.random() * 1000) }) {
  const matches = findLifePostMatches(blogRoot, title);
  const canonicalFile = matches[0]?.filepath;
  const duplicatePaths = matches.slice(1).map((file) => file.filepath);
  const slug = normalizeTitleToSlug(title);
  const filepath = canonicalFile || path.join(blogRoot, 'src/content/life', `${date}-${slug}-${randomSuffix}.md`);
  const frontmatter = `---\ntitle: "${title}"\ndescription: "Posted from mobile"\ndate: ${date}\n---\n\n${markdown}\n`;

  return { filepath, frontmatter, duplicatePaths };
}

async function githubRequest(method, pathname, body) {
  if (!GITHUB_TOKEN) {
    throw new Error('Missing BLOG_GITHUB_TOKEN');
  }

  const response = await fetch(`${GITHUB_API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && payload.message ? payload.message : text || `GitHub API error (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function publishFilesToGitHub(files, commitMessage) {
  const [owner, repo] = GITHUB_REPO.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid BLOG_GITHUB_REPO: ${GITHUB_REPO}`);
  }

  const ref = await githubRequest(
    'GET',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`
  );
  const headCommitSha = ref.object.sha;

  const headCommit = await githubRequest(
    'GET',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${headCommitSha}`
  );
  const baseTreeSha = headCommit.tree.sha;

  const treeEntries = [];
  for (const file of files) {
    if (file.delete) {
      treeEntries.push({
        path: file.repoPath,
        mode: '100644',
        type: 'blob',
        sha: null,
      });
      continue;
    }

    const blob = await githubRequest(
      'POST',
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
      {
        content: toBase64(file.content),
        encoding: 'base64',
      }
    );
    treeEntries.push({
      path: file.repoPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const tree = await githubRequest(
    'POST',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
    {
      base_tree: baseTreeSha,
      tree: treeEntries,
    }
  );

  const commit = await githubRequest(
    'POST',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
    {
      message: commitMessage,
      tree: tree.sha,
      parents: [headCommitSha],
    }
  );

  await githubRequest(
    'PATCH',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`,
    {
      sha: commit.sha,
    }
  );
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const rawData = JSON.parse(body);
        const data = {};
        for (let key in rawData) { data[key.trim()] = rawData[key]; }
        
        if (data.token !== SECRET_TOKEN) {
          res.statusCode = 403;
          return res.end('Forbidden');
        }

        let htmlContent = '';
        let title = 'Untitled Post';

        if (data.raw) {
          const lines = data.raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length > 0) {
            title = lines[0];
            const rest = lines.slice(1).join('\n\n');
            htmlContent = '<h1>' + title + '</h1>' + (rest ? '<p>' + rest.replace(/\n/g, '<br>') + '</p>' : '');
          }
        } else if (data.html) {
          htmlContent = data.html;
        }

        if (!htmlContent) {
          res.statusCode = 400;
          return res.end('Missing content');
        }

        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        const filesToPublish = [];

        // Process Images
        const images = document.querySelectorAll('img');
        for (let img of images) {
          const src = img.getAttribute('src');
          if (src && src.startsWith('data:image/')) {
            const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
              const ext = match[1];
              const base64Data = match[2];
              const fileName = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
              const fullPath = path.join(BLOG_ROOT, IMAGE_DIR, fileName);
              if (!fs.existsSync(path.join(BLOG_ROOT, IMAGE_DIR))) fs.mkdirSync(path.join(BLOG_ROOT, IMAGE_DIR), { recursive: true });
              fs.writeFileSync(fullPath, base64Data, 'base64');
              img.setAttribute('src', `/images/mobile/${fileName}`);
              filesToPublish.push({
                repoPath: `public/images/mobile/${fileName}`,
                content: Buffer.from(base64Data, 'base64'),
              });
            }
          }
        }

        const h1 = document.querySelector('h1');
        if (h1) {
          title = h1.textContent.trim() || title;
          h1.remove();
        }

        const markdown = turndownService.turndown(document.body.innerHTML);
        const date = new Date().toISOString().split('T')[0];
        const plan = buildLifePostPlan({
          blogRoot: BLOG_ROOT,
          title,
          markdown,
          date,
        });

        fs.mkdirSync(path.dirname(plan.filepath), { recursive: true });
        fs.writeFileSync(plan.filepath, plan.frontmatter);
        for (const duplicatePath of plan.duplicatePaths) {
          if (duplicatePath !== plan.filepath && fs.existsSync(duplicatePath)) {
            fs.unlinkSync(duplicatePath);
          }
        }
        filesToPublish.push({
          repoPath: path.relative(BLOG_ROOT, plan.filepath).replace(/\\/g, '/'),
          content: Buffer.from(plan.frontmatter, 'utf8'),
        });
        for (const duplicatePath of plan.duplicatePaths) {
          filesToPublish.push({
            repoPath: path.relative(BLOG_ROOT, duplicatePath).replace(/\\/g, '/'),
            delete: true,
          });
        }

        const commitMsg = `docs: mobile post [${title}]`;
        await publishFilesToGitHub(filesToPublish, commitMsg);
        res.statusCode = 200;
        res.end('Success');

      } catch (err) {
        console.error('WEBHOOK ERROR:', err);
        res.statusCode = 400;
        res.end(err && err.message ? err.message : 'Error');
      }
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1');
}

module.exports = {
  buildLifePostPlan,
  normalizeTitleToSlug,
  extractFrontmatterTitle,
  findLifePostMatches,
  toBase64,
  publishFilesToGitHub,
};
