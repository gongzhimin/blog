import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

async function exists(path) {
  try {
    await access(new URL(path, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test("book runtime has a dedicated Turn.js adapter outside vendor", async () => {
  assert.equal(
    await exists("../public/book-runtime/js/turnjs-adapter.js"),
    true,
  );
  assert.equal(
    await exists("../public/vendor/turnjs/js/turnjs-adapter.js"),
    false,
  );

  const source = await readFile(
    new URL("../public/book-runtime/js/turnjs-adapter.js", import.meta.url),
    "utf8",
  );
  assert.match(source, /window\.BookRuntime\.TurnAdapter/);
  assert.match(source, /function createTurnJsAdapter/);
  assert.doesNotMatch(source, /destroy:/);
  assert.doesNotMatch(source, /currentPage:/);
});

test("book shell loads the adapter before the app bootstrap", async () => {
  const source = await readFile(
    new URL("../src/book/components/BookShell.astro", import.meta.url),
    "utf8",
  );
  const adapterIndex = source.indexOf(
    'src="/book-runtime/js/turnjs-adapter.js"',
  );
  const appIndex = source.indexOf('src="/book-runtime/js/book-app.js"');

  assert.ok(adapterIndex > -1, "missing turnjs adapter script");
  assert.ok(appIndex > -1, "missing book app script");
  assert.ok(adapterIndex < appIndex, "adapter must load before book-app");
});

test("book app delegates Turn.js details to the adapter", async () => {
  const source = await readFile(
    new URL("../public/book-runtime/js/book-app.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /window\.BookRuntime\.TurnAdapter\.create/);
  assert.doesNotMatch(source, /function updateDepth/);
  assert.doesNotMatch(source, /function addPage/);
  assert.doesNotMatch(source, /flipbook\.turn\(\{/);
});

test("runtime page cache is instantiated instead of read as loose globals", async () => {
  const [app, orchestrator] = await Promise.all([
    readFile(
      new URL("../public/book-runtime/js/book-app.js", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../public/book-runtime/js/orchestrator.js", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(orchestrator, /function createBookPageCache/);
  assert.match(orchestrator, /setPageContent/);
  assert.match(orchestrator, /window\.BookRuntime\.Orchestrator/);
  assert.doesNotMatch(orchestrator, /var _pageCache = \{\}/);
  assert.doesNotMatch(orchestrator, /var _paginated = false/);
  assert.match(app, /window\.BookRuntime\.Orchestrator\.createPageCache/);
  assert.match(app, /pageCache\.setPageContent\(5/);
  assert.doesNotMatch(app, /if \(_paginated\)/);
  assert.doesNotMatch(app, /_pageCache\[page\]/);
});
