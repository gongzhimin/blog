/**
 * markdown-renderer.mjs — Markdown content renderer for BookDocument entries.
 *
 * Pure functions. No Astro dependency. No side effects beyond reading local
 * image dimensions while rendering <img> tags.
 */

import { marked } from "marked";
import katex from "katex";
import hljs from "highlight.js";
import { imageSize } from "image-size";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Syntax highlighting via marked renderer avoids marked-highlight escaping
// issues in marked v18.
marked.use({
  renderer: {
    code(token) {
      if (token.lang && hljs.getLanguage(token.lang)) {
        try {
          const highlighted = hljs.highlight(token.text, {
            language: token.lang,
          }).value;
          return `<pre><code class="hljs language-${token.lang}">${highlighted}</code></pre>`;
        } catch {
          // Fall through to plain code rendering.
        }
      }

      return (
        "<pre><code" +
        (token.lang ? ` class="language-${token.lang}"` : "") +
        ">" +
        token.text +
        "</code></pre>"
      );
    },
  },
});

export function renderMarkdown(markdown) {
  if (!markdown) return "";

  let html = markdown;
  const katexBlocks = [];

  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      katexBlocks.push(
        katex.renderToString(tex.trim(), {
          displayMode: true,
          throwOnError: false,
        }),
      );
    } catch {
      katexBlocks.push("<pre>KaTeX error</pre>");
    }
    return `\uE000KATEX_${katexBlocks.length - 1}__ENDKATEX\uE000`;
  });

  html = html.replace(/\$(.+?)\$/g, (_, tex) => {
    try {
      katexBlocks.push(
        katex.renderToString(tex.trim(), {
          displayMode: false,
          throwOnError: false,
        }),
      );
    } catch {
      katexBlocks.push(`<code>${tex}</code>`);
    }
    return `\uE000KATEX_${katexBlocks.length - 1}__ENDKATEX\uE000`;
  });

  html = marked.parse(html);
  html = html.replace(
    /\uE000KATEX_(\d+)__ENDKATEX\uE000/g,
    (_, index) => katexBlocks[parseInt(index, 10)],
  );

  html = html.replace(/<table/g, '<div class="table-wrap"><table');
  html = html.replace(/<\/table>/g, "</table></div>");
  html = injectImageDimensions(html);
  html = addCJKLatinSpacing(html);

  return html;
}

function addCJKLatinSpacing(html) {
  const cjk =
    "\u4e00-\u9fff\u3400-\u4dbf\u2e80-\u2eff\uf900-\ufaff\u3000-\u303f\uff00-\uffef";
  const protectedBlocks = [];

  html = html.replace(
    /(<(code|pre|script|style)\b[^>]*>[\s\S]*?<\/\2>)/gi,
    (match) => {
      protectedBlocks.push(match);
      return `\uE001PROT_${protectedBlocks.length - 1}_PROT\uE001`;
    },
  );

  html = html.replace(
    new RegExp(`([${cjk}])([A-Za-z0-9]+(?:\\s+[A-Za-z0-9]+)*)`, "g"),
    "$1\u2006$2",
  );
  html = html.replace(
    new RegExp(`([A-Za-z0-9]+(?:\\s+[A-Za-z0-9]+)*)([${cjk}])`, "g"),
    "$1\u2006$2",
  );

  return html.replace(
    /\uE001PROT_(\d+)_PROT\uE001/g,
    (_, index) => protectedBlocks[parseInt(index, 10)],
  );
}

function injectImageDimensions(html) {
  return html.replace(/<img\s[^>]*src="([^"]+)"[^>]*>/gi, (match, src) => {
    if (!src.startsWith("/")) return match;

    const filePath = resolve("public", src.slice(1));
    if (!existsSync(filePath)) return match;

    try {
      const dims = imageSize(readFileSync(filePath));
      if (!dims.width || !dims.height) return match;

      const contentWidth = 380;
      const width = Math.min(dims.width, contentWidth);
      const height = Math.round(dims.height * (width / dims.width));
      if (!match.includes("width=") && !match.includes("height=")) {
        return match.replace("<img ", `<img width="${width}" height="${height}" `);
      }
    } catch {
      // Unsupported format: keep the original tag.
    }

    return match;
  });
}

export function stripLeadingTitle(markdown, title) {
  if (!title || !markdown) return markdown;

  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escapedTitle) return markdown;

  const leadingTitle = new RegExp(`^\\s*#\\s+${escapedTitle}\\s*(?:\\r?\\n|$)`);
  return markdown.replace(leadingTitle, "");
}

export function romanTocPage(page) {
  const values = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let rest = Math.max(1, Math.floor(page));
  let result = "";

  for (const [value, roman] of values) {
    while (rest >= value) {
      result += roman;
      rest -= value;
    }
  }

  return result;
}
