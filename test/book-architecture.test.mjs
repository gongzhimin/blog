import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("README describes the current book runtime architecture", async () => {
  const readme = await read("../README.md");

  assert.match(readme, /src\/book\/renderers\/markdown-renderer\.mjs/);
  assert.match(readme, /BookRuntime\.Orchestrator\.createPageCache\(\)/);
  assert.match(readme, /window\.BookRuntime/);
  assert.match(readme, /paginator-core\.js/);
  assert.match(readme, /paginator-splitters\.js/);
  assert.doesNotMatch(readme, /填充 `_pageCache`/);
  assert.doesNotMatch(readme, /src\/lib\/book-renderer\.js\s+# Markdown -> HTML/);
});

test("pagination workflow documents the split paginator modules", async () => {
  const workflow = await read("../docs/pagination-workflow.md");

  assert.match(workflow, /paginator-core\.js/);
  assert.match(workflow, /paginator-splitters\.js/);
  assert.match(workflow, /paginator\.js/);
  assert.doesNotMatch(workflow, /单文件分页器/);
});

test("demo page uses the same renderer and book style builder as the homepage", async () => {
  const source = await read("../src/pages/demos/book-runtime.astro");

  assert.match(
    source,
    /from ['"]\.\.\/\.\.\/book\/renderers\/markdown-renderer\.mjs['"]/,
  );
  assert.match(
    source,
    /from ['"]\.\.\/\.\.\/book\/homepage\/build-homepage-styles\.mjs['"]/,
  );
  assert.match(source, /buildHomepageStyles\(\{/);
  assert.doesNotMatch(source, /from ['"]\.\.\/\.\.\/lib\/book-renderer\.js['"]/);
  assert.doesNotMatch(source, /background-image: url\(\/vendor\/turnjs\/pics\/book-covers\.jpg\)/);
  assert.doesNotMatch(source, /background-size: 2400px 600px/);
});

test("markdown renderer implementation lives under the book module", async () => {
  const renderer = await read("../src/book/renderers/markdown-renderer.mjs");
  const legacy = await read("../src/lib/book-renderer.js");

  assert.match(renderer, /marked/);
  assert.match(renderer, /renderMarkdown/);
  assert.match(renderer, /stripLeadingTitle/);
  assert.match(legacy, /from ["']\.\.\/book\/renderers\/markdown-renderer\.mjs["']/);
  assert.doesNotMatch(legacy, /markedHighlight/);
});

test("browser runtime is exposed through a BookRuntime namespace", async () => {
  const [core, splitters, paginator, orchestrator, adapter, app] = await Promise.all([
    read("../public/book-runtime/js/paginator-core.js"),
    read("../public/book-runtime/js/paginator-splitters.js"),
    read("../public/book-runtime/js/paginator.js"),
    read("../public/book-runtime/js/orchestrator.js"),
    read("../public/book-runtime/js/turnjs-adapter.js"),
    read("../public/book-runtime/js/book-app.js"),
  ]);

  assert.match(core, /window\.BookRuntime\.PaginatorCore/);
  assert.match(splitters, /window\.BookRuntime\.PaginatorSplitters/);
  assert.match(paginator, /window\.BookRuntime\.Paginator/);
  assert.match(orchestrator, /window\.BookRuntime\.Orchestrator/);
  assert.match(adapter, /window\.BookRuntime\.TurnAdapter/);
  assert.match(app, /window\.BookRuntime\.Paginator/);
  assert.match(app, /window\.BookRuntime\.Orchestrator\.createPageCache/);
  assert.match(app, /window\.BookRuntime\.TurnAdapter\.create/);
});

test("BookShell loads paginator modules before the orchestration runtime", async () => {
  const shell = await read("../src/book/components/BookShell.astro");
  const coreIndex = shell.indexOf('src="/book-runtime/js/paginator-core.js"');
  const splittersIndex = shell.indexOf('src="/book-runtime/js/paginator-splitters.js"');
  const paginatorIndex = shell.indexOf('src="/book-runtime/js/paginator.js"');
  const orchestratorIndex = shell.indexOf('src="/book-runtime/js/orchestrator.js"');

  assert.ok(coreIndex > -1, "missing paginator-core.js");
  assert.ok(splittersIndex > -1, "missing paginator-splitters.js");
  assert.ok(paginatorIndex > -1, "missing paginator.js");
  assert.ok(coreIndex < splittersIndex, "core must load before splitters");
  assert.ok(splittersIndex < paginatorIndex, "splitters must load before paginator");
  assert.ok(paginatorIndex < orchestratorIndex, "paginator must load before orchestrator");
});
