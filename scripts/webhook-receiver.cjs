const http = require('http');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const PORT = 9000;
const SECRET_TOKEN = process.env.BLOG_WEBHOOK_TOKEN || 'zhimin_secret_post_2026';
const GITHUB_REPO = process.env.BLOG_GITHUB_REPO || 'gongzhimin/blog';
const GITHUB_BRANCH = process.env.BLOG_GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.BLOG_GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';
const LIFE_POST_PREFIX = 'src/content/life/';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
turndownService.use(gfm);

function toBase64(buffer) {
  return Buffer.isBuffer(buffer)
    ? buffer.toString('base64')
    : Buffer.from(buffer).toString('base64');
}

function normalizeTitleToSlug(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .trim() || 'post'
  );
}

function extractFrontmatterField(content, field) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    return null;
  }

  const fieldPattern = new RegExp(`^${field}:\\s*["']?(.+?)["']?\\s*$`, 'm');
  const match = frontmatter[1].match(fieldPattern);
  return match ? match[1].trim() : null;
}

function extractFrontmatterTitle(content) {
  return extractFrontmatterField(content, 'title');
}

function extractFrontmatterDate(content) {
  return extractFrontmatterField(content, 'date');
}

function cleanMarkdownTitle(value) {
  return value
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#+$/, '')
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^__(.+)__$/, '$1')
    .replace(/^\*(.+)\*$/, '$1')
    .replace(/^_(.+)_$/, '$1')
    .replace(/^`(.+)`$/, '$1')
    .trim();
}

function parseShortcutMarkdown(markdown, explicitTitle) {
  const normalized = String(markdown || '')
    .replace(/\r\n?/g, '\n')
    .trim();
  if (!normalized) {
    throw new Error('Missing markdown content');
  }

  const lines = normalized.split('\n');
  const firstContentIndex = lines.findIndex((line) => line.trim());
  const firstLine = lines[firstContentIndex].trim();
  const headingMatch = firstLine.match(/^#\s+(.+?)\s*#*$/);
  const title = cleanMarkdownTitle(
    String(explicitTitle || '').trim() ||
      (headingMatch ? headingMatch[1] : firstLine)
  );
  if (!title) {
    throw new Error('Missing article title');
  }

  if (!explicitTitle || headingMatch) {
    lines.splice(firstContentIndex, 1);
  }

  return {
    title,
    markdown: lines.join('\n').trim(),
  };
}

function buildGitHubLifePostPlan({
  posts,
  title,
  markdown,
  date,
  randomSuffix = Math.floor(Math.random() * 1000),
}) {
  const matches = posts
    .filter((post) => extractFrontmatterTitle(post.content) === title)
    .sort((a, b) => b.repoPath.localeCompare(a.repoPath));
  const canonicalPost = matches[0];
  const postDate = canonicalPost
    ? extractFrontmatterDate(canonicalPost.content) || date
    : date;
  const repoPath =
    canonicalPost?.repoPath ||
    `${LIFE_POST_PREFIX}${date}-${normalizeTitleToSlug(title)}-${randomSuffix}.md`;
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    'description: "Posted from mobile"',
    `date: ${postDate}`,
    '---',
    '',
    markdown,
    '',
  ].join('\n');

  return {
    repoPath,
    frontmatter,
    duplicateRepoPaths: matches.slice(1).map((post) => post.repoPath),
  };
}

