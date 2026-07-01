# Book Runtime 阶段 3 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 移除分页器中的文章页和目录页测量尺寸硬编码，让浏览器分页器从 runtime config 读取主题提供的分页尺寸。

**架构：** `book-config.json` 保留当前主题的真实分页尺寸；`buildBookRuntime()` 将 `book.pagination` 映射为 `runtime.pagination`；`book-app.js` 在分页前调用 `PAGINATOR.configure()`；`paginator.js` 维护一份可覆盖的 pagination config，并在测量文章和目录时读取它。

**技术栈：** Astro 6、Node.js ESM、node:test、JSDOM、Node `vm`、现有 Turn.js runtime。

---

## 文件结构

- 创建：`test/paginator-config.test.mjs`
  - 职责：在 JSDOM + VM 中加载 `paginator.js`，验证 `PAGINATOR.configure()` 能覆盖文章和目录测量尺寸。
- 修改：`src/book/assembler/build-book-runtime.mjs`
  - 职责：把 `bookConfig.book.pagination` 映射为浏览器可直接消费的 `config.runtime.pagination`。
- 修改：`src/data/book-config.json`
  - 职责：记录当前真实分页器尺寸，保持现有分页行为稳定。
- 修改：`public/vendor/turnjs/js/paginator.js`
  - 职责：新增 `configure()` 和 `getConfig()`，测量容器尺寸从配置读取。
- 修改：`public/vendor/turnjs/js/book-app.js`
  - 职责：读取 `BOOK_CONFIG.runtime.pagination` 并在 `paginateAll()` 前配置分页器。
- 修改：`test/book-runtime.test.mjs`
  - 职责：验证 runtime config 输出 pagination。
- 修改：`test/homepage-config.test.mjs`
  - 职责：静态断言 `book-app.js` 调用 `PAGINATOR.configure()`，且分页器不再暴露旧的 `ARTICLE_H` 硬编码接口。
- 修改：`test/homepage-render.test.mjs`
  - 职责：验证构建产物中的 `#book-data` 包含 runtime pagination。

## 任务 1：为 runtime pagination 建立测试

**文件：**
- 修改：`test/book-runtime.test.mjs`
- 修改：`test/homepage-render.test.mjs`

- [ ] **步骤 1：编写失败测试**

在 `test/book-runtime.test.mjs` 的 `bookConfig` fixture 中加入：

```js
pagination: {
  contentWidth: 380,
  contentHeight: 471,
  tocWidth: 380,
  tocHeight: 400,
}
```

并在断言中加入：

```js
assert.deepEqual(runtime.config.runtime.pagination, {
  articleWidth: 380,
  articleHeight: 471,
  tocWidth: 380,
  tocHeight: 400,
});
```

在 `test/homepage-render.test.mjs` 的 `"homepage serializes dynamic book config and content pages"` 测试中加入：

```js
assert.deepEqual(config.runtime.pagination, {
  articleWidth: 380,
  articleHeight: 471,
  tocWidth: 380,
  tocHeight: 400,
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/book-runtime.test.mjs test/homepage-render.test.mjs
```

预期：FAIL，`config.runtime` 未定义或缺少 `pagination`。

- [ ] **步骤 3：实现 runtime pagination 映射**

修改 `src/book/assembler/build-book-runtime.mjs`：

```js
const pagination = config.book.pagination || {};
config.runtime = {
  ...(config.runtime || {}),
  pagination: {
    articleWidth: pagination.contentWidth,
    articleHeight: pagination.contentHeight,
    tocWidth: pagination.tocWidth ?? pagination.contentWidth,
    tocHeight: pagination.tocHeight ?? 400,
  },
};
```

修改 `src/data/book-config.json`：

```json
"contentHeight": 471,
"tocWidth": 380,
"tocHeight": 400
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/book-runtime.test.mjs
npm run build
node --test test/homepage-render.test.mjs
```

预期：PASS。

## 任务 2：分页器读取注入尺寸

**文件：**
- 创建：`test/paginator-config.test.mjs`
- 修改：`public/vendor/turnjs/js/paginator.js`
- 修改：`public/vendor/turnjs/js/book-app.js`
- 修改：`test/homepage-config.test.mjs`

- [ ] **步骤 1：编写失败测试**

