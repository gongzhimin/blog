import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

async function exists(path) {
  try {
    await access(new URL(path, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test("book runtime scripts live outside the turnjs vendor directory", async () => {
  for (const filename of [
    "paginator.js",
    "orchestrator.js",
    "turnjs-adapter.js",
    "book-app.js",
  ]) {
    assert.equal(
      await exists(`../public/book-runtime/js/${filename}`),
      true,
      `missing runtime script ${filename}`,
    );
    assert.equal(
      await exists(`../public/vendor/turnjs/js/${filename}`),
      false,
      `runtime script should not live under vendor/turnjs/js: ${filename}`,
    );
  }
});
