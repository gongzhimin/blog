/**
 * book-paginator.js — Layout engine (Layer 2).
 *
 * Pure functions. Receives PageConfig as a parameter; does NOT import
 * book-config.json, Turn.js, or Astro.
 *
 * Interface:
 *   simplePaginator(html, pageConfig) → string[]
 *
 *   PageConfig = {
 *     contentWidth:  number,   // px of usable content area
 *     contentHeight: number,   // px of usable content area
 *     baseFontSize:  number,
 *     baseLineHeight:number,
 *     charsPerLine:  number,   // fallback visible‑char estimate per line
 *     elements: {              // per‑element layout parameters
 *       tagName: {
 *         lineHeight:    number,
 *         paddingTop:    number,
 *         paddingBottom: number,
 *         marginBottom:  number,
 *         splittable:    boolean,
 *         splitStrategy: 'line' | 'sentence' | 'child' | 'none',
 *         orphanLines:   number,
 *       }
 *     }
 *   }
 */

import { JSDOM } from 'jsdom';
import { paginateArticle } from './paginate.js';
import puppeteer from 'puppeteer';

let _browser = null;
async function getBrowser() {
  if (!_browser) {
    _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  return _browser;
}

// ── helpers ─────────────────────────────────────────────────────

const BLOCK_RE =
  /<(h[1-6]|p|pre|table|blockquote|ul|ol|figure|div|li)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;

function countVisibleChars(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length;
}

function extractBlocks(html) {
  const blocks = [];
  const re = new RegExp(BLOCK_RE.source, BLOCK_RE.flags);
  let match;
  while ((match = re.exec(html)) !== null) {
    blocks.push({
      html: match[0],
      tag: match[1].toLowerCase(),
      visibleChars: countVisibleChars(match[0]),
    });
  }
  if (blocks.length === 0 && html.trim()) {
    blocks.push({
      html: html.trim(),
      tag: 'div',
      visibleChars: countVisibleChars(html),
    });
  }
  return blocks;
}

// ── element lookup ──────────────────────────────────────────────

const DEFAULT_ELEMENT = {
  lineHeight: 24,
  paddingTop: 0,
  paddingBottom: 0,
  marginBottom: 20,
  splittable: false,
  splitStrategy: 'none',
  orphanLines: 0,
};

function elConfig(tag, pageConfig) {
  return Object.assign({}, DEFAULT_ELEMENT, (pageConfig.elements || {})[tag]);
}

function isSplittable(block, pageConfig) {
  if (block.tag === 'pre' || block.tag === 'table') return true;
  if (block.tag === 'p' && block.visibleChars > 150) return true;
  return elConfig(block.tag, pageConfig).splittable;
}

function isHeading(block) {
  return /^h[1-6]$/.test(block.tag);
}

// ── block splitting ─────────────────────────────────────────────

// ── public API ──────────────────────────────────────────────────

// ── element‑aware height estimation ────────────────────────────

function estimateHeight(block, pageConfig) {
  const cfg = elConfig(block.tag, pageConfig);
  const textLen = block.visibleChars || countVisibleChars(block.html);
  // Lines this block occupies at the configured chars‑per‑line
  const lines = Math.max(1, Math.ceil(textLen / pageConfig.charsPerLine));
  return cfg.paddingTop + lines * cfg.lineHeight + cfg.paddingBottom + cfg.marginBottom;
}

// ── simple paginator ───────────────────────────────────────────

/**
 * Element‑aware paginator.  Uses the `elements` table in pageConfig
 * to estimate per‑element heights instead of a uniform char‑count,
 * so headings, code blocks and paragraphs each contribute their
 * actual vertical footprint.
 *
 * @param {string} html        Rendered HTML (from Layer 1)
 * @param {object} pageConfig  PageConfig (see file header)
 * @returns {string[]}         One HTML string per page
 */
export function simplePaginator(html, pageConfig) {
  const MAX_H = pageConfig.contentHeight;
  if (!html) return [''];

  const blocks = extractBlocks(html);
  if (!blocks.length) return [''];

  const pages = [];
  let curBlocks = [];
  let curH = 0;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const h = estimateHeight(b, pageConfig);

    // Fits on current page
    if (curH + h <= MAX_H) {
      curBlocks.push(b);
      curH += h;
      continue;
    }

    // Too large for current page — try to split
    if (isSplittable(b, pageConfig) && h > MAX_H - curH) {
      const remaining = MAX_H - curH;
      const parts = splitBlockByHeight(b, remaining, pageConfig);
      if (parts && parts.length > 0) {
        // First part goes on current page (if it fits at all)
        if (parts[0].estimatedH <= remaining && parts[0].estimatedH > 0) {
          curBlocks.push({ tag: b.tag, html: parts[0].html });
          curH += parts[0].estimatedH;
        }
        pages.push(curBlocks.map((x) => x.html).join('\n'));
        // Remaining parts each start new pages
        for (let j = 1; j < parts.length; j++) {
          pages.push(parts[j].html);
        }
        curBlocks = [];
        curH = 0;
        continue;
      }
    }

    // Can't split — flush current page, put element on new page
    if (curBlocks.length > 0) pages.push(curBlocks.map((x) => x.html).join('\n'));
    curBlocks = [b];
    curH = h;

    // If element alone is taller than a full page, force it anyway
    if (h > MAX_H) {
      pages.push(curBlocks.map((x) => x.html).join('\n'));
      curBlocks = [];
      curH = 0;
    }
  }

  if (curBlocks.length > 0) pages.push(curBlocks.map((x) => x.html).join('\n'));
  return pages.length > 0 ? pages : [''];
}

