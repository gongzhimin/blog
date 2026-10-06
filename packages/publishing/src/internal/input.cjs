const { JSDOM } = require('jsdom');
const MOBILE_IMAGE_PREFIX = 'public/images/mobile/';
const MOBILE_IMAGE_PUBLIC_PREFIX = '/images/mobile/';
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const IMAGE_PLACEHOLDER_PATTERN = /\[(?:图片|图)(?:\s*[:：]\s*([^\]]+?))?\]/g;
const MIME_EXTENSION = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
turndownService.use(gfm);

/**
 * 将任意标题字符串清理并标准化为用于 URL 和文件名的 kebab-case 格式 slug。
 *
 * @param {string} title 原始标题
 * @returns {string} 归一化后的 slug
 */
function normalizeTitleToSlug(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .trim() || 'post'
  );
}

/**
 * 从 Markdown 源码文本的 Frontmatter 中提取指定字段值。
 *
 * @param {string} content Markdown 源码
 * @param {string} field 目标字段名（如 'title' 或 'date'）
 * @returns {string | null} 字段文本值，未找到返回 null
 */
function extractFrontmatterField(content, field) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    return null;
  }

  const fieldPattern = new RegExp(`^${field}:\\s*["']?(.+?)["']?\\s*$`, 'm');
  const match = frontmatter[1].match(fieldPattern);
  return match ? match[1].trim() : null;
}

/**
 * 提取 Frontmatter 中的 title。
 *
 * @param {string} content
 * @returns {string | null}
 */
function extractFrontmatterTitle(content) {
  return extractFrontmatterField(content, 'title');
}

/**
 * 提取 Frontmatter 中的 date。
 *
 * @param {string} content
 * @returns {string | null}
 */
function extractFrontmatterDate(content) {
  return extractFrontmatterField(content, 'date');
}

/**
 * 清除标题行首尾的 Markdown 标记（如 #、加粗、反引号等），提取干净的纯文本标题。
 *
 * @param {string} value 原始标题行
 * @returns {string} 清理后的标题字符串
 */
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

/**
 * 解析从 iOS 快捷指令接收到的 Markdown 格式正文与标题。
 * 若首行即为一级标题（# Title），自动提取为文章标题并从正文中剥离；亦可使用外部显式传入的标题覆盖。
 *
 * @param {string} markdown 快捷指令输入的 Markdown 正文
 * @param {string} [explicitTitle] 外部显式指定的标题（可选）
 * @returns {{title: string, markdown: string}}
 * @throws {Error} 当 Markdown 内容为空或未解析出有效标题时抛出
 */
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
      (headingMatch ? headingMatch[1] : firstLine),
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

/**
 * 判断行文本是否为 Markdown 块级元素语法（标题、引用、列表、代码块、表格等）。
 *
 * @param {string} line
 * @returns {boolean}
 */
function isMarkdownBlockLine(line) {
  return /^(?:#{1,6}\s|>\s?|[-+*]\s+|\d+[.)]\s+|```|~~~|\|)/.test(
    line.trimStart(),
  );
}

/**
 * 为纯文本段落自动追加 Markdown 硬换行标记（行尾两空格）。
 * 决策背景：快捷指令或移动端记事本录入的单换行在标准 CommonMark 规范中默认会被合并为同一行，
 * 本函数在非代码块、非块级语法的普通文本行尾自动补充两空格以还原移动端排版意图。
 *
 * @param {string[]} lines
 * @returns {string[]}
 */
