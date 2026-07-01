import test from "node:test";
import assert from "node:assert/strict";
import { createClassicPaperTheme } from "../src/book/themes/classic-paper/theme.mjs";

test("classic-paper theme derives measurement css from visual css sources", () => {
  const theme = createClassicPaperTheme({
    fontsCSS: ".font-face{}",
    bookContentCSS:
      ".sj-book .book-content{font-size:16px}.sj-book .book-content p{margin:0}",
    codeHighlightCSS: ".hljs{color:#333}",
    bookTocCSS:
      ".sj-book .table-contents{font-size:15px}.sj-book .table-contents a{color:#8b7355}",
    katexCSS: ".katex{font-size:1.21em}",
  });

  assert.equal(theme.id, "classic-paper");
  assert.equal(theme.name, "Classic Paper");
  assert.equal(theme.runtime.id, "classic-paper");
  assert.equal(theme.runtime.name, "Classic Paper");
  assert.match(theme.styles.visualCSS, /\.font-face\{\}/);
  assert.match(theme.styles.visualCSS, /\.sj-book \.book-content/);
  assert.match(theme.styles.visualCSS, /\.sj-book \.table-contents/);
  assert.match(theme.measurement.articleCSS, /\.katex\{font-size:1\.21em\}/);
  assert.match(theme.measurement.articleCSS, /\.hljs\{color:#333\}/);
  assert.match(
    theme.measurement.articleCSS,
    /#__bap_inner\{font-size:16px\}/,
  );
  assert.doesNotMatch(theme.measurement.articleCSS, /\.sj-book \.book-content/);
  assert.match(theme.measurement.tocCSS, /#__toc\{/);
  assert.match(theme.measurement.tocCSS, /#__toc a\{color:#8b7355\}/);
  assert.doesNotMatch(theme.measurement.tocCSS, /\.sj-book \.table-contents/);
});
