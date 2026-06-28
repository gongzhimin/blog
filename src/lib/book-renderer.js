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
import { imageSize } from 'image-size';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
