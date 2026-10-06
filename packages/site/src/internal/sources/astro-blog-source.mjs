/** @typedef {import('@myblog/book-build').BookDocument} BookDocument */
/** @typedef {{id: string, body?: string, data: {title: string, date?: Date, pubDatetime?: Date, draft?: boolean, [key: string]: unknown}}} Post */

/**
 * 安全解析 Astro 内容集合条目中的有效发布日期（优先使用 pubDatetime，其次回退至 date）。
 *
 * @param {Post} post Astro 集合博文条目
 * @returns {Date} 有效的 Date 对象
 * @throws {Error} 当日期不是合法的有限时间戳时抛出
 */
export function getPostDate(post) {
  const date = post.data.pubDatetime ?? post.data.date;
  if (!(date instanceof Date) || !Number.isFinite(date.valueOf()))
    throw new Error(`Invalid post date: ${post.id}`);
  return date;
}

/**
 * 获取标准化书籍条目的发布时间。
 *
 * @param {import('@myblog/book-build').BookEntry} entry 书籍条目
 * @returns {Date}
 */
export function getBookEntryDate(entry) {
  return entry.date;
}

/**
 * 将单个 Astro 博文转换为主干书籍系统通用的 BookEntry 契约数据结构。
 *
 * @param {Post} post Astro 集合博文
 * @param {string} collection 归属集合（'life' | 'blog'）
 * @returns {import('@myblog/book-build').BookEntry}
 */
function toEntry(post, collection) {
  return {
    id: post.id,
    collection,
    title: post.data.title,
    date: getPostDate(post),
    body: post.body || '',
    bodyType: /** @type {const} */ ('markdown'),
    metadata: post.data,
  };
}

/**
 * 将 Astro 的 life（随笔）与 blog（技术）集合博文合并、过滤草稿并按发布时间倒序排列，组装为整书文档对象。
 *
 * @param {{lifePosts: Post[], blogPosts: Post[]}} posts 原始博文集合列表
 * @returns {BookDocument} 组装完成的书籍文档实体
 */
export function createAstroBlogDocument({ lifePosts, blogPosts }) {
  const entries = [
    ...lifePosts
      .filter((post) => !post.data.draft)
      .map((post) => toEntry(post, 'life')),
    ...blogPosts
      .filter((post) => !post.data.draft)
      .map((post) => toEntry(post, 'blog')),
  ].sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return {
    id: 'zhimin-blog',
    title: 'Zhimin 的博客书',
    tocTitle: '目录',
    entries,
  };
}
