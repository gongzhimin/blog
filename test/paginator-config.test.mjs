import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { JSDOM } from "jsdom";

async function loadPaginator() {
  const dom = new JSDOM("<!doctype html><body></body>");
  const appended = [];
  const originalAppendChild = dom.window.document.body.appendChild.bind(
    dom.window.document.body,
  );
  dom.window.document.body.appendChild = (node) => {
    appended.push(node);
    return originalAppendChild(node);
  };

  const context = {
    window: dom.window,
    document: dom.window.document,
    MEASURE_CSS: {
      article:
        "#__bap_inner{font-size:16px;line-height:20px}#__bap_inner p{margin:0}",
      toc: "#__toc{font-size:16px;line-height:20px}#__toc li{margin:0}",
    },
    __appended: appended,
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const path of [
    "../public/book-runtime/js/paginator-core.js",
    "../public/book-runtime/js/paginator-splitters.js",
    "../public/book-runtime/js/paginator.js",
  ]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    vm.runInContext(source, context);
  }
  return context;
}

test("paginator uses configured article and toc measurement dimensions", async () => {
  const context = await loadPaginator();
  assert.equal(typeof context.PAGINATOR.configure, "function");

  context.PAGINATOR.configure({
    articleWidth: 123,
    articleHeight: 45,
    tocWidth: 234,
    tocHeight: 67,
  });

  const config = context.PAGINATOR.getConfig();
  assert.equal(config.articleWidth, 123);
  assert.equal(config.articleHeight, 45);
  assert.equal(config.tocWidth, 234);
  assert.equal(config.tocHeight, 67);

  context.PAGINATOR.paginateArticle({
    title: "Configured",
    dateStr: "2026/07/01",
    bodyHTML: "<p>one</p><p>two</p>",
  });
  const articleMeasure = context.__appended.at(-1);
  assert.equal(articleMeasure.style.width, "123px");
  assert.equal(articleMeasure.querySelector("#__bap_inner").style.height, "45px");

  context.PAGINATOR.paginateTOC(
    '<div class="table-contents"><h1>目录</h1><ul><li>one</li></ul></div>',
  );
  const tocMeasure = context.__appended.at(-1);
  assert.equal(tocMeasure.style.width, "234px");
  assert.equal(tocMeasure.querySelector("#__toc").style.height, "67px");
});