创建 `test/paginator-config.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { JSDOM } from "jsdom";

async function loadPaginator() {
  const dom = new JSDOM("<!doctype html><body></body>");
  const context = {
    window: dom.window,
    document: dom.window.document,
    MEASURE_CSS: {
      article: "#__bap_inner{font-size:16px;line-height:20px}#__bap_inner p{margin:0}",
      toc: "#__toc{font-size:16px;line-height:20px}#__toc li{margin:0}",
    },
  };
  context.globalThis = context;
  vm.createContext(context);
  const source = await readFile(
    new URL("../public/vendor/turnjs/js/paginator.js", import.meta.url),
    "utf8",
  );
  vm.runInContext(source, context);
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

  assert.deepEqual(context.PAGINATOR.getConfig(), {
    articleWidth: 123,
    articleHeight: 45,
    tocWidth: 234,
    tocHeight: 67,
  });

  context.PAGINATOR.paginateArticle({
    title: "Configured",
    dateStr: "2026/07/01",
    bodyHTML: "<p>one</p><p>two</p>",
  });
  let articleMeasure = context.document.body.lastElementChild;
  assert.equal(articleMeasure, null);

  context.PAGINATOR.paginateTOC(
    '<div class="table-contents"><h1>目录</h1><ul><li>one</li></ul></div>',
  );
  let tocMeasure = context.document.body.lastElementChild;
  assert.equal(tocMeasure, null);
});
```

在 `test/homepage-config.test.mjs` 的 `"homepage consumes book config and the shared turnjs app"` 测试中加入：

```js
assert.match(app, /PAGINATOR\.configure/);
assert.match(app, /BOOK_CONFIG\.runtime\.pagination/);
assert.doesNotMatch(app, /ARTICLE_H/);
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/paginator-config.test.mjs test/homepage-config.test.mjs
```

预期：FAIL，`PAGINATOR.configure` 不存在，`book-app.js` 未调用配置接口。

- [ ] **步骤 3：实现分页器配置接口**

修改 `public/vendor/turnjs/js/paginator.js`：

```js
var paginationConfig = {
  articleWidth: 380,
  articleHeight: 471,
  tocWidth: 380,
  tocHeight: 400
};

function configure(options) {
  options = options || {};
  paginationConfig.articleWidth = options.articleWidth || paginationConfig.articleWidth;
  paginationConfig.articleHeight = options.articleHeight || paginationConfig.articleHeight;
  paginationConfig.tocWidth = options.tocWidth || paginationConfig.tocWidth;
  paginationConfig.tocHeight = options.tocHeight || paginationConfig.tocHeight;
}

function getConfig() {
  return {
    articleWidth: paginationConfig.articleWidth,
    articleHeight: paginationConfig.articleHeight,
    tocWidth: paginationConfig.tocWidth,
    tocHeight: paginationConfig.tocHeight,
  };
}
```

然后：

```js
var maxH = paginationConfig.articleHeight;
var cw = paginationConfig.articleWidth;
```

目录分页：

```js
var maxH = paginationConfig.tocHeight;
var cw = paginationConfig.tocWidth;
```

导出：

```js
return {
  configure: configure,
  getConfig: getConfig,
  paginateArticle: paginateArticle,
  paginateTOC: paginateTOC
};
```

修改 `public/vendor/turnjs/js/book-app.js`：

```js
var PAGINATION_CONFIG = BOOK_CONFIG.runtime && BOOK_CONFIG.runtime.pagination;
if (PAGINATION_CONFIG && PAGINATOR.configure) {
  PAGINATOR.configure(PAGINATION_CONFIG);
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/paginator-config.test.mjs test/homepage-config.test.mjs
```

预期：PASS。

## 任务 3：全量验证并提交阶段 3

**文件：**
- 阶段 3 相关文件

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

- [ ] **步骤 4：只提交阶段 3 文件**

运行：

```bash
git add docs/superpowers/plans/2026-07-01-book-runtime-stage-3.md \
  src/book/assembler/build-book-runtime.mjs \
  src/data/book-config.json \
  public/vendor/turnjs/js/paginator.js \
  public/vendor/turnjs/js/book-app.js \
  test/book-runtime.test.mjs \
  test/homepage-config.test.mjs \
  test/homepage-render.test.mjs \
  test/paginator-config.test.mjs
git commit -m "refactor: configure book paginator dimensions"
```

预期：提交成功，`README.md` 与 `docs/ios-shortcuts-image-publishing.md` 仍保持未提交状态。

## 自检

- 规格覆盖：移除 `paginator.js` 页面尺寸硬编码、runtime config 注入、首页启动前配置分页器、测试和构建验证都有对应任务。
- 占位符扫描：没有执行步骤使用空泛占位。
- 类型一致性：统一使用 `runtime.pagination.articleWidth/articleHeight/tocWidth/tocHeight`。