function addMarkdownHardBreaks(lines) {
  let insideFence = false;

  return lines.map((line, index) => {
    const trimmedEnd = line.replace(/[ \t]+$/, '');
    const trimmedStart = trimmedEnd.trimStart();
    if (/^(?:```|~~~)/.test(trimmedStart)) {
      insideFence = !insideFence;
      return trimmedEnd;
    }

    const nextLine = lines[index + 1];
    const shouldAddHardBreak =
      !insideFence &&
      trimmedEnd.length > 0 &&
      nextLine !== undefined &&
      nextLine.trim().length > 0 &&
      !isMarkdownBlockLine(trimmedEnd);

    return shouldAddHardBreak ? `${trimmedEnd}  ` : trimmedEnd;
  });
}

/**
 * 根据图片 MIME 类型或原始文件名推导安全的文件扩展名（gif, jpg, png, webp）。
 *
 * @param {{mime?: string, filename?: string}} image
 * @returns {string} 规范化扩展名（不带点）
 * @throws {Error} 当无法推导出支持的扩展名时抛出
 */
function normalizeImageExtension(image) {
  const mime = String(image.mime || '')
    .trim()
    .toLowerCase();
  if (MIME_EXTENSION[mime]) {
    return MIME_EXTENSION[mime];
  }

  const filename = String(image.filename || '')
    .trim()
    .toLowerCase();
  const match = filename.match(/\.([a-z0-9]+)$/);
  if (match) {
    return match[1] === 'jpeg' ? 'jpg' : match[1];
  }

  throw new Error('Missing mobile image mime type or filename extension');
}

/**
 * 解码 Base64 格式的移动端图片数据（支持带 data:image/...;base64, 前缀或纯 base64 字符串）。
 *
 * @param {{base64?: string}} image
 * @param {number} index 图片索引号
 * @returns {Buffer} 二进制图片数据
 * @throws {Error} 当 base64 字段为空时抛出
 */
function decodeMobileImage(image, index) {
  const rawBase64 = String(image.base64 || '').trim();
  if (!rawBase64) {
    throw new Error(`Missing base64 content for mobile image ${index + 1}`);
  }

  const dataUrlMatch = rawBase64.match(/^data:(image\/[\w.+-]+);base64,(.+)$/i);
  return Buffer.from(dataUrlMatch ? dataUrlMatch[2] : rawBase64, 'base64');
}

/**
 * 组装移动端上传图片在 Git 仓库内的持久化路径与站点公开 URL 相对路径。
 *
 * @param {{date: string, extension: string, imageTimestamp: number, suffix: number}} options
 * @returns {{repoPath: string, publicPath: string}}
 */
function buildMobileImagePath({ date, extension, imageTimestamp, suffix }) {
  const [year, month] = String(date).split('-');
  if (!year || !month) {
    throw new Error(`Invalid mobile image date: ${date}`);
  }

  const fileName = `img-${imageTimestamp}-${String(suffix).padStart(
    3,
    '0',
  )}.${extension}`;
  return {
    repoPath: `${MOBILE_IMAGE_PREFIX}${year}/${month}/${fileName}`,
    publicPath: `${MOBILE_IMAGE_PUBLIC_PREFIX}${year}/${month}/${fileName}`,
  };
}

/**
 * 将 Markdown 正文中的 [图: 说明] 或 [图片: 说明] 占位符顺序替换为规范的 Markdown 图片标签（![说明](/images/mobile/...)），
 * 并返回生成的二进制文件待提交对象数组。
 *
 * @param {Object} options
 * @param {string} options.markdown 包含图片占位符的 Markdown 正文
 * @param {Array<{base64: string, mime?: string, filename?: string}>} [options.images] 待插入的图片列表
 * @param {string} options.date 发布日期（YYYY-MM）
 * @param {number} options.randomSuffix 随机序号基数
 * @param {number} options.imageTimestamp 时间戳基数
 * @returns {{markdown: string, files: Array<{repoPath: string, content: Buffer}>}}
 * @throws {Error} 当占位符数量与图片数组长度不匹配时抛出
 */
function replaceMobileImagePlaceholders({
  markdown,
  images = [],
  date,
  randomSuffix,
  imageTimestamp,
}) {
  if (images !== undefined && !Array.isArray(images)) {
    throw new Error('Mobile images must be an array');
  }

  const normalizedImages = Array.isArray(images) ? images : [];
  const placeholders = [
    ...String(markdown).matchAll(IMAGE_PLACEHOLDER_PATTERN),
  ];
  if (placeholders.length !== normalizedImages.length) {
    throw new Error(
      `Image placeholder count (${placeholders.length}) does not match image count (${normalizedImages.length})`,
    );
  }

  if (normalizedImages.length === 0) {
    return {
      markdown,
      files: [],
    };
  }

  const files = normalizedImages.map((image, index) => {
    const extension = normalizeImageExtension(image);
    const suffix = (randomSuffix + index) % 1000;
    const { repoPath, publicPath } = buildMobileImagePath({
      date,
      extension,
      imageTimestamp,
      suffix,
    });

    return {
      alt: String(placeholders[index][1] || '').trim(),
      publicPath,
      repoPath,
      content: decodeMobileImage(image, index),
    };
  });

  let imageIndex = 0;
  return {
    markdown: String(markdown).replace(IMAGE_PLACEHOLDER_PATTERN, () => {
      const file = files[imageIndex];
      imageIndex += 1;
      return `![${file.alt}](${file.publicPath})`;
    }),
    files: files.map(({ repoPath, content }) => ({ repoPath, content })),
  };
}

/**
 * 解析纯文本格式的快捷指令正文。
 * 提取首行作为标题（除非显式指定），其余行自动附加硬换行。
 *
 * @param {string} raw 原始纯文本
 * @param {string} [explicitTitle] 显式指定的标题
 * @returns {{title: string, markdown: string}}
 * @throws {Error} 当内容为空或未提取到有效标题时抛出
 */
function parseShortcutRaw(raw, explicitTitle) {
  const normalized = String(raw || '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const firstContentIndex = lines.findIndex((line) => line.trim());
  if (firstContentIndex === -1) {
    throw new Error('Missing raw content');
  }

  const title =
    String(explicitTitle || '').trim() ||
    cleanMarkdownTitle(lines[firstContentIndex]);
  if (!title) {
    throw new Error('Missing article title');
  }

  if (!explicitTitle) {
    lines.splice(firstContentIndex, 1);
  }
  while (lines.length && !lines[0].trim()) {
    lines.shift();
  }
  while (lines.length && !lines[lines.length - 1].trim()) {
    lines.pop();
  }

  return {
    title,
    markdown: addMarkdownHardBreaks(lines).join('\n'),
  };
}

module.exports = {
  normalizeTitleToSlug,
  extractFrontmatterDate,
  extractFrontmatterTitle,
  parseShortcutMarkdown,
  parseShortcutRaw,
  replaceMobileImagePlaceholders,
  turndownService,
  JSDOM,
};
