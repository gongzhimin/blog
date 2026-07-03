import test from "node:test";
import assert from "node:assert/strict";
import { createClassicPaperTheme } from "../src/book/themes/classic-paper/theme.mjs";
import {
  listBookThemeIds,
  loadBookTheme,
} from "../src/book/themes/load-theme.mjs";

const cssSources = {
  fontsCSS: ".font-face{}",
  bookContentCSS:
    ".sj-book .book-content{font-size:16px}.sj-book .book-content p{margin:0}",
  codeHighlightCSS: ".hljs{color:#333}",
  surfaceCSS: "/* plain-manuscript theme */ .sj-book .own-size{}",
  bookTocCSS:
    ".sj-book .table-contents{font-size:15px}.sj-book .table-contents a{color:#8b7355}",
  katexCSS: ".katex{font-size:1.21em}",
};

test("classic-paper theme derives measurement css from visual css sources", () => {
  const theme = createClassicPaperTheme(cssSources);

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

test("book theme loader selects registered themes and defaults to classic-paper", () => {
  assert.deepEqual(listBookThemeIds(), ["classic-paper", "plain-manuscript"]);

  const defaultTheme = loadBookTheme(undefined, cssSources);
  assert.equal(defaultTheme.id, "classic-paper");

  const manuscript = loadBookTheme("plain-manuscript", cssSources);
  assert.equal(manuscript.id, "plain-manuscript");
  assert.equal(manuscript.name, "Plain Manuscript");
  assert.equal(manuscript.runtime.id, "plain-manuscript");
  assert.match(manuscript.styles.visualCSS, /plain-manuscript theme/);
  assert.match(manuscript.styles.visualCSS, /\.sj-book \.book-content/);
  assert.match(manuscript.measurement.articleCSS, /#__bap_inner/);
  assert.doesNotMatch(
    manuscript.measurement.articleCSS,
    /\.sj-book \.book-content/,
  );
  assert.match(manuscript.measurement.tocCSS, /#__toc/);
  assert.doesNotMatch(
    manuscript.measurement.tocCSS,
    /\.sj-book \.table-contents/,
  );

  assert.throws(
    () => loadBookTheme("missing-theme", cssSources),
    /Unknown book theme: missing-theme/,
  );
});