// ── height‑based block splitting ───────────────────────────────

function splitBlockByHeight(block, remainingPx, pageConfig) {
  const cfg = elConfig(block.tag, pageConfig);
  if (!cfg.splittable || cfg.splitStrategy === 'none') return null;

  const availableH = remainingPx - cfg.paddingTop - cfg.paddingBottom;
  if (availableH <= 0) return null;

  const linesThatFit = Math.max(1, Math.floor(availableH / cfg.lineHeight));
  if (linesThatFit >= Math.ceil(block.visibleChars / pageConfig.charsPerLine)) return null;

  if (block.tag === 'pre') return splitPreByHeight(block, linesThatFit, pageConfig);
  if (block.tag === 'table') return splitTableByHeight(block, linesThatFit, pageConfig);
  if (cfg.splitStrategy === 'sentence') return splitSentencesByHeight(block, linesThatFit, pageConfig);
  return splitLinesByHeight(block, linesThatFit, pageConfig);
}

function splitPreByHeight(block, linesThatFit) {
  const innerMatch = block.html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!innerMatch) return null;
  const lines = innerMatch[1].split('\n');
  if (linesThatFit >= lines.length) return null;
  const openTag = block.html.match(/^<pre[^>]*>/i)[0];
  return [
    { html: openTag + lines.slice(0, linesThatFit).join('\n') + '</pre>', estimatedH: linesThatFit * 20 + 40 },
    { html: openTag + lines.slice(linesThatFit).join('\n') + '</pre>', estimatedH: (lines.length - linesThatFit) * 20 + 40 },
  ];
}

function splitTableByHeight(block, linesThatFit) {
  const rows = block.html.match(/<tr[\s>][\s\S]*?<\/tr>/gi) || [];
  if (linesThatFit >= rows.length) return null;
  return [
    { html: '<table><tbody>' + rows.slice(0, linesThatFit).join('') + '</tbody></table>', estimatedH: linesThatFit * 32 },
    { html: '<table><tbody>' + rows.slice(linesThatFit).join('') + '</tbody></table>', estimatedH: (rows.length - linesThatFit) * 32 },
  ];
}

function splitSentencesByHeight(block, linesThatFit, pageConfig) {
  const innerMatch = block.html.match(new RegExp(`<${block.tag}[^>]*>([\\s\\S]*?)<\\/${block.tag}>`, 'i'));
  if (!innerMatch) return null;
  const raw = innerMatch[1];
  const sentences = raw.split(/(?<=[。！？.!?\n])\s*/);
  if (sentences.length <= 1) return null;
  const openTag = block.html.match(new RegExp(`^<${block.tag}[^>]*>`, 'i'))[0];
  const charsPerLine = pageConfig.charsPerLine;
  const sentenceLines = sentences.map(s => Math.max(1, Math.ceil(countVisibleChars(s) / charsPerLine)));
  let acc = 0, splitAt = 0;
  for (let i = 0; i < sentenceLines.length; i++) {
    if (acc + sentenceLines[i] > linesThatFit) { splitAt = i; break; }
    acc += sentenceLines[i];
  }
  if (splitAt === 0) return null;
  return [
    { html: openTag + sentences.slice(0, splitAt).join('') + '</' + block.tag + '>', estimatedH: acc * (elConfig(block.tag, pageConfig).lineHeight) },
    { html: openTag + sentences.slice(splitAt).join('') + '</' + block.tag + '>', estimatedH: (sentenceLines.reduce((a,b)=>a+b,0) - acc) * (elConfig(block.tag, pageConfig).lineHeight) },
  ];
}

