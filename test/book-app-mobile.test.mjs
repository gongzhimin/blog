import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const TURNJS_ADAPTER_URL = new URL(
  "../public/book-runtime/js/turnjs-adapter.js",
  import.meta.url,
);

test("Turn.js adapter clamps mobile page targets before calling turn.js", async () => {
  const source = await readFile(TURNJS_ADAPTER_URL, "utf8");

  assert.match(source, /function clampPageTarget\(book, page\)/);
  assert.match(source, /isMobile \? clampPageTarget\(flipbook, actualView\)/);
  assert.match(
    source,
    /isMobile \? clampPageTarget\(book, \$\(this\)\.slider\('value'\)\)/,
  );
});
