/**
 * @typedef {Object} BookEntry
 * @property {string} id
 * @property {string} collection
 * @property {string} title
 * @property {Date} date
 * @property {string} body
 * @property {"markdown"|"html"} bodyType
 * @property {Record<string, unknown>} metadata
 */

/**
 * @typedef {Object} BookDocument
 * @property {string} id
 * @property {string} title
 * @property {string} tocTitle
 * @property {BookEntry[]} entries
 */

export {};
