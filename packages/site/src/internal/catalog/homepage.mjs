/**
 * @typedef {Object} Post
 * @property {string} id
 * @property {Object} data
 * @property {string} data.title
 * @property {Date} [data.date]
 * @property {Date} [data.pubDatetime]
 */

/**
 * @typedef {Object} CatalogOptions
 * @property {number} wideMaximumEntries
 * @property {number} narrowMaximumEntries
 * @property {string} wideDateFormat
 * @property {string} compactDateFormat
 */

/**
 * @typedef {Object} CatalogEntry
 * @property {string} title
 * @property {string} href
 * @property {string} date
 * @property {string} compactDate
 * @property {boolean} narrowHidden
 */

/**
 * @param {Post} post
 * @returns {Date}
 */
export function getPostDate(post) {
  return post.data.pubDatetime ?? post.data.date ?? new Date(NaN);
}

/**
 * @param {Date} date
 * @param {string} pattern
 * @returns {string}
 */
export function formatCatalogDate(date, pattern) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return pattern
    .replaceAll('YYYY', String(year))
    .replaceAll('MM', month)
    .replaceAll('DD', day);
}

/**
 * @param {Post[]} posts
 * @param {string} basePath
 * @param {CatalogOptions} options
 * @returns {CatalogEntry[]}
 */
export function buildCatalogEntries(posts, basePath, options) {
  return [...posts]
    .sort((a, b) => getPostDate(b).valueOf() - getPostDate(a).valueOf())
    .slice(0, options.wideMaximumEntries)
    .map((post, index) => {
      const date = getPostDate(post);

      return {
        title: post.data.title,
        href: `${basePath}/${post.id}`,
        date: formatCatalogDate(date, options.wideDateFormat),
        compactDate: formatCatalogDate(date, options.compactDateFormat),
        narrowHidden: index >= options.narrowMaximumEntries,
      };
    });
}
