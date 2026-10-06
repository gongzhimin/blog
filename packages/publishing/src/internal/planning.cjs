const {
  normalizeTitleToSlug,
  extractFrontmatterDate,
  extractFrontmatterTitle,
  parseShortcutMarkdown,
  parseShortcutRaw,
  replaceMobileImagePlaceholders,
  turndownService,
  JSDOM,
} = require('./input.cjs');
const LIFE_POST_PREFIX = 'packages/site/src/content/life/';

/**
 * 规划 life 文章的路径分配、Frontmatter 组装及历史同名副本清理方案。
 *
 * @param {Object} options
 * @param {Array<{repoPath: string, content: string}>} options.posts 仓库既有 life 文章快照
 * @param {string} options.title 规范化后的文章标题
 * @param {string} options.markdown 准备写入的正文 Markdown
 * @param {string} options.date 创作日期 (YYYY-MM-DD)
 * @param {number} [options.randomSuffix] 随机冲突后缀
 * @returns {{repoPath: string, frontmatter: string, duplicateRepoPaths: string[]}}
 */
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

/**
 * 将移动端上传的负载（包含正文、图片附件等）解析规划为可原子提交的 GitHub 文件集。
 *
 * @param {Object} options
 * @param {Object} options.data 客户端提交的原始请求体 (包含 title, markdown/raw/html, images)
 * @param {Object} options.repositoryState 目标仓库的分支最新树状态
 * @param {string} [options.date] 发布日期 (YYYY-MM-DD)
 * @param {number} [options.randomSuffix] 文件路径随机后缀
 * @param {number} [options.imageTimestamp] 图片文件名时间戳
 * @returns {{files: Array<{path: string, content: string|Buffer, encoding?: string, delete?: boolean}>, commitMessage: string}}
 */
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
    const parsed = parseShortcutRaw(data.raw, title);
    title = parsed.title;
    markdown = parsed.markdown;
  } else if (data.html) {
    htmlContent = data.html;
  }

  if (!markdown && !htmlContent) {
    throw new Error('Missing content');
  }

  const files = [];
  if (markdown || data.images) {
    const mobileImages = replaceMobileImagePlaceholders({
      markdown,
      images: data.images,
      date,
      randomSuffix,
      imageTimestamp,
    });
    markdown = mobileImages.markdown;
    files.push(...mobileImages.files);
  }

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
        'h2, h3, h4, h5, h6, p, li, blockquote',
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

module.exports = { buildGitHubLifePostPlan, buildMobilePublication };
