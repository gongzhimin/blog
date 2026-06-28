/**
 * book-assembler.js — Turn.js book assembly (Layer 3).
 *
 * Wraps paginated content chunks in Turn.js‑specific HTML:
 *   .book-content divs, article headers, page‑number spans,
 *   table‑of‑contents with #page/N hash links, back‑cover parity.
 *
 * Depends on Layer 1 (book‑renderer.js) for MD→HTML conversion.
 * Receives Layer 2 (paginator) as an injected dependency.
 *
 * Exports:
 *   assembleBook(posts, options) → { pages, toc, totalPages, firstContentPage }
 *
 *   options = {
 *     paginator:  (html, pageConfig) => string[],   // ← injected, not imported
 *     pageConfig: PageConfig,
 *     startPage:  number,
 *     tocPage:    number,
 *   }
 */

import { renderMarkdown, stripLeadingTitle, romanTocPage } from './book-renderer.js';

export async function assembleBook(posts, options = {}) {
  const { paginator, pageConfig } = options;
  const startPage = options.startPage ?? 7;
  const tocPage = options.tocPage ?? 5;

  if (!paginator) throw new Error('assembleBook: paginator is required');
  if (!pageConfig) throw new Error('assembleBook: pageConfig is required');

  // Body‑content space on first page:
  //   page (582) − top‑margin (56) − page‑number (55) − header (~66)
  //   ≈ 405 px.  Continuation pages have smaller headers (~24 px)
  //   so they'll be slightly under‑filled — acceptable.
  const PX_FOR_BODY = 405;
  const paginatorPageConfig = {
    ...pageConfig,
    contentHeight: PX_FOR_BODY,
  };

  const pages = {};
  const articlePages = [];
  let pg = startPage;

  function fmtDate(d) {
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  async function addArticle(post, dateField) {
    const html = renderMarkdown(stripLeadingTitle(post.body || '', post.data.title));
    const chunks = await paginator(html, paginatorPageConfig);
    const start = pg;

    chunks.forEach((chunk, i) => {
      const header =
        i === 0
          ? `<h1>${post.data.title}</h1><p style="color:#999;font-size:11px;margin-bottom:18px">${fmtDate(post.data[dateField])}</p>`
          : `<p style="color:#999;font-size:10px;text-align:center;margin-bottom:14px">${post.data.title}（续）</p>`;

      pages[pg] = `<div class="book-content">${header}${chunk}</div><span class="page-number">${pg}</span>`;
      pg++;
    });

    articlePages.push({
      title: post.data.title,
      startPage: start,
      date: post.data[dateField],
    });
  }

  for (const post of posts) {
    const df = 'pubDatetime' in post.data ? 'pubDatetime' : 'date';
    await addArticle(post, df);
  }

  // TOC
  const tocItems = articlePages
    .sort((a, b) => b.date.valueOf() - a.date.valueOf())
    .map(
      (item) =>
        `<li><a href="#page/${item.startPage}">${item.title} <span>p.${item.startPage}</span></a></li>`,
    );

  const toc =
    '<div class="table-contents"><h1>目录</h1><ul>' +
    tocItems.join('') +
    `</ul></div><span class="page-number">${romanTocPage(tocPage)}</span>`;

  // Back‑cover parity
  const totalPages = pg % 2 === 0 ? pg + 2 : pg + 1;

  return { pages, toc, totalPages, firstContentPage: startPage };
}
