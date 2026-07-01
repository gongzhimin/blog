import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

async function loadDemo() {
  const html = await readFile(
    new URL("../dist/demos/book-runtime/index.html", import.meta.url),
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
    document.querySelector("script[src='/vendor/turnjs/js/book-app.js']") !==
      null,
    true,
  );
});