function splitLinesByHeight(block, linesThatFit, pageConfig) {
  const innerMatch = block.html.match(new RegExp(`<${block.tag}[^>]*>([\\s\\S]*?)<\\/${block.tag}>`, 'i'));
  if (!innerMatch) return null;
  const raw = innerMatch[1];
  const lines = raw.split('\n');
  if (lines.length <= 1 || linesThatFit >= lines.length) return null;
  const openTag = block.html.match(new RegExp(`^<${block.tag}[^>]*>`, 'i'))[0];
  return [
    { html: openTag + lines.slice(0, linesThatFit).join('\n') + '</' + block.tag + '>', estimatedH: linesThatFit * (elConfig(block.tag, pageConfig).lineHeight) },
    { html: openTag + lines.slice(linesThatFit).join('\n') + '</' + block.tag + '>', estimatedH: (lines.length - linesThatFit) * (elConfig(block.tag, pageConfig).lineHeight) },
  ];
}

// ── layout paginator (experimental) ────────────────────────────
/**
 * JSDOM‑based layout paginator.  More accurate than simplePaginator
 * because it measures real element heights via DOM parsing, but
 * currently has known issues:
 *
 *   - Height estimation table is incomplete (h4–h6, hr, nested lists)
 *   - Blockquote flattening can lose nested structure
 *   - Img height defaults to 200px (actual size unknown at build time)
 *   - The old paginate.js was never wired in before the refactor,
 *     so edge‑case behaviour is untested.
 *
 * To switch: change index.astro to import { layoutPaginator }
 * and pass it to assembleBook.  The pageConfig interface is the
 * same as simplePaginator.
 *
 * ⚠️  EXPERIMENTAL — do not use in production without further testing.
 */
export function layoutPaginator(html, pageConfig) {
  // Map the new PageConfig.elements to the old elementHeights format
  // that paginateArticle expects.  paginateArticle treats each value
  // as TOTAL height (text + padding + margin), so we sum them here.
  function totalH(cfg) {
    return (cfg.lineHeight || 0) + (cfg.paddingTop || 0) +
           (cfg.paddingBottom || 0) + (cfg.marginBottom || 0);
  }
  const elementHeights = {};
  const elements = pageConfig.elements || {};
  for (const [tag, cfg] of Object.entries(elements)) {
    elementHeights[tag] = totalH(cfg);
  }
  // Flat keys paginateArticle expects.  Use raw lineHeight (NOT
  // totalH) for pLine / tableRow — estimateHeight adds
  // paragraphMargin separately, so including the margin here
  // would double‑count it.
  elementHeights.pLine          = elements.p?.lineHeight     || 22;
  elementHeights.codeLine       = elements.pre?.lineHeight   || 14;
  elementHeights.codePaddingV   = (elements.pre?.paddingTop || 5) + (elements.pre?.paddingBottom || 5);
  // tableRow includes cell padding + border (~7 px overhead per row).
  // Also compensates for table marginBottom (20) vs paragraphMargin (7).
  elementHeights.tableRow       = (elements.table?.lineHeight || 22) + 10;
  elementHeights.tableHeader    = elements.table?.lineHeight || 22;
  elementHeights.blockquoteLine = elements.blockquote?.lineHeight || 20;
  elementHeights.listItem       = totalH(elements.li || {}) || 22;
  elementHeights.paragraphMargin= elements.p?.marginBottom  || 7;
  elementHeights.formulaAvg     = elements['.katex-display']?.lineHeight || 90;
  elementHeights.formulaInline  = 26;
  // h4–h6 and hr
  elementHeights.h4             = totalH(elements.h4 || elements.h3 || {}) || 29;
  elementHeights.h5             = totalH(elements.h5 || elements.h4 || elements.h3 || {}) || 27;
  elementHeights.h6             = totalH(elements.h6 || elements.h5 || elements.h4 || elements.h3 || {}) || 25;
  elementHeights.hr             = totalH(elements.hr || {}) || 50;

  const config = {
    contentHeight: pageConfig.contentHeight,
    contentWidth:  pageConfig.contentWidth,
    elementHeights,
  };

  return paginateArticle(html, config);
}

