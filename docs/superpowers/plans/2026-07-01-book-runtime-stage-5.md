# Book Runtime 阶段 5 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 接入非博客 JSON 内容源，并新增 `/demos/book-runtime/` 页面，证明 Book Runtime 可以呈现独立内容，而不依赖 Astro blog/life collections。

**架构：** 新增 `createJsonBookDocument()` 将 JSON 数据标准化为 `BookDocument`。新增 `src/book/examples/sample-book.json` 作为独立内容。新增 demo 页面复用 `buildBookRuntime()`、`renderMarkdown()`、`loadBookTheme()` 与现有 Turn.js runtime，主题使用 `plain-manuscript`，默认首页不变。

**技术栈：** Astro 6、Node.js ESM、node:test、JSDOM、现有 Book Runtime 与 Turn.js runtime。

---

## 文件结构

- 创建：`src/book/sources/json-book-source.mjs`
  - 职责：把普通 JSON 书籍数据转成 `BookDocument`。
- 创建：`src/book/examples/sample-book.json`
  - 职责：非博客内容样例，用于 demo 页面和测试。
- 创建：`src/pages/demos/book-runtime.astro`
  - 职责：用 JSON source 构建一本独立 demo 书，走现有 runtime 与 `plain-manuscript` 主题。
- 创建：`test/json-book-source.test.mjs`
  - 职责：测试 JSON source 的标准化、默认值、bodyType 和日期解析。
- 创建：`test/book-runtime-demo.test.mjs`
  - 职责：读取构建后的 `/demos/book-runtime/index.html`，验证 demo 不依赖博客 collection，且 runtime source/theme 正确。

## 任务 1：实现 JSON Book Source

**文件：**
- 创建：`test/json-book-source.test.mjs`
- 创建：`src/book/sources/json-book-source.mjs`
- 创建：`src/book/examples/sample-book.json`

- [ ] **步骤 1：编写失败测试**

创建 `test/json-book-source.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createJsonBookDocument } from "../src/book/sources/json-book-source.mjs";

test("createJsonBookDocument converts standalone JSON into a BookDocument", () => {
  const document = createJsonBookDocument({
    id: "demo-book",
    title: "一本独立的小书",
    tocTitle: "章节",
    entries: [
      {
        id: "chapter-one",
        title: "第一章",
        date: "2026-07-01",
        bodyType: "markdown",
        body: "# 第一章\n\n这不是博客文章。",
      },
      {
        title: "HTML 附录",
        date: "2026-07-02",
        bodyType: "html",
        body: "<p>HTML body</p>",
      },
    ],
  });

  assert.equal(document.id, "demo-book");
  assert.equal(document.title, "一本独立的小书");
  assert.equal(document.tocTitle, "章节");
  assert.deepEqual(
    document.entries.map((entry) => ({
      id: entry.id,
      collection: entry.collection,
      title: entry.title,
      bodyType: entry.bodyType,
      date: entry.date.toISOString().slice(0, 10),
    })),
    [
      {
        id: "chapter-one",
        collection: "json",
        title: "第一章",
        bodyType: "markdown",
        date: "2026-07-01",
      },
      {
        id: "entry-2",
        collection: "json",
        title: "HTML 附录",
        bodyType: "html",
        date: "2026-07-02",
      },
    ],
  );
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/json-book-source.test.mjs
```

预期：FAIL，无法找到 `json-book-source.mjs`。

- [ ] **步骤 3：实现 JSON source**

创建 `src/book/sources/json-book-source.mjs`：

```js
import "../model/book-types.mjs";

function parseDate(value) {
  return value ? new Date(`${value}T00:00:00Z`) : new Date("1970-01-01T00:00:00Z");
}

function toEntry(entry, index) {
  return {
    id: entry.id || `entry-${index + 1}`,
    collection: "json",
    title: entry.title,
    date: parseDate(entry.date),
    body: entry.body || "",
    bodyType: entry.bodyType || "markdown",
    metadata: entry.metadata || {},
  };
}

export function createJsonBookDocument(data) {
  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    tocTitle: data.tocTitle || "目录",
    entries: (data.entries || []).map(toEntry),
    metadata: data.metadata || {},
  };
}
```

创建 `src/book/examples/sample-book.json`：

