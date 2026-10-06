import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const classicThemePath = new URL(
  '../src/styles/book-themes/classic-paper/',
  import.meta.url,
);

test('classic-paper content styles scope print effects to readable text', async () => {
  const css = await readFile(new URL('content.css', classicThemePath), 'utf8');

  assert.match(css, /--print-ink:/);
  assert.match(css, /--print-shadow-body:/);
  assert.match(css, /\.sj-book \.book-content :where\(p, li, blockquote\)/);
  assert.match(css, /mix-blend-mode: multiply/);
  assert.match(css, /text-shadow: var\(--print-shadow-body\)/);
  assert.match(
    css,
    /\.sj-book \.book-content :where\(pre, code, img, \.table-wrap\)/,
  );
  assert.match(css, /mix-blend-mode: normal/);
});

test('classic-paper table of contents uses the lighter letterpress treatment', async () => {
  const css = await readFile(new URL('toc.css', classicThemePath), 'utf8');

  assert.match(css, /--toc-print-ink:/);
  assert.match(css, /\.sj-book \.table-contents/);
  assert.match(css, /mix-blend-mode: multiply/);
  assert.match(css, /text-shadow: var\(--toc-print-shadow\)/);
});
