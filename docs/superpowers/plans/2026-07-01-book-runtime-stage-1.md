# Book Runtime 阶段 1 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 抽出首页书籍数据组装层，让 `src/pages/index.astro` 不再直接承担文章查询、排序、Markdown 渲染、目录和 runtime config 组装。

**架构：** 新增 `src/book/` 下的轻量模块：model 只用 JSDoc 记录运行时数据形状；source 负责把 Astro collections 转成标准 entries；assembler 负责生成 articles、toc 和 Turn.js runtime config。首页保留现有 DOM、CSS 和 Turn.js 引用，只改为调用 assembler。

**技术栈：** Astro 6、Node.js ESM、node:test、JSDOM、现有 `book-renderer.js`。

---

## 文件结构

- 创建：`src/book/model/book-types.mjs`
  - 职责：用 JSDoc 记录 `BookEntry`、`BookDocument`、`RenderedBookRuntime` 数据形状，不引入 TypeScript 编译改造。
- 创建：`src/book/sources/astro-blog-source.mjs`
  - 职责：把 `life` 与 `blog` collections 标准化为 `BookDocument`。
- 创建：`src/book/assembler/build-book-runtime.mjs`
  - 职责：把 `BookDocument`、`bookConfig`、Markdown renderer 组装成首页运行时数据。
- 修改：`src/pages/index.astro`
  - 职责：移除文章查询、排序、TOC 和 runtime config 组装逻辑，调用新模块。
- 创建：`test/book-runtime.test.mjs`
  - 职责：用纯数据测试 source/assembler 行为，不依赖 Astro 构建。
- 修改：`test/homepage-render.test.mjs`
  - 职责：增加静态首页仍从 runtime config 暴露 source 信息和目录页的断言。

## 任务 1：定义标准 BookDocument source

**文件：**
- 创建：`src/book/model/book-types.mjs`
- 创建：`src/book/sources/astro-blog-source.mjs`
- 测试：`test/book-runtime.test.mjs`

- [ ] **步骤 1：编写失败测试**

在 `test/book-runtime.test.mjs` 中添加：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createAstroBlogDocument, getBookEntryDate } from "../src/book/sources/astro-blog-source.mjs";

