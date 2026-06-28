/**
 * paginate.js — server-side page layout engine
 *
 * Takes rendered HTML and pagination config, returns page chunks.
 * Each chunk's total estimated height fits within the content area.
 *
 * Rules:
 *   - Each article starts on a fresh page
 *   - Splittable: PRE (by \n), TABLE (by <tr>), long P/BLOCKQUOTE (by line)
 *   - Unsplittable: H1-H6, HR, .katex-display, IMG, short P/BLOCKQUOTE
 *   - Orphan protection: split parts respect orphanLines threshold
 *   - Tail page whitespace is acceptable (last page of each article)
 */

import { JSDOM } from 'jsdom';
import texLinebreak from 'tex-linebreak';
const { layoutItemsFromString, breakLines } = texLinebreak;

// ── line‑counting via Knuth‑Plass ─────────────────────────────

const LINE_WIDTH = 380;   // .book-content width in px
const FONT_SIZE = 13;     // .book-content font‑size

function charWidth(ch) {
  const code = ch.codePointAt(0);
  // CJK: slightly wider than 1em for safety (~1.15)
  if ((code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0x3000 && code <= 0x303F) ||
      (code >= 0xFF00 && code <= 0xFFEF) ||
      code >= 0x20000) return FONT_SIZE * 1.12;
  // Latin / digits / symbols: ~0.6em average
  return FONT_SIZE * 0.62;
}

function wordWidth(word) {
  let w = 0;
  for (const ch of word) w += charWidth(ch);
  return w;
}

/** Returns the number of lines a plain‑text string will occupy. */
function countLines(text) {
  if (!text || !text.trim()) return 1;
  try {
    const items = layoutItemsFromString(text, wordWidth);
    const breaks = breakLines(items, LINE_WIDTH, { maxAdjustmentRatio: 2 });
    return Math.max(1, breaks.length - 1);
  } catch {
    // Fallback if Knuth‑Plass fails (very short / single‑word text)
    let w = 0;
    for (const ch of text) w += charWidth(ch);
    return Math.max(1, Math.ceil(w / LINE_WIDTH));
  }
}

export function paginateArticle(html, config) {
  const C = config;
  const EH = C.elementHeights;
  const MAX_H = C.contentHeight;

  // Parse HTML into element objects
  const elements = parseElements(html);

  // Layout into pages
  const pages = [];
  let currentPage = [];
  let currentH = 0;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const h = estimateHeight(el, EH);

    if (currentH + h <= MAX_H) {
      // Fits on current page
      currentPage.push(el);
      currentH += h;
    } else if (el.splittable) {
      // Try to split at line boundary
      const remaining = MAX_H - currentH;
      const split = splitElement(el, remaining, EH);
      if (split) {
        // Orphan protection: if remaining part is too small, don't split
        if (split.second.lineCount < (el.orphanLines || 0)) {
          pages.push(renderPage(currentPage));
          currentPage = [el];
          currentH = h;
        } else {
          // First part stays on current page
          currentPage.push(split.first);
          currentH += split.firstHeight;
          pages.push(renderPage(currentPage));
          // Second part starts new page
          currentPage = [split.second];
          currentH = split.secondHeight;
        }
      } else {
        // Can't split — move to new page
        pages.push(renderPage(currentPage));
        currentPage = [el];
        currentH = h;
      }
    } else {
      // Unsplittable, move to new page
      if (currentPage.length > 0) {
        pages.push(renderPage(currentPage));
      }
      currentPage = [el];
      currentH = h;

      // If this single element is taller than a page, force it on
      if (h > MAX_H) {
        pages.push(renderPage(currentPage));
        currentPage = [];
        currentH = 0;
      }
    }
  }

  // Last page
  if (currentPage.length > 0) {
    pages.push(renderPage(currentPage));
  }

  return pages;
}

// ── HTML → element objects ──────────────────────────────────

