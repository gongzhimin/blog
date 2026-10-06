/** @typedef {import('../../api/types.mjs').BookDocument} BookDocument */
/** @typedef {Record<string, any>} BookConfig */

/* ── Proquint article keys ──────────────────────────────────────────
 * Each article gets a pronounceable 11-char key derived from its slug
 * via CRC32 → 2× proquint syllables. Used for ?post=<key> URLs.
 */
const CONSONANTS = 'bdfghjklmnprstvz';
const VOWELS = 'aiou';

/** @param {number} uint16 */
function proquintEncode16(uint16) {
  return (
    CONSONANTS[(uint16 >> 12) & 0xf] +
    VOWELS[(uint16 >> 10) & 0x3] +
    CONSONANTS[(uint16 >> 6) & 0xf] +
    VOWELS[(uint16 >> 4) & 0x3] +
    CONSONANTS[uint16 & 0xf]
  );
}

/** @param {Uint8Array} bytes */
function crc32Bytes(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** @param {string} slug */
function articleKey(slug) {
  const bytes = new TextEncoder().encode(slug);
  const hash = crc32Bytes(bytes);
  return proquintEncode16(hash >>> 16) + '-' + proquintEncode16(hash & 0xffff);
}

/** @param {Date} date */
export function defaultFormatDate(date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** @param {{articles: Array<{title: string}>, tocTitle?: string, romanPage?: string}} options */
export function buildToc({ articles, tocTitle = '目录', romanPage = 'v' }) {
  return (
    `<div class="table-contents"><h1>${tocTitle}</h1><ul>` +
    articles
      .map(
        (article, index) =>
          `<li><a href="#page/${7 + index}">${article.title} <span>${1 + index}</span></a></li>`,
      )
      .join('') +
    `</ul></div><span class="page-number">${romanPage}</span>`
  );
}

/**
 * @param {{document: BookDocument, bookConfig: BookConfig, renderMarkdown: (body: string) => string, stripLeadingTitle: (body: string, title: string) => string, formatDate?: (date: Date) => string, romanTocPage?: (page: number) => string}} options
 * @returns {{document: BookDocument, articles: Array<{title: string, dateStr: string, bodyHTML: string, key: string, source: {id: string, collection: string}}>, toc: string, config: BookConfig}}
 */
export function buildBookRuntime({
  document,
  bookConfig,
  renderMarkdown,
  stripLeadingTitle,
  formatDate = defaultFormatDate,
  romanTocPage = () => 'v',
}) {
  const articles = document.entries.map((entry) => {
    const body = stripLeadingTitle(entry.body || '', entry.title);
    return {
      title: entry.title,
      dateStr: formatDate(entry.date),
      bodyHTML: entry.bodyType === 'html' ? body : renderMarkdown(body),
      key: articleKey(entry.id),
      source: {
        id: entry.id,
        collection: entry.collection,
      },
    };
  });

  const toc = buildToc({
    articles,
    tocTitle: document.tocTitle,
    romanPage: romanTocPage(5),
  });

  const estPages = 7 + articles.length * 3 + 2;
  /** @type {BookConfig} */
  const config = JSON.parse(JSON.stringify(bookConfig));
  config.book.turn.startPage = 7;
  config.book.turn.totalPages = estPages;
  config.book.turn.backPage = config.book.turn.totalPages - 1;
  const pagination = config.book.pagination || {};
  const mobilePagination = config.book.pagination?.mobilePagination || null;
  config.runtime = {
    ...(config.runtime || {}),
    pagination: {
      articleWidth: pagination.contentWidth,
      articleHeight: pagination.contentHeight,
      tocWidth: pagination.tocWidth ?? pagination.contentWidth,
      tocHeight: pagination.tocHeight ?? 400,
    },
    mobilePagination: mobilePagination
      ? {
          articleWidth: mobilePagination.contentWidth,
          articleHeight: mobilePagination.contentHeight,
          tocWidth: mobilePagination.tocWidth ?? mobilePagination.contentWidth,
          tocHeight: mobilePagination.tocHeight ?? 320,
        }
      : null,
  };
  config.articles = articles;
  config.toc = toc;
  config.source = {
    documentId: document.id,
    documentTitle: document.title,
    tocTitle: document.tocTitle,
    entryCount: document.entries.length,
  };

  return {
    document,
    articles,
    toc,
    config,
  };
}
