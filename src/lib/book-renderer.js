/**
 * book-renderer.js — Content pipeline (Layer 1).
 *
 * Pure functions. No Astro dependency. No side effects.
 * Knows about Markdown and KaTeX. Does NOT know about page dimensions,
 * pagination, Turn.js, or book structure.
 *
 * Exports:
 *   renderMarkdown(md)          → HTML string
 *   stripLeadingTitle(md, title)→ Markdown with leading # heading removed
 *   romanTocPage(page)          → lowercase Roman numeral string
 */

import { marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';
import { imageSize } from 'image-size';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Syntax highlighting via marked renderer — avoids marked-highlight's
// HTML-escaping issue in marked v18.
marked.use({
  renderer: {
    code(token) {
      if (token.lang && hljs.getLanguage(token.lang)) {
        try {
          var h = hljs.highlight(token.text, { language: token.lang }).value;
          return '<pre><code class="hljs language-' + token.lang + '">' + h + '</code></pre>';
        } catch (_) {}
      }
      return '<pre><code' + (token.lang ? ' class="language-' + token.lang + '"' : '') + '>' +
        token.text + '</code></pre>';
    }
  }
});

// ── Markdown → HTML ───────────────────────────────────────────

/**
 * Convert Markdown body to HTML.
 * Handles KaTeX formulas (both inline $...$ and display $$...$$)
 * before passing through marked.
 */
export function renderMarkdown(md) {
  if (!md) return '';

  let html = md;
  const katexBlocks = [];

  // Extract display math $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      katexBlocks.push(
        katex.renderToString(tex.trim(), {
          displayMode: true,
          throwOnError: false,
        })
      );
    } catch {
      katexBlocks.push('<pre>KaTeX error</pre>');
    }
    return `\uE000KATEX_${katexBlocks.length - 1}__ENDKATEX\uE000`;
  });

  // Extract inline math $...$
  html = html.replace(/\$(.+?)\$/g, (_, tex) => {
    try {
      katexBlocks.push(
        katex.renderToString(tex.trim(), {
          displayMode: false,
          throwOnError: false,
        })
      );
    } catch {
      katexBlocks.push(`<code>${tex}</code>`);
    }
    return `\uE000KATEX_${katexBlocks.length - 1}__ENDKATEX\uE000`;
  });

  // Convert remaining Markdown to HTML
  html = marked.parse(html);

  // Restore KaTeX placeholders
  html = html.replace(/\uE000KATEX_(\d+)__ENDKATEX\uE000/g, (_, i) => katexBlocks[parseInt(i)]);

  // Inject real width/height into <img> so the browser reserves
  // correct space even before the image loads.
  html = injectImageDimensions(html);

  // CJK-Latin auto-spacing — add thin space (U+2006, ⅙ em) between
  // Chinese characters and adjacent Latin words / numbers.
  // Protected blocks (<code>, <pre>, <script>, <style>) are skipped.
  html = addCJKLatinSpacing(html);

  return html;
}

/**
 * Add ⅙-em spacing between CJK and ANS characters.
 * Code/pre/script/style blocks are left untouched.
 */
function addCJKLatinSpacing(html) {
  const CJK = '\u4e00-\u9fff\u3400-\u4dbf\u2e80-\u2eff\uf900-\ufaff\u3000-\u303f\uff00-\uffef';
  const protectedBlocks = [];

  // Protect code/pre blocks
  html = html.replace(/(<(code|pre|script|style)\b[^>]*>[\s\S]*?<\/\2>)/gi, (m) => {
    protectedBlocks.push(m);
    return `\uE001PROT_${protectedBlocks.length - 1}_PROT\uE001`;
  });

  // CJK → ANS word
  html = html.replace(
    new RegExp(`([${CJK}])([A-Za-z0-9]+(?:\\s+[A-Za-z0-9]+)*)`, 'g'),
    '$1\u2006$2'
  );
  // ANS word → CJK
  html = html.replace(
    new RegExp(`([A-Za-z0-9]+(?:\\s+[A-Za-z0-9]+)*)([${CJK}])`, 'g'),
    '$1\u2006$2'
  );

  // Restore protected blocks
  html = html.replace(/\uE001PROT_(\d+)_PROT\uE001/g, (_, i) => protectedBlocks[parseInt(i)]);

  return html;
}

/** Read a local image and inject width/height into its <img> tag. */
function injectImageDimensions(html) {
  return html.replace(/<img\s[^>]*src="([^"]+)"[^>]*>/gi, (match, src) => {
    // Only handle local images (absolute paths starting with /)
    if (!src.startsWith('/')) return match;
    const filePath = resolve('public', src.slice(1));
    if (!existsSync(filePath)) return match;
    try {
      const dims = imageSize(readFileSync(filePath));
      if (dims.width && dims.height) {
        // Max-width 380px in book-content; scale height proportionally
        const cw = 380;
        const w = Math.min(dims.width, cw);
        const h = Math.round(dims.height * (w / dims.width));
        if (!match.includes('width=') && !match.includes('height=')) {
          return match.replace('<img ', `<img width="${w}" height="${h}" `);
        }
      }
    } catch (_) { /* unsupported format — leave as-is */ }
    return match;
  });
}

export function stripLeadingTitle(markdown, title) {
  if (!title || !markdown) return markdown;
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escapedTitle) return markdown;
  const leadingTitle = new RegExp(`^\\s*#\\s+${escapedTitle}\\s*(?:\\r?\\n|$)`);
  return markdown.replace(leadingTitle, '');
}

export function romanTocPage(page) {
  const values = [
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let rest = Math.max(1, Math.floor(page));
  let result = '';

  for (const [value, roman] of values) {
    while (rest >= value) {
      result += roman;
      rest -= value;
    }
  }

  return result;
}
