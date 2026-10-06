import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Site loads the Runtime package root before its page bootstrap', async () => {
  const [entry, runtime] = await Promise.all([
    read('../../packages/site/src/internal/book-runtime-entry.js'),
    read('../../packages/book-runtime/src/api/index.mjs'),
  ]);

  assert.ok(
    entry.indexOf("'@myblog/book-runtime'") < entry.indexOf("'./book-app.js'"),
  );
  assert.doesNotMatch(runtime, /turnjs-adapter/);
  assert.match(entry, /import '\.\/turnjs-adapter\.js'/);
  assert.doesNotMatch(runtime, /book-app\.js/);
});

test('Site reader bootstrap delegates only pagination to Runtime', async () => {
  const [app, orchestrator] = await Promise.all([
    read('../../packages/site/src/internal/book-app.js'),
    read('../../packages/book-runtime/src/internal/orchestrator.js'),
  ]);

  assert.match(app, /window\.BookRuntime\.API\.paginateBook\(BOOK_CONFIG\)/);
  assert.match(app, /window\.SiteReader\.TurnAdapter\.create/);
  assert.doesNotMatch(
    app,
    /window\.BookRuntime\.(?:TurnAdapter|Paginator|Orchestrator)/,
  );
  assert.match(app, /TOC_HTML \+ '<span class="page-number">I<\/span>'/);
  assert.match(orchestrator, /function createBookPageCache/);
  assert.match(orchestrator, /window\.BookRuntime\.Orchestrator/);
});

test('Site owns Astro composition and markup while Runtime exposes no host components', async () => {
  const [manifest, page, shell] = await Promise.all([
    read('../../packages/book-runtime/package.json'),
    read('../../packages/site/src/pages/demos/book-runtime.astro'),
    read('../../packages/site/src/components/BookShell.astro'),
  ]);
  const exports = JSON.parse(manifest).exports;

  assert.deepEqual(Object.keys(exports), ['.']);
  assert.match(page, /BookShell/);
  assert.match(page, /BookRuntimeAssets/);
  assert.match(shell, /window\.MEASURE_CSS/);
  assert.doesNotMatch(page, /@myblog\/book-runtime\//);
  assert.doesNotMatch(page, /@myblog\/book-build\//);
});