// ── Puppeteer paginator (real browser measurement) ─────────────

/**
 * Browser‑based paginator.  Opens headless Chromium, renders the
 * HTML with the exact .book-content CSS, then measures real
 * element heights via getBoundingClientRect().  No estimation.
 *
 * Caches one browser instance across calls for performance.
 */
export async function puppeteerPaginator(html, pageConfig) {
  if (!html) return [''];

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const contentWidth = pageConfig.contentWidth || 380;
    const availableHeight = pageConfig.contentHeight; // total px for .book-content
    const fontSize = pageConfig.baseFontSize || 13;

    // Build CSS once
    const css = `
      body { margin:0; padding:0; }
      .book-content {
        width:${contentWidth}px;
        font-family:Georgia,"Times New Roman",serif;
        font-size:${fontSize}px;
        line-height:1.7;
        color:#3a3a3a;
      }
      .book-content h1 { font-size:17px; font-weight:700; margin:0 0 8px; line-height:1.25; color:#222; }
      .book-content h2 { font-size:14px; font-weight:600; margin:14px 0 6px; color:#333; }
      .book-content h3 { font-size:13px; font-weight:600; margin:10px 0 4px; color:#444; }
      .book-content p  { margin:0 0 7px; text-indent:1em; }
      .book-content p:first-of-type { text-indent:0; }
      .book-content pre { font-size:10px; line-height:1.4; background:#f5f2eb; padding:5px 7px; margin:7px 0; border-radius:3px; white-space:pre-wrap; overflow-x:auto; }
      .book-content code { font-size:10px; background:#f5f2eb; padding:1px 3px; border-radius:2px; }
      .book-content pre code { background:transparent; padding:0; }
      .book-content blockquote { margin:7px 0; padding:3px 7px 3px 9px; border-left:2px solid #c9b99a; color:#666; font-size:12px; font-style:italic; }
      .book-content ul,.book-content ol { padding-left:16px; margin:0 0 7px; }
      .book-content li { margin-bottom:1px; }
      .book-content table { width:100%; font-size:10px; border-collapse:collapse; margin:7px 0; }
      .book-content th,.book-content td { padding:3px 5px; border-bottom:1px solid #ddd; text-align:left; }
      .book-content img { max-width:100%; margin:7px auto; display:block; }
      .book-content .katex-display { margin:7px 0; }
    `;

    // Measure the ACTUAL first‑page header height using a dummy title
    // so long titles that wrap don't cause overflow.
    const headerHTML = pageConfig.headerHTML || '<h1>T</h1><p style="color:#999;font-size:11px;margin-bottom:18px">2026</p>';
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body><div class="book-content" id="content">${headerHTML}<div id="measure-end" style="height:0"></div></div></body></html>`);
    const headerH = await page.evaluate(() => {
      const el = document.getElementById('measure-end');
      return el.getBoundingClientRect().top;
    });

    // The body content can use the remaining height on the first page
    const bodyMaxH = Math.max(100, availableHeight - headerH);

    // Now render the body HTML for pagination
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body><div class="book-content" id="content">${html}</div></body></html>`);

    // Use the browser's own layout engine to detect overflow.
    // We give the container a fixed height + overflow:hidden,
    // then walk children bottom-to-top to find which ones fit.
    const result = await page.evaluate((maxH) => {
      const container = document.getElementById('content');
      container.style.height = maxH + 'px';
      container.style.overflow = 'hidden';

      function overflowed(el) {
        const contRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        // Element overflows if its bottom edge is below the container
        return elRect.bottom > contRect.bottom + 0.5;
      }

      // Space remaining before the container bottom
      function remainingSpace(el) {
        return container.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
      }

      function splitPre(el) {
        const remaining = remainingSpace(el);
        const style = getComputedStyle(el);
        const padTop = parseFloat(style.paddingTop) || 5;
        const padBot = parseFloat(style.paddingBottom) || 5;
        const padV = padTop + padBot;
        if (remaining < padV + 10) return null;
        // Use inner <code> or the pre itself for line measurement
        const code = el.querySelector('code') || el;
        const lines = code.textContent.split('\n');
        // Real text‑line height (excluding padding, which is separate)
        const textLineH = (el.getBoundingClientRect().height - padV) / Math.max(1, lines.length);
        const linesThatFit = Math.max(1, Math.floor((remaining - padV) / textLineH));
        if (linesThatFit >= lines.length) return null;
        const outer = el.outerHTML;
        const openTag = outer.match(/^<pre[^>]*>/i)[0];
        // Preserve inner <code> if present
        const innerOpen = code !== el ? code.outerHTML.match(/^<code[^>]*>/i)[0] : '';
        const innerClose = code !== el ? '</code>' : '';
        return [
          openTag + innerOpen + lines.slice(0, linesThatFit).join('\n') + innerClose + '</pre>',
          openTag + innerOpen + lines.slice(linesThatFit).join('\n') + innerClose + '</pre>',
        ];
      }

      function splitTable(el) {
        const remaining = remainingSpace(el);
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length < 2) return null;
        const rowH = rows[0].getBoundingClientRect().height || 22;
        const rowsThatFit = Math.max(1, Math.floor((remaining - 10) / rowH));
        if (rowsThatFit >= rows.length) return null;
        const thead = el.querySelector('thead');
        const theadHTML = thead ? thead.outerHTML : '';
        const firstRows = rows.slice(0, rowsThatFit).map(r => r.outerHTML).join('');
        const restRows = rows.slice(rowsThatFit).map(r => r.outerHTML).join('');
        return [
          '<table>' + theadHTML + '<tbody>' + firstRows + '</tbody></table>',
          '<table><tbody>' + restRows + '</tbody></table>',
        ];
      }

      function splitParagraph(el) {
        const remaining = remainingSpace(el);
        const text = el.textContent;
        const sentences = text.split(/(?<=[。！？.!?\n])\s*/);
        if (sentences.length <= 1) return null;
        const openTag = el.outerHTML.match(/^<p[^>]*>/i)[0];
        // Build up sentences until we exceed the remaining space
        const probe = document.createElement('p');
        container.appendChild(probe);
        let splitIdx = 0, acc = '';
        for (let i = 0; i < sentences.length; i++) {
          probe.textContent = acc + sentences[i];
          if (probe.getBoundingClientRect().height > remaining && i > 0) {
            splitIdx = i; break;
          }
          acc += sentences[i];
        }
        container.removeChild(probe);
        if (splitIdx === 0) return null;
        return [
          openTag + sentences.slice(0, splitIdx).join('') + '</p>',
          openTag + sentences.slice(splitIdx).join('') + '</p>',
        ];
      }

      // Element‑by‑element fill.  Each element's bottom edge is
      // checked against the container — no cumulative error from
      // manual height accumulation or scrollHeight quirks.
      const pages = [];
      const allChildren = Array.from(container.children);
      container.innerHTML = '';
      container.style.height = maxH + 'px';
      container.style.overflow = 'hidden';

      let idx = 0;
      while (idx < allChildren.length) {
        const el = allChildren[idx];
        container.appendChild(el);

        const elBottom = el.getBoundingClientRect().bottom;
        const contBottom = container.getBoundingClientRect().bottom;

        if (elBottom > contBottom + 0.5) {
          // Overflow — remove, save page, split
          container.removeChild(el);
          const pageHTML = Array.from(container.children).map(c => c.outerHTML).join('\n');
          if (pageHTML.trim()) pages.push(pageHTML);
          container.innerHTML = '';

          const tag = el.tagName.toLowerCase();
          let parts = null;
          if (tag === 'pre') parts = splitPre(el);
          else if (tag === 'table') parts = splitTable(el);
          else if (tag === 'p' && el.textContent.length > 100) parts = splitParagraph(el);

          const h = document.createElement('div');
          if (parts) {
            h.innerHTML = (parts[0]||'') + '\n' + (parts[1]||'');
          } else {
            // Can't split — try on next page as‑is
            h.appendChild(el.cloneNode(true));
          }
          const newKids = Array.from(h.children);
          allChildren.splice(idx, 1, ...newKids);
          // idx unchanged: re‑try the (now split/moved) element
          if (pages.length > 200) break;
        } else {
          idx++;
        }
      }

      // Last page
      const lastHTML = Array.from(container.children).map(c => c.outerHTML).join('\n');
      if (lastHTML.trim()) pages.push(lastHTML);

      return pages.length > 0 ? pages : [''];

    }, bodyMaxH);

    return result;
  } finally {
    await page.close();
  }
}