function repositoryApiPath(pathname) {
  const [owner, repo] = GITHUB_REPO.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid BLOG_GITHUB_REPO: ${GITHUB_REPO}`);
  }

  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${pathname}`;
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
    const message =
      payload && typeof payload === 'object' && payload.message
        ? payload.message
        : text || `GitHub API error (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function loadGitHubRepositoryState(request = githubRequest) {
  const ref = await request(
    'GET',
    repositoryApiPath(
      `/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`
    )
  );
  const headCommitSha = ref.object.sha;
  const headCommit = await request(
    'GET',
    repositoryApiPath(`/git/commits/${headCommitSha}`)
  );
  const baseTreeSha = headCommit.tree.sha;
  const tree = await request(
    'GET',
    repositoryApiPath(`/git/trees/${baseTreeSha}?recursive=1`)
  );

  if (tree.truncated) {
    throw new Error('GitHub repository tree is truncated');
  }

  const treeEntries = Array.isArray(tree.tree) ? tree.tree : [];
  const lifeEntries = treeEntries.filter(
    (entry) =>
      entry.type === 'blob' &&
      entry.path.startsWith(LIFE_POST_PREFIX) &&
      entry.path.endsWith('.md')
  );
  const posts = await Promise.all(
    lifeEntries.map(async (entry) => {
      const blob = await request(
        'GET',
        repositoryApiPath(`/git/blobs/${entry.sha}`)
      );
      if (blob.encoding !== 'base64') {
        throw new Error(`Unsupported GitHub blob encoding: ${blob.encoding}`);
      }

      return {
        repoPath: entry.path,
        content: Buffer.from(
          blob.content.replace(/\s/g, ''),
          'base64'
        ).toString('utf8'),
      };
    })
  );

  return {
    headCommitSha,
    baseTreeSha,
    existingPaths: new Set(treeEntries.map((entry) => entry.path)),
    posts,
  };
}

function buildMobilePublication({
  data,
  repositoryState,
  date = new Date().toISOString().split('T')[0],
  randomSuffix = Math.floor(Math.random() * 1000),
  imageTimestamp = Date.now(),
}) {
  let htmlContent = '';
  let title = String(data.title || '').trim();
  let markdown = '';

  if (data.markdown) {
    const parsed = parseShortcutMarkdown(data.markdown, title);
    title = parsed.title;
    markdown = parsed.markdown;
  } else if (data.raw) {
    const lines = data.raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      title = lines[0];
      const rest = lines.slice(1).join('\n\n');
      htmlContent =
        `<h1>${title}</h1>` +
        (rest ? `<p>${rest.replace(/\n/g, '<br>')}</p>` : '');
    }
  } else if (data.html) {
    htmlContent = data.html;
  }

  if (!markdown && !htmlContent) {
    throw new Error('Missing content');
  }

  const files = [];
  if (htmlContent) {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const images = document.querySelectorAll('img');
    let imageIndex = 0;

    for (const image of images) {
      const src = image.getAttribute('src');
      if (!src || !src.startsWith('data:image/')) {
        continue;
      }

      const match = src.match(/^data:image\/([\w.+-]+);base64,(.+)$/);
      if (!match) {
        continue;
      }

      const extension = match[1];
      const base64Data = match[2];
      const imageSuffix = (randomSuffix + imageIndex) % 1000;
      const fileName = `img-${imageTimestamp}-${imageSuffix}.${extension}`;
      imageIndex += 1;
      image.setAttribute('src', `/images/mobile/${fileName}`);
      files.push({
        repoPath: `public/images/mobile/${fileName}`,
        content: Buffer.from(base64Data, 'base64'),
      });
    }

    const h1 = document.querySelector('h1');
    if (h1) {
      title = h1.textContent.trim() || title;
      h1.remove();
    }

    if (!title) {
      const firstBlock = document.querySelector(
        'h2, h3, h4, h5, h6, p, li, blockquote'
      );
      title = firstBlock?.textContent.trim() || '';
      firstBlock?.remove();
    }
    if (!title) {
      throw new Error('Missing article title');
    }

    markdown = turndownService.turndown(document.body.innerHTML);
  }

  const plan = buildGitHubLifePostPlan({
    posts: repositoryState.posts,
    title,
    markdown,
    date,
    randomSuffix,
  });
  files.push({
    repoPath: plan.repoPath,
    content: Buffer.from(plan.frontmatter, 'utf8'),
  });
  for (const repoPath of plan.duplicateRepoPaths) {
    files.push({ repoPath, delete: true });
  }

  return {
    files,
    commitMessage: `docs: mobile post [${title}]`,
  };
}

async function publishFilesToGitHub(
  files,
  commitMessage,
  repositoryState,
  request = githubRequest
) {
  const state =
    repositoryState || (await loadGitHubRepositoryState(request));
  const validFiles = files.filter(
    (file) => !file.delete || state.existingPaths.has(file.repoPath)
  );
  const treeEntries = [];

  for (const file of validFiles) {
    if (file.delete) {
      treeEntries.push({
        path: file.repoPath,
        mode: '100644',
        type: 'blob',
        sha: null,
      });
      continue;
    }

    const blob = await request('POST', repositoryApiPath('/git/blobs'), {
      content: toBase64(file.content),
      encoding: 'base64',
    });
    treeEntries.push({
      path: file.repoPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const tree = await request('POST', repositoryApiPath('/git/trees'), {
    base_tree: state.baseTreeSha,
    tree: treeEntries,
  });
  const commit = await request('POST', repositoryApiPath('/git/commits'), {
    message: commitMessage,
    tree: tree.sha,
    parents: [state.headCommitSha],
  });
  await request(
    'PATCH',
    repositoryApiPath(
      `/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`
    ),
    {
      sha: commit.sha,
      force: false,
    }
  );
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    try {
      const rawData = JSON.parse(body);
      const data = {};
      for (const key in rawData) {
        data[key.trim()] = rawData[key];
      }

      if (data.token !== SECRET_TOKEN) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      const repositoryState = await loadGitHubRepositoryState();
      const publication = buildMobilePublication({
        data,
        repositoryState,
      });
      await publishFilesToGitHub(
        publication.files,
        publication.commitMessage,
        repositoryState
      );
      res.statusCode = 200;
      res.end('Success');
    } catch (error) {
      console.error('WEBHOOK ERROR:', error);
      res.statusCode = 400;
      res.end(error && error.message ? error.message : 'Error');
    }
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1');
}

module.exports = {
  buildGitHubLifePostPlan,
  buildMobilePublication,
  cleanMarkdownTitle,
  extractFrontmatterDate,
  extractFrontmatterTitle,
  loadGitHubRepositoryState,
  normalizeTitleToSlug,
  parseShortcutMarkdown,
  publishFilesToGitHub,
  toBase64,
};