```json
{
  "id": "sample-json-book",
  "title": "一本独立的小书",
  "description": "一个不依赖博客 Markdown collections 的 Book Runtime 示例。",
  "tocTitle": "章节",
  "entries": [
    {
      "id": "opening",
      "title": "开场",
      "date": "2026-07-01",
      "bodyType": "markdown",
      "body": "# 开场\n\n这本小书来自一个 JSON 文件，而不是博客文章目录。它仍然会经过同一套 Markdown 渲染、目录生成、浏览器分页和 Turn.js 翻页流程。"
    },
    {
      "id": "notes",
      "title": "一些说明",
      "date": "2026-07-02",
      "bodyType": "markdown",
      "body": "## 内容源\n\nBook Runtime 接收的是标准化后的 `BookDocument`。\n\n- 博客文章可以转成它\n- JSON 文件也可以转成它\n- 未来单本书、图文册、课程讲义也可以转成它"
    }
  ]
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/json-book-source.test.mjs
```

预期：PASS。

## 任务 2：新增独立 Book Runtime demo 页面

**文件：**
- 创建：`src/pages/demos/book-runtime.astro`
- 创建：`test/book-runtime-demo.test.mjs`

- [ ] **步骤 1：编写失败测试**

创建 `test/book-runtime-demo.test.mjs`：

```js
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
  assert.equal(document.querySelector(".site-nav .brand").textContent.trim(), "Book Runtime Demo");
  assert.equal(document.querySelector("script[src='/vendor/turnjs/js/book-app.js']") !== null, true);
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/book-runtime-demo.test.mjs
```

预期：FAIL，`dist/demos/book-runtime/index.html` 不存在。

- [ ] **步骤 3：实现 demo 页面**

创建 `src/pages/demos/book-runtime.astro`，复用现有 runtime 链路：

