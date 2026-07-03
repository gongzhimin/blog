# Book Runtime Interface

这份文档定义书本运行时的稳定边界。目标是让书本界面不只服务博客 Markdown，也能服务独立书稿、作品集、说明书或任何可以转换为 `BookDocument` 的内容源。

## Runtime Pipeline

```text
Content Source
  -> BookDocument
  -> buildBookRuntime()
  -> BookShell
  -> window.BookRuntime
  -> Turn.js
```

这条链路里，只有最左侧的 `Content Source` 应该关心内容来自哪里。后面的 assembler、Astro 组件和浏览器运行时只关心统一的数据结构。

## BookDocument

`BookDocument` 是服务端构建阶段的输入模型，定义在 `src/book/model/book-types.mjs`。

```js
/**
 * @typedef {Object} BookDocument
 * @property {string} id
 * @property {string} title
 * @property {string} tocTitle
 * @property {BookEntry[]} entries
 */
```

每个 `BookEntry` 至少包含：

```js
{
  id: "entry-id",
  collection: "life",
  title: "文章标题",
  date: new Date("2026-07-04"),
  body: "Markdown 或 HTML 正文",
  bodyType: "markdown",
  metadata: {}
}
```

`bodyType` 目前支持：

- `markdown`：交给 `src/book/renderers/markdown-renderer.mjs` 渲染。
- `html`：视为已经渲染好的 HTML，直接进入书页分页。

## Current Sources

Astro Blog Source

`src/book/sources/astro-blog-source.mjs` 把 Astro content collections 中的生活文章和技术文章转换为同一个 `BookDocument`。这是当前首页使用的内容源。

JSON Book Source

`src/book/sources/json-book-source.mjs` 把普通 JSON 转换为 `BookDocument`。这是 `/demos/book-runtime/` 使用的内容源，也是后续独立书稿、作品集或非博客内容的推荐接入方式。

## Assembler Boundary

`src/book/assembler/build-book-runtime.mjs` 负责把 `BookDocument` 转成浏览器运行时需要的数据：

- `articles`：文章标题、日期、正文 HTML、来源元数据。
- `toc`：目录页 HTML。
- `config`：合并后的书本配置、分页尺寸、Turn.js 页码信息。

调用形式：

```js
const runtime = buildBookRuntime({
  document,
  bookConfig,
  renderMarkdown,
  stripLeadingTitle,
});
```

`buildBookRuntime()` 不应该知道内容来自 Astro、JSON、数据库还是远程 API。新的内容源只需要产出 `BookDocument`。

## BookShell Boundary

`src/book/components/BookShell.astro` 是视觉和运行时挂载边界。它接收构建好的 runtime config，并加载浏览器运行时脚本：

```text
paginator-core.js
paginator-splitters.js
paginator.js
orchestrator.js
turnjs-adapter.js
book-app.js
```

`BookShell` 不应该直接读取 Markdown 文件，也不应该直接知道博客 collection 的存在。

## Browser Runtime Boundary

浏览器侧统一挂在 `window.BookRuntime`：

```text
window.BookRuntime.PaginatorCore
window.BookRuntime.PaginatorSplitters
window.BookRuntime.Paginator
window.BookRuntime.Orchestrator
window.BookRuntime.TurnAdapter
```

Turn.js 只通过 `TurnAdapter` 接入。不要直接魔改 `public/vendor/turnjs/`，也不要让业务代码绕过 `TurnAdapter` 直接调用 Turn.js 私有行为。

## Adding A New Content Source

新增内容源时只做三件事：

1. 在 `src/book/sources/` 创建一个 source 文件。
2. 把外部内容转换为 `BookDocument`。
3. 在页面或 demo 中调用 `buildBookRuntime()`。

不需要修改：

- `BookShell`
- `window.BookRuntime`
- Turn.js vendor 文件
- 分页器拆分策略

如果新内容需要特殊视觉风格，应新增主题或配置，而不是把内容来源判断写进分页器。
