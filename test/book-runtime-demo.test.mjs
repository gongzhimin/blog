import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

async function loadDemoSource() {
  return readFile(
    new URL("../src/pages/demos/book-runtime.astro", import.meta.url),
    "utf8",
  );
}

async function loadDemo() {
  const html = await readFile(
    new URL("../dist/demos/book-runtime/index.html", import.meta.url),
    "utf8",
  );
  return new JSDOM(html).window.document;
}

async function loadStandaloneBook() {
  const html = await readFile(
    new URL("../dist/book/sample/index.html", import.meta.url),
    "utf8",
  );
  return new JSDOM(html).window.document;
}

test("book runtime demo renders a standalone JSON book", async () => {
  const document = await loadDemo();
  const node = document.querySelector("#book-data");
  assert.ok(node, "missing #book-data");

  const config = JSON.parse(node.dataset.config);
  assert.equal(config.source.documentId, "sample-json-book");
  assert.equal(config.source.documentTitle, "一本独立的小书");
  assert.equal(config.source.entryCount, 2);
  assert.equal(config.theme.id, "plain-manuscript");
  assert.equal(config.articles[0].source.collection, "json");
  assert.match(config.articles[0].bodyHTML, /这本小书来自一个 JSON 文件/);
  assert.equal(
    document.querySelector(".site-nav .brand").textContent.trim(),
    "Book Runtime Demo",
  );
  assert.equal(
    document.querySelector("script[src='/book-runtime/js/book-app.js']") !==
      null,
    true,
  );
  assert.equal(
    document.querySelector("script[src='/vendor/turnjs/js/book-app.js']") ===
      null,
    true,
  );
});

test("book runtime demo delegates the reusable book shell to BookShell", async () => {
  const source = await loadDemoSource();

  assert.match(
    source,
    /import BookShell from ['"]\.\.\/\.\.\/book\/components\/BookShell\.astro['"]/,
  );
  assert.match(
    source,
    /import BookRuntimeAssets from ['"]\.\.\/\.\.\/book\/components\/BookRuntimeAssets\.astro['"]/,
  );
  assert.match(source, /<BookShell/);
  assert.match(source, /<BookRuntimeAssets/);
  assert.doesNotMatch(source, /id="book-data"/);
  assert.doesNotMatch(source, /src="\/book-runtime\/js\/book-app\.js"/);
  assert.doesNotMatch(source, /src="\/vendor\/turnjs\/jquery/);
  assert.doesNotMatch(source, /href="\/vendor\/turnjs\/css\/steve-jobs\.css"/);
});

test("standalone book route renders JSON books from src/data/books", async () => {
  const document = await loadStandaloneBook();
  const node = document.querySelector("#book-data");
  assert.ok(node, "missing #book-data");

  const config = JSON.parse(node.dataset.config);
  assert.equal(config.source.documentId, "sample-json-book");
  assert.equal(config.source.documentTitle, "一本独立的小书");
  assert.equal(config.source.entryCount, 2);
  assert.equal(config.articles[0].source.collection, "json");
  assert.equal(document.title, "一本独立的小书");
});