```astro
---
import { readFileSync } from 'fs';
import bookConfig from '../../data/book-config.json';
import sampleBook from '../../book/examples/sample-book.json';
import { renderMarkdown, stripLeadingTitle, romanTocPage } from '../../lib/book-renderer.js';
import { buildBookRuntime } from '../../book/assembler/build-book-runtime.mjs';
import { createJsonBookDocument } from '../../book/sources/json-book-source.mjs';
import { loadBookTheme } from '../../book/themes/load-theme.mjs';
import fontsCSS from '../../styles/fonts.css?raw';
import bookContentCSS from '../../styles/book-content.css?raw';
import codeHighlightCSS from '../../styles/code-highlight.css?raw';
import bookTocCSS from '../../styles/book-toc.css?raw';

const katexCSS = readFileSync('node_modules/katex/dist/katex.min.css', 'utf8');
const demoConfig = JSON.parse(JSON.stringify(bookConfig));
demoConfig.theme = { id: 'plain-manuscript' };
demoConfig.footer.content.copyright = 'Book Runtime Demo';

const theme = loadBookTheme(demoConfig.theme.id, {
  fontsCSS,
  bookContentCSS,
  codeHighlightCSS,
  bookTocCSS,
  katexCSS,
});
const bookDocument = createJsonBookDocument(sampleBook);
const runtime = buildBookRuntime({
  document: bookDocument,
  bookConfig: demoConfig,
  renderMarkdown,
  stripLeadingTitle,
  romanTocPage,
});
const runConfig = runtime.config;
runConfig.theme = theme.runtime;

const backPage = runConfig.book.turn.backPage;
const totalPages = runConfig.book.turn.totalPages;
const pageDepthAttrs = { depth: '5' };
const homepageStyles = `
  body { min-height: 100vh; overflow-x: auto !important; overflow-y: auto !important; background: #e8e4de; color: #3a3a3a; }
  .site-nav { height: 56px; display:flex; align-items:center; justify-content:center; border-bottom:1px solid rgba(0,0,0,.08); }
  .site-nav .brand { color:#555; font-size:15px; letter-spacing:.08em; text-decoration:none; }
  #canvas { visibility:hidden; width:${demoConfig.book.canvasWidth}px!important; height:${demoConfig.book.height}px!important; margin:0 auto!important; padding:${demoConfig.book.gap}px 0!important; }
  .sj-book { width:${demoConfig.book.width}px!important; height:${demoConfig.book.height}px!important; }
  .sj-book .hard { width:${demoConfig.book.hardPage.width}px; height:${demoConfig.book.hardPage.height}px; }
  .sj-book .own-size { width:${demoConfig.book.contentPage.width}px; height:${demoConfig.book.contentPage.height}px; }
  .sj-book .p1 .side { width:${demoConfig.book.spineStrip.width}px!important; left:${demoConfig.book.spineStrip.left}px!important; }
  .sj-book .depth { top:${demoConfig.book.depth.top}px; height:${demoConfig.book.depth.height}px; }
  .sj-book .p1,.sj-book .p2,.sj-book .p3 { background-color:white; background-image:url(/vendor/turnjs/pics/book-covers.jpg)!important; background-repeat:no-repeat; background-size:2400px 600px; }
  .sj-book .p1 { background-position:0 0!important; }
  .sj-book .p2 { background-position:-483px 0!important; }
  .sj-book .p3 { background-position:-1936px 0!important; }
` + theme.styles.visualCSS;
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>Book Runtime Demo</title>
    <meta name="viewport" content="width=1050, user-scalable=no" />
    <script is:inline src="/vendor/turnjs/jquery.min.1.7.js"></script>
    <script is:inline src="/vendor/turnjs/jquery-ui-1.8.20.custom.min.js"></script>
    <script is:inline src="/vendor/turnjs/jquery.mousewheel.min.js"></script>
    <script is:inline src="/vendor/turnjs/modernizr.2.5.3.min.js"></script>
    <script is:inline src="/vendor/turnjs/hash.js"></script>
    <link rel="stylesheet" href="/vendor/turnjs/css/jquery.ui.css" />
    <link rel="stylesheet" href="/vendor/turnjs/css/steve-jobs.css" />
    <style is:inline set:html={homepageStyles}></style>
  </head>
  <body>
    <header class="site-nav">
      <a class="brand" href="/demos/book-runtime/">Book Runtime Demo</a>
    </header>
    <main>
      <div id="canvas">
        <div id="book-zoom">
          <div class="sj-book">
            <div {...pageDepthAttrs} class="hard"><div class="side"></div></div>
            <div {...pageDepthAttrs} class="hard front-side"><div class="depth"></div></div>
            <div class="own-size"></div>
            <div class="own-size even"></div>
            <div class={`hard fixed back-side p${backPage}`}><div class="depth"></div></div>
            <div class={`hard p${totalPages}`}></div>
          </div>
        </div>
        <div id="slider-bar" class="turnjs-slider"><div id="slider"></div></div>
      </div>
    </main>
    <div id="book-data" hidden data-config={JSON.stringify(runConfig)}></div>
    <script is:inline set:html={`var MEASURE_CSS={article:` + JSON.stringify(theme.measurement.articleCSS) + `,toc:` + JSON.stringify(theme.measurement.tocCSS) + `};`}></script>
    <script is:inline src="/vendor/turnjs/js/paginator.js"></script>
    <script is:inline src="/vendor/turnjs/js/orchestrator.js"></script>
    <script is:inline src="/vendor/turnjs/js/book-app.js"></script>
  </body>
</html>
```

- [ ] **步骤 4：构建并运行测试验证通过**

运行：

```bash
npm run build
node --test test/book-runtime-demo.test.mjs
```

预期：PASS。

## 任务 3：全量验证并提交阶段 5

**文件：**
- 阶段 5 相关文件

- [ ] **步骤 1：检查补丁质量**

运行：

```bash
git diff --check
```

预期：无输出，退出码为 0。

- [ ] **步骤 2：运行全部 Node 测试**

运行：

```bash
node --test test/*.test.*
```

预期：全部通过。

- [ ] **步骤 3：运行 Astro 构建**

运行：

```bash
npm run build
```

预期：构建成功。

- [ ] **步骤 4：只提交阶段 5 文件**

运行：

```bash
git add docs/superpowers/plans/2026-07-01-book-runtime-stage-5.md \
  src/book/sources/json-book-source.mjs \
  src/book/examples/sample-book.json \
  src/pages/demos/book-runtime.astro \
  test/json-book-source.test.mjs \
  test/book-runtime-demo.test.mjs
git commit -m "feat: add standalone json book demo"
```

预期：提交成功，`README.md` 与 `docs/ios-shortcuts-image-publishing.md` 仍保持未提交状态。

## 自检

- 规格覆盖：JSON source、独立 sample book、demo 页面、非博客 runtime 数据、测试和构建验证都有对应任务。
- 占位符扫描：没有执行步骤使用空泛占位。
- 类型一致性：统一使用 `createJsonBookDocument(data)` 输出 `BookDocument`，demo 复用 `buildBookRuntime()`。
