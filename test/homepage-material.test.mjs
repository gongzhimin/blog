import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildHomepageStyles } from "../src/book/homepage/build-homepage-styles.mjs";

async function loadBookConfig() {
  return JSON.parse(
    await readFile(
      new URL("../src/data/book-config.json", import.meta.url),
      "utf8",
    ),
  );
}

test("homepage book surface uses a soft matte paper material layer", async () => {
  const config = await loadBookConfig();
  const css = buildHomepageStyles({
    book: config.book,
    cover: config.book.coverSprite,
    footer: config.footer,
    light: {
      nav: config.nav.light,
      footer: config.footer.light,
      background: config.backgrounds.light,
    },
    mobileCanvas: config.book.mobileCanvas,
    mobileContentPage: config.book.mobileContentPage,
    nav: config.nav,
    theme: { styles: { visualCSS: "" } },
  });

  assert.match(css, /--paper-base:/);
  assert.match(css, /--paper-fiber:/);
  assert.match(css, /--paper-speck:/);
  assert.match(css, /\.sj-book \.own-size::before/);
  assert.match(css, /\.sj-book \.own-size::after/);
  assert.match(css, /mix-blend-mode: multiply/);
});
