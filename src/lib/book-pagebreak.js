/**
 * book-pagebreak.js — Line‑based page breaking.
 *
 * Three‑step algorithm:
 *   1. measureLayout()   — Puppeteer renders HTML, detects every line's
 *                          position (text offset + exact pixel height).
 *   2. paginate()        — Pure JS: accumulate line heights, mark page
 *                          breaks at maxH.
 *   3. buildPageHTML()   — Extract text ranges from the ORIGINAL HTML
 *                          (never split an element).  Preserves inline
 *                          formatting and element rendering context.
 *
 * Exports:
 *   breakIntoPages(html, pageConfig) → Promise<string[]>
 */

import puppeteer from 'puppeteer';

// ── browser singleton ──────────────────────────────────────────

let _browser = null;
async function getBrowser() {
  if (!_browser) {
    _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  return _browser;
}

// ── CSS ────────────────────────────────────────────────────────

const CSS = (w, fs) => `
  body { margin:0; padding:0; }
  #m { width:${w}px; font-family:Georgia,"Times New Roman",serif; font-size:${fs}px; line-height:1.7; color:#3a3a3a; }
  #m h1 { font-size:17px; font-weight:700; margin:0 0 8px; line-height:1.25; color:#222; }
  #m h2 { font-size:14px; font-weight:600; margin:14px 0 6px; color:#333; }
  #m h3 { font-size:13px; font-weight:600; margin:10px 0 4px; color:#444; }
  #m p  { margin:0 0 7px; text-indent:1em; }
  #m p:first-of-type { text-indent:0; }
  #m pre { font-size:10px; line-height:1.4; background:#f5f2eb; padding:5px 7px; margin:7px 0; border-radius:3px; white-space:pre-wrap; overflow-x:auto; }
  #m code { font-size:10px; background:#f5f2eb; padding:1px 3px; border-radius:2px; }
  #m pre code { background:transparent; padding:0; }
  #m blockquote { margin:7px 0; padding:3px 7px 3px 9px; border-left:2px solid #c9b99a; color:#666; font-size:12px; font-style:italic; }
  #m ul,#m ol { padding-left:16px; margin:0 0 7px; }
  #m li { margin-bottom:1px; }
  #m table { width:100%; font-size:10px; border-collapse:collapse; margin:7px 0; }
  #m th,#m td { padding:3px 5px; border-bottom:1px solid #ddd; text-align:left; }
  #m img { max-width:100%; margin:7px auto; display:block; }
  #m .katex-display { margin:7px 0; }
`;

// ── Step 1: measureLayout() ────────────────────────────────────

async function measureLayout(html, pageConfig, page) {
  const cw = pageConfig.contentWidth || 380;
  const fs = pageConfig.baseFontSize || 13;
  await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS(cw, fs)}</style></head>
<body><div id="m">${html}</div></body></html>`);

  return page.evaluate(() => {
    const container = document.getElementById('m');
    const elements = [];
    const lines = [];

    // ── element descriptors ─────────────────────────────────

    for (const el of container.children) {
      const tag = el.tagName.toLowerCase();
      const rect = el.getBoundingClientRect();
      const isAtomic = tag === 'img' || tag === 'hr' || el.classList.contains('katex-display');
      const isTable = tag === 'table';
      const isPre = tag === 'pre';

      elements.push({
        tag,
        rawHTML: el.outerHTML,
        plainText: el.textContent || '',
        totalH: rect.height + (parseFloat(getComputedStyle(el).marginBottom) || 0),
        useDirectHTML: isAtomic,
      });
    }

    // ── line detection ─────────────────────────────────────

    let prevBottom = container.getBoundingClientRect().top;

    for (let elIdx = 0; elIdx < container.children.length; elIdx++) {
      const el = container.children[elIdx];
      const tag = el.tagName.toLowerCase();
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const mrgBot = parseFloat(style.marginBottom) || 0;

      // gap from previous element (collapsed margin)
      const gap = elIdx === 0 ? 0 : Math.max(0, rect.top - prevBottom);

      if (tag === 'pre') {
        const code = el.querySelector('code') || el;
        const codeLines = code.textContent.split('\n');
        const padV = 10;
        const textH = Math.max(1, rect.height - padV);
        const lineH = textH / Math.max(1, codeLines.length);
        const plainText = el.textContent;
        let searchFrom = 0;
        for (let i = 0; i < codeLines.length; i++) {
          const lineText = codeLines[i];
          // Search from where the previous line ended (+1 for \n)
          // so duplicate lines each get their own position.
          const start = plainText.indexOf(lineText, searchFrom);
          const end = start >= 0 ? start + lineText.length : searchFrom;
          searchFrom = end + 1;
          lines.push({
            elIdx,
            textStart: start >= 0 ? start : 0,
            textEnd: end > 0 ? end : 0,
            h: (i === 0 ? padV / 3 : 0) + lineH + (i === codeLines.length - 1 ? padV / 3 + mrgBot : 0),
            gap: i === 0 ? gap : 0,
          });
        }
        prevBottom = el.getBoundingClientRect().bottom;
        continue;
      }

      if (tag === 'table') {
        const rows = Array.from(el.querySelectorAll('tr'));
        for (let i = 0; i < rows.length; i++) {
          lines.push({
            elIdx,
            textStart: i,
            textEnd: i + 1,
            h: rows[i].getBoundingClientRect().height + (i === rows.length - 1 ? mrgBot : 0),
            gap: i === 0 ? gap : 0,
          });
        }
        prevBottom = el.getBoundingClientRect().bottom;
        continue;
      }

      if (tag === 'img' || tag === 'hr' || el.classList.contains('katex-display')) {
        lines.push({
          elIdx,
          textStart: 0,
          textEnd: 1,
          h: rect.height + mrgBot,
          gap,
        });
        prevBottom = el.getBoundingClientRect().bottom;
        continue;
      }

      // ── text elements (p, h1-h6, blockquote, li) ─────────

      const text = el.textContent || '';
      if (!text.trim()) {
        lines.push({ elIdx, textStart: 0, textEnd: 0, h: rect.height + mrgBot, gap });
        prevBottom = el.getBoundingClientRect().bottom;
        continue;
      }

      const lineH = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.7);
      const estimatedLines = Math.max(1, Math.round(rect.height / lineH));
      const elLeft = rect.left;
      const elTop = rect.top;

      let prevOff = 0;
      let prevY = elTop;

      for (let i = 1; i <= estimatedLines; i++) {
        const probeY = elTop + i * lineH - lineH / 2;
        const pos = document.caretPositionFromPoint(elLeft + 5, probeY);
        let off = pos ? pos.offset : 0;

        if (off <= prevOff && i < estimatedLines) {
          off = Math.min(text.length, Math.floor(text.length * i / estimatedLines));
        }
        if (off <= prevOff) continue;

        const segH = (i === estimatedLines)
          ? (rect.top + rect.height - prevY) + mrgBot
          : lineH;

        if (off > prevOff) {
          lines.push({
            elIdx,
            textStart: prevOff,
            textEnd: off,
            h: segH,
            gap: i === 1 ? gap : 0,
          });
        }
        prevOff = off;
        prevY = probeY;
      }

      // Safety: catch any remaining text
      if (prevOff < text.length) {
        lines.push({
          elIdx,
          textStart: prevOff,
          textEnd: text.length,
          h: Math.max(lineH, rect.height - (prevOff / text.length) * rect.height + mrgBot),
          gap: 0,
        });
      }

      prevBottom = el.getBoundingClientRect().bottom;
    }

    return { elements, lines };
  });
}

// ── Step 2: paginate() ─────────────────────────────────────────

function paginate(lines, maxH) {
  const pages = [];
  let curStart = 0;
  let curH = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineH = line.h + line.gap;

    if (curH + lineH > maxH + 0.5 && curStart < i) {
      // Save current page
      pages.push({ start: curStart, end: i });
      curStart = i;
      curH = lineH;
    } else {
      curH += lineH;
    }
    // Oversized single line: force onto own page
    if (curStart === i && lineH > maxH) {
      pages.push({ start: curStart, end: i + 1 });
      curStart = i + 1;
      curH = 0;
    }
  }

  if (curStart < lines.length) {
    pages.push({ start: curStart, end: lines.length });
  }

  return pages;
}

// ── Step 3: buildPageHTML() ────────────────────────────────────

function buildPageHTML(layout, pages) {
  const { elements, lines } = layout;

  // text offset → HTML offset
  function textOffToHTML(el, start, end) {
    if (start >= end) return '';
    const raw = el.rawHTML;
    let htmlStart = 0, htmlEnd = raw.length;
    let vis = 0;
    let inTag = false;

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '<') inTag = true;
      else if (ch === '>') inTag = false;
      else if (!inTag) {
        if (vis === start) htmlStart = i;
        vis++;
        if (vis >= end) { htmlEnd = i + 1; break; }
      }
    }
    return raw.substring(htmlStart, htmlEnd);
  }

  // wrap text fragment in original element tag
  function wrap(el, html, extraClass) {
    const openMatch = el.rawHTML.match(new RegExp('^<' + el.tag + '[^>]*>', 'i'));
    let openTag = openMatch ? openMatch[0] : '<' + el.tag + '>';
    if (extraClass) {
      if (openTag.includes('class="')) {
        openTag = openTag.replace(/class="([^"]*)"/, 'class="$1 ' + extraClass + '"');
      } else {
        openTag = openTag.replace('>', ' class="' + extraClass + '">');
      }
    }
    return openTag + html + '</' + el.tag + '>';
  }

  return pages.map(({ start, end }) => {
    const parts = [];

    let i = start;
    while (i < end) {
      const el = elements[lines[i].elIdx];
      const isFirstGroup = (i === start);

      if (el.tag === 'table') {
        // Each line is one <tr> — reconstruct table
        const rowHTMLs = [];
        let j = i;
        while (j < end && lines[j].elIdx === lines[i].elIdx) {
          // lines[j].textStart is the row index
          const rowIdx = lines[j].textStart;
          const rows = el.rawHTML.match(/<tr[>\s][\s\S]*?<\/tr>/gi) || [];
          if (rowIdx < rows.length) rowHTMLs.push(rows[rowIdx]);
          j++;
        }
        const thead = (el.rawHTML.match(/<thead[\s\S]*?<\/thead>/i) || [''])[0];
        parts.push('<table>' + thead + '<tbody>' + rowHTMLs.join('') + '</tbody></table>');
        i = j;
        continue;
      }

      if (el.useDirectHTML || el.tag === 'img' || el.tag === 'hr') {
        parts.push(el.rawHTML);
        i++;
        continue;
      }

      // Group consecutive lines from same element
      let j = i;
      while (j < end && lines[j].elIdx === lines[i].elIdx) j++;

      const textStart = lines[i].textStart;
      const textEnd = lines[j - 1].textEnd;
      const fragment = textOffToHTML(el, textStart, textEnd);

      if (el.tag === 'pre') {
        // Preserve inner <code> wrapper if it exists
        const codeOpen = el.rawHTML.match(/<code[^>]*>/i);
        const codeClose = codeOpen ? '</code>' : '';
        const preOpen = el.rawHTML.match(/^<pre[^>]*>/i)[0];
        parts.push(preOpen + (codeOpen ? codeOpen[0] : '') + fragment + codeClose + '</pre>');
      } else {
        const extraClass = isFirstGroup ? null : 'no-indent';
        parts.push(wrap(el, fragment, extraClass));
      }

      i = j;
    }

    return parts.join('\n');
  });
}

// ── public API ─────────────────────────────────────────────────

/**
 * @param {string} html         Rendered body HTML (no headers).
 * @param {object} pageConfig   { contentWidth, baseFontSize, contentHeight }
 * @returns {Promise<string[]>} Page chunks.
 */
export async function breakIntoPages(html, pageConfig) {
  if (!html) return [''];

  const maxH = pageConfig.contentHeight;
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const layout = await measureLayout(html, pageConfig, page);
    const pages = paginate(layout.lines, maxH);
    const chunks = buildPageHTML(layout, pages);
    return chunks.length > 0 ? chunks : [''];
  } finally {
    await page.close();
  }
}