function parseElements(html) {
  // Use JSDOM for reliable HTML parsing (handles nested tags properly)
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`);
  const body = dom.window.document.body;
  const elements = [];

  // Only iterate direct children — don't recurse into nested elements
  for (const child of body.children) {
    const tag = child.tagName.toLowerCase();
    const innerHTML = child.innerHTML;
    const outerHTML = child.outerHTML;

    // Detect KaTeX display formulas
    const isKatex = child.classList.contains('katex-display');
    const isFormula = isKatex;

    // Splittable: PRE, TABLE, long P, long BLOCKQUOTE
    const textLen = child.textContent.replace(/\s/g, '').length;
    const splittable = tag === 'pre' || tag === 'table' ||
      ((tag === 'p' || tag === 'blockquote') && textLen > 150);

    // Count lines
    let lineCount = 1;
    if (tag === 'pre') lineCount = (innerHTML.match(/\n/g) || []).length + 1;
    else if (tag === 'table') lineCount = child.querySelectorAll('tbody > tr').length;
    else if (tag === 'p') lineCount = countLines(child.textContent);
    else if (tag === 'blockquote') {
      // Blockquote may contain nested <p> tags, each with its own
      // margin.  Count the paragraphs and add extra spacing.
      const pChildren = child.querySelectorAll('p').length || 1;
      const baseLines = countLines(child.textContent);
      // Each extra <p> adds ~1 line of inter‑paragraph spacing
      lineCount = baseLines + (pChildren - 1);
    }
    else if (tag === 'ul' || tag === 'ol') lineCount = child.querySelectorAll('li').length;
    else if (tag === 'img') lineCount = 0;
    else if (/^h[1-6]$/.test(tag)) lineCount = 1;
    else if (tag === 'hr') lineCount = 0;
    else if (isKatex) {
      // Estimate lines from formula complexity
      const depth = (innerHTML.match(/<span/g) || []).length;
      lineCount = Math.max(1, Math.ceil(depth / 40));
    }

    // Minimum lines to keep when splitting (orphan protection)
    let orphanLines = 0;
    if (tag === 'p') orphanLines = 2;
    else if (tag === 'pre') orphanLines = 1;
    else if (tag === 'table') orphanLines = 1;
    else if (tag === 'blockquote') orphanLines = 1;

    const el = { tag, html: outerHTML, innerHTML, isKatex, isFormula,
                 splittable, lineCount, orphanLines };

    // Flatten containers whose children have independent spacing.
    // A monolithic element would be height‑estimated as flat text
    // and miss the inter‑child margins the browser actually renders.
    if (tag === 'ul' || tag === 'ol') {
      for (const li of child.querySelectorAll(':scope > li')) {
        const liTextLen = li.textContent.replace(/\s/g, '').length;
        elements.push({
          tag: 'li',
          html: li.outerHTML,
          innerHTML: li.innerHTML,
          isKatex: false, isFormula: false,
          splittable: false,
          lineCount: countLines(li.textContent),
          orphanLines: 0,
        });
      }
    } else {
      elements.push(el);
    }
  }

  return elements;
}

// ── Height estimation ───────────────────────────────────────

function estimateHeight(el, EH) {
  switch (el.tag) {
    case 'h1': return EH.h1 || 42;
    case 'h2': return EH.h2 || 36;
    case 'h3': return EH.h3 || 30;
    case 'h4': return EH.h4 || EH.h3 || 26;
    case 'h5': return EH.h5 || EH.h4 || EH.h3 || 24;
    case 'h6': return EH.h6 || EH.h5 || EH.h4 || EH.h3 || 22;
    case 'hr': return EH.hr || 30;
    case 'pre':
      return EH.codePaddingV + el.lineCount * EH.codeLine + EH.paragraphMargin;
    case 'table':
      const hasHeader = el.innerHTML.includes('<th');
      const bodyRows = hasHeader ? Math.max(0, el.lineCount - 1) : el.lineCount;
      return (hasHeader ? EH.tableHeader : 0) + bodyRows * EH.tableRow + EH.paragraphMargin;
    case 'blockquote':
      // padding: 3px top + 3px bottom (matches .book-content blockquote CSS)
      return el.lineCount * EH.blockquoteLine + 6 + EH.paragraphMargin;
    case 'li':
      return EH.listItem;
    case 'img':
      return 200; // default, actual size unknown server-side
    case 'p':
      if (el.lineCount <= 1) return EH.pLine + EH.paragraphMargin;
      return el.lineCount * EH.pLine + EH.paragraphMargin;
    case 'span':
      if (el.isFormula) return EH.formulaAvg;
      return EH.formulaInline;
    case 'ul':
    case 'ol':
      return el.lineCount * EH.listItem + EH.paragraphMargin;
    default:
      return el.lineCount * EH.pLine + EH.paragraphMargin;
  }
}

// ── Element splitting ───────────────────────────────────────

function splitElement(el, remaining, EH) {
  const lineH = getLineHeight(el, EH);

  if (el.tag === 'pre') {
    return splitByLines(el, remaining, lineH);
  }
  if (el.tag === 'table') {
    return splitByRows(el, remaining, EH);
  }
  if ((el.tag === 'p' || el.tag === 'blockquote') && el.splittable) {
    return splitByLines(el, remaining, lineH);
  }

  return null;
}

function getLineHeight(el, EH) {
  if (el.tag === 'pre') return EH.codeLine;
  if (el.tag === 'table') return EH.tableRow;
  if (el.tag === 'blockquote') return EH.blockquoteLine || EH.pLine;
  return EH.pLine;
}

function splitByLines(el, remaining, lineH) {
  // For PRE: split by actual newlines
  if (el.tag === 'pre') {
    const pad = 60; // padding+border+margin for PRE
    const linesThatFit = Math.max(1, Math.floor((remaining - pad) / lineH));
    if (linesThatFit >= el.lineCount) return null;

    const lines = el.innerHTML.split('\n');
    const firstLines = lines.slice(0, linesThatFit).join('\n');
    const restLines = lines.slice(linesThatFit).join('\n');
    const openTag = el.html.match(/^<[^>]+>/)[0];
    const closeTag = el.html.match(/<\/[^>]+>$/)[0];

    return {
      first: { ...el, html: openTag + firstLines + closeTag, innerHTML: firstLines, lineCount: linesThatFit },
      firstHeight: pad + linesThatFit * lineH,
      second: { ...el, html: openTag + restLines + closeTag, innerHTML: restLines, lineCount: el.lineCount - linesThatFit },
      secondHeight: pad + (el.lineCount - linesThatFit) * lineH,
    };
  }

  // For P / long text: split by estimated character count
  // Use 85% of remaining to leave safety margin against overflow
  const pad = 20; // paragraph margin
  const linesThatFit = Math.max(1, Math.floor((remaining - pad) * 0.85 / lineH));
  const charsThatFit = linesThatFit * 23; // charsPerLine

  if (charsThatFit >= el.innerHTML.length) return null;

  // Strip HTML tags for text splitting, then re-wrap
  const plainText = el.innerHTML.replace(/<[^>]+>/g, '');
  const restText = plainText.substring(charsThatFit);

  // Preserve inline HTML by splitting the innerHTML at a character boundary
  // Simple approach: split the innerHTML proportionally
  const ratio = charsThatFit / Math.max(1, plainText.length);
  const splitPoint = Math.floor(el.innerHTML.length * ratio);

  // Find a good split point (space or tag boundary)
  let actualSplit = splitPoint;
  for (let s = splitPoint; s < el.innerHTML.length; s++) {
    if (el.innerHTML[s] === '>' || el.innerHTML[s] === ' ') { actualSplit = s + 1; break; }
  }

  const firstHTML = el.innerHTML.substring(0, actualSplit);
  const restHTML = el.innerHTML.substring(actualSplit);

  const openTag = el.html.match(/^<[^>]+>/)[0];
  const closeTag = el.html.match(/<\/[^>]+>$/)[0];

  return {
    first: { ...el, html: openTag + firstHTML + closeTag, innerHTML: firstHTML, lineCount: linesThatFit },
    firstHeight: pad + linesThatFit * lineH,
    second: { ...el, html: openTag + restHTML + closeTag, innerHTML: restHTML, lineCount: countLines(restText) },
    secondHeight: pad + countLines(restText) * lineH,
  };
}

function splitByRows(el, remaining, EH) {
  const hasThead = el.innerHTML.includes('<thead>');
  const theadHTML = hasThead ? (el.innerHTML.match(/<thead>[\s\S]*?<\/thead>/i) || [''])[0] : '';
  const headerH = hasThead ? EH.tableHeader : 0;
  const rowH = EH.tableRow;
  // Only count / split <tbody> rows — <thead> rows are handled separately
  const tbodyMatch = el.innerHTML.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  const tbodyContent = tbodyMatch ? tbodyMatch[1] : el.innerHTML;
  const rows = tbodyContent.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
  const tbodyRowCount = rows.length;

  const rowsThatFit = Math.max(1, Math.floor((remaining - headerH) / rowH));
  if (rowsThatFit >= tbodyRowCount) return null;

  const firstRows = rows.slice(0, rowsThatFit).join('');
  const restRows = rows.slice(rowsThatFit).join('');

  return {
    first: {
      ...el,
      html: `<table>${theadHTML}<tbody>${firstRows}</tbody></table>`,
      lineCount: rowsThatFit + (hasThead ? 1 : 0),
    },
    firstHeight: headerH + rowsThatFit * rowH,
    second: {
      ...el,
      html: `<table><tbody>${restRows}</tbody></table>`,
      lineCount: rows.length - rowsThatFit,
    },
    secondHeight: (rows.length - rowsThatFit) * rowH,
  };
}

// ── Render page: array of elements → HTML string ───────────

function renderPage(elements) {
  return elements.map(el => el.html).join('');
}