test("createAstroBlogDocument combines life and blog posts into sorted book entries", () => {
  const older = new Date("2026-06-20T00:00:00Z");
  const newer = new Date("2026-06-30T00:00:00Z");
  const document = createAstroBlogDocument({
    lifePosts: [
      {
        id: "life-old",
        body: "Life body",
        data: { title: "Life Old", date: older },
      },
    ],
    blogPosts: [
      {
        id: "blog-new",
        body: "# Blog New\n\nBlog body",
        data: { title: "Blog New", pubDatetime: newer },
      },
    ],
  });

  assert.equal(document.id, "zhimin-blog");
  assert.equal(document.title, "Zhimin 的博客书");
  assert.deepEqual(
    document.entries.map((entry) => ({
      id: entry.id,
      collection: entry.collection,
      title: entry.title,
      bodyType: entry.bodyType,
    })),
    [
      { id: "blog-new", collection: "blog", title: "Blog New", bodyType: "markdown" },
      { id: "life-old", collection: "life", title: "Life Old", bodyType: "markdown" },
    ],
  );
  assert.equal(getBookEntryDate(document.entries[0]).toISOString(), newer.toISOString());
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/book-runtime.test.mjs
```

预期：FAIL，报错无法找到 `../src/book/sources/astro-blog-source.mjs`。

- [ ] **步骤 3：实现最小 source 模块**

创建 `src/book/model/book-types.mjs`，只导出空对象以便文档化：

```js
/**
 * @typedef {Object} BookEntry
 * @property {string} id
 * @property {"blog"|"life"|string} collection
 * @property {string} title
 * @property {Date} date
 * @property {string} body
 * @property {"markdown"|"html"} bodyType
 * @property {Record<string, unknown>} metadata
 */

/**
 * @typedef {Object} BookDocument
 * @property {string} id
 * @property {string} title
 * @property {string} tocTitle
 * @property {BookEntry[]} entries
 */

export {};
```

创建 `src/book/sources/astro-blog-source.mjs`：

```js
import "../model/book-types.mjs";

export function getPostDate(post) {
  return post.data.pubDatetime ?? post.data.date;
}

export function getBookEntryDate(entry) {
  return entry.date;
}

function toEntry(post, collection) {
  return {
    id: post.id,
    collection,
    title: post.data.title,
    date: getPostDate(post),
    body: post.body || "",
    bodyType: "markdown",
    metadata: post.data,
  };
}

export function createAstroBlogDocument({ lifePosts, blogPosts }) {
  const entries = [
    ...lifePosts.filter((post) => !post.data.draft).map((post) => toEntry(post, "life")),
    ...blogPosts.filter((post) => !post.data.draft).map((post) => toEntry(post, "blog")),
  ].sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return {
    id: "zhimin-blog",
    title: "Zhimin 的博客书",
    tocTitle: "目录",
    entries,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/book-runtime.test.mjs
```

预期：PASS。

## 任务 2：实现 runtime assembler

**文件：**
- 创建：`src/book/assembler/build-book-runtime.mjs`
- 修改：`test/book-runtime.test.mjs`

- [ ] **步骤 1：编写失败测试**

在 `test/book-runtime.test.mjs` 中追加：

```js
import { buildBookRuntime } from "../src/book/assembler/build-book-runtime.mjs";

test("buildBookRuntime renders entries and creates toc/runtime config", () => {
  const bookConfig = {
    book: {
      turn: { startPage: 7, totalPages: 112 },
    },
  };
  const document = {
    id: "sample",
    title: "Sample",
    tocTitle: "目录",
    entries: [
      {
        id: "entry-1",
        collection: "blog",
        title: "Entry One",
        date: new Date("2026-06-30T00:00:00Z"),
        body: "# Entry One\n\nBody",
        bodyType: "markdown",
        metadata: {},
      },
    ],
  };

  const runtime = buildBookRuntime({
    document,
    bookConfig,
    renderMarkdown: (markdown) => `<p>${markdown}</p>`,
    stripLeadingTitle: (markdown) => markdown.replace(/^# Entry One\n\n/, ""),
    formatDate: () => "2026/06/30",
  });

  assert.equal(runtime.document.id, "sample");
  assert.equal(runtime.articles[0].title, "Entry One");
  assert.equal(runtime.articles[0].dateStr, "2026/06/30");
  assert.equal(runtime.articles[0].bodyHTML, "<p>Body</p>");
  assert.match(runtime.toc, /<div class="table-contents">/);
  assert.match(runtime.toc, /Entry One/);
  assert.equal(runtime.config.book.turn.startPage, 7);
  assert.equal(runtime.config.book.turn.backPage, runtime.config.book.turn.totalPages - 1);
  assert.equal(runtime.config.source.documentId, "sample");
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/book-runtime.test.mjs
```

预期：FAIL，报错无法找到 `build-book-runtime.mjs`。

- [ ] **步骤 3：实现 assembler**

创建 `src/book/assembler/build-book-runtime.mjs`：

```js
import "../model/book-types.mjs";

export function defaultFormatDate(date) {
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function buildToc({ articles, tocTitle = "目录", romanPage = "v" }) {
  return `<div class="table-contents"><h1>${tocTitle}</h1><ul>` +
    articles.map((article, index) =>
      `<li><a href="#page/${7 + index}">${article.title} <span>${1 + index}</span></a></li>`
    ).join("") +
    `</ul></div><span class="page-number">${romanPage}</span>`;
}

export function buildBookRuntime({
  document,
  bookConfig,
  renderMarkdown,
  stripLeadingTitle,
  formatDate = defaultFormatDate,
  romanTocPage = () => "v",
}) {
  const articles = document.entries.map((entry) => {
    const body = stripLeadingTitle(entry.body || "", entry.title);
    return {
      title: entry.title,
      dateStr: formatDate(entry.date),
      bodyHTML: entry.bodyType === "html" ? body : renderMarkdown(body),
      source: {
        id: entry.id,
        collection: entry.collection,
      },
    };
  });

  const toc = buildToc({
    articles,
    tocTitle: document.tocTitle,
    romanPage: romanTocPage(5),
  });

  const estPages = 7 + articles.length * 3 + 2;
  const config = JSON.parse(JSON.stringify(bookConfig));
  config.book.turn.startPage = 7;
  config.book.turn.totalPages = estPages;
  config.book.turn.backPage = config.book.turn.totalPages - 1;
  config.articles = articles;
  config.toc = toc;
  config.source = {
    documentId: document.id,
    documentTitle: document.title,
    entryCount: document.entries.length,
  };

  return {
    document,
    articles,
    toc,
    config,
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/book-runtime.test.mjs
```

预期：PASS。

## 任务 3：让首页使用 Book Runtime

**文件：**
- 修改：`src/pages/index.astro`
- 修改：`test/homepage-render.test.mjs`

- [ ] **步骤 1：编写失败测试**

在 `test/homepage-render.test.mjs` 的 `homepage serializes dynamic book config and content pages` 测试中追加：

```js
assert.equal(config.source.documentId, "zhimin-blog");
assert.equal(config.source.documentTitle, config.footer.content.copyright);
assert.equal(config.source.entryCount, articles.length);
```

- [ ] **步骤 2：运行构建和测试验证失败**

运行：

```bash
npm run build && node --test test/homepage-render.test.mjs
```

预期：FAIL，`config.source` 为 `undefined`。

- [ ] **步骤 3：修改首页调用新模块**

修改 `src/pages/index.astro`：

```js
import { createAstroBlogDocument } from "../book/sources/astro-blog-source.mjs";
import { buildBookRuntime } from "../book/assembler/build-book-runtime.mjs";
```

用以下逻辑替换原来的 `lifePosts`、`blogPosts`、`allPosts`、`articles`、`toc`、`runConfig` 组装：

```js
const lifePosts = await getCollection("life");
const blogPosts = await getCollection("blog");
const bookDocument = createAstroBlogDocument({ lifePosts, blogPosts });
const runtime = buildBookRuntime({
  document: bookDocument,
  bookConfig,
  renderMarkdown,
  stripLeadingTitle,
  romanTocPage,
});
const articles = runtime.articles;
const toc = runtime.toc;
const runConfig = runtime.config;
```

保留后续 `backPage`、`totalPages`、`nav`、`footer`、DOM 和 CSS 注入逻辑不变。

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
npm run build && node --test test/homepage-render.test.mjs test/book-runtime.test.mjs
```

预期：PASS。

## 任务 4：完整验证与提交

**文件：**
- 修改：`src/book/**`
- 修改：`src/pages/index.astro`
- 修改：`test/book-runtime.test.mjs`
- 修改：`test/homepage-render.test.mjs`

- [ ] **步骤 1：运行完整验证**

运行：

```bash
git diff --check
node --test test/*.test.*
npm run build
```

预期：

```text
diff check 无输出
34+ tests pass
build complete
```

- [ ] **步骤 2：检查变更范围**

运行：

```bash
git status --short
git diff --stat
```

预期只包含本阶段相关文件，以及先前已有但未纳入本提交的文档改动。

- [ ] **步骤 3：Commit 阶段 1**

只提交本阶段文件：

```bash
git add src/book src/pages/index.astro test/book-runtime.test.mjs test/homepage-render.test.mjs docs/superpowers/plans/2026-07-01-book-runtime-stage-1.md
git commit -m "refactor: extract book runtime assembly"
```

不提交：

```text
README.md
docs/ios-shortcuts-image-publishing.md
```

它们属于前一个 iOS 图片教程工作。
