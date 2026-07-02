import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const BOOK_APP_URL = new URL(
  "../public/vendor/turnjs/js/book-app.js",
  import.meta.url,
);

test("book app clamps mobile page targets before calling turn.js", async () => {
  const source = await readFile(BOOK_APP_URL, "utf8");

  assert.match(source, /function clampPageTarget\(book, page\)/);
  assert.match(source, /isMobile \? clampPageTarget\(flipbook, actualView\)/);
  assert.match(
    source,
    /isMobile \? clampPageTarget\(book, \$\(this\)\.slider\('value'\)\)/,
  );
});
