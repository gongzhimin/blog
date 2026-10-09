---
id: 'book-runtime-docs-tutorials-getting-started'
type: 'tutorial'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-runtime'
owner: 'Book Runtime 模块维护者'
parent: 'packages/book-runtime/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/book-runtime/docs/reference/api.md'
---

# 使用 Book Runtime 分页

目录：

- [学习目标](#学习目标)
- [准备环境](#准备环境)
- [练习输入](#练习输入)
- [练习步骤](#练习步骤)
- [预期结果](#预期结果)
- [排错与清理](#排错与清理)
- [后续阅读](#后续阅读)

## 学习目标

在 Node.js 的 JSDOM 环境中调用包根唯一任务接口 `paginateBook(payload)`，观察成功页面、文章导航映射和结构化失败诊断。这个练习验证接口编排，不验证真实浏览器的字体、换行或页面几何。

## 准备环境

- 在 `blog/` 仓库根目录执行命令。
- Node.js 版本满足 22.13+ 或 24+，并已执行 `npm ci`。
- 本练习只使用内存 DOM，不启动服务、不访问网络、不写入文件。

## 练习输入

传入 Book Build 兼容的运行载荷。示例提供一篇带唯一 `key` 的文章，以及正文和目录测量尺寸。生产页面还需由 BookShell 提供测量 CSS，并确保字体和主题样式就绪。

## 练习步骤

在 `blog/` 根目录运行：

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
window.MEASURE_CSS = { article: '', toc: '' };

const { paginateBook } = await import('@myblog/book-runtime');
const result = paginateBook({
  articles: [{
    key: 'chapter-1',
    title: '离线练习篇目',
    dateStr: '2026/10/06',
    bodyHTML: '<p>正文包含<strong>加粗内容</strong>。</p>',
  }],
  toc: '<div class="table-contents"><h1>目录</h1></div>',
  runtime: {
    pagination: {
      articleWidth: 280,
      articleHeight: 380,
      tocWidth: 280,
      tocHeight: 380,
    },
  },
  book: { mobileBreakpoint: 800 },
  source: { tocTitle: '目录' },
});

assert.equal(result.ok, true);
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
assert.equal(result.value.pages.length, 6);
assert.equal(result.value.totalPages, 8);
assert.equal(result.value.bodyStart, 6);
assert.equal(
  result.value.articleToPage['chapter-1'],
  result.value.bodyStart,
);
assert.match(result.value.pages.map((page) => page.html).join(''), /加粗内容/);
assert.equal(document.querySelector('#__bap_inner'), null);
console.log(`分页成功：${result.value.pages.length} 页，正文起页 ${result.value.bodyStart}`);

const invalid = paginateBook({});
assert.equal(invalid.ok, false);
assert.equal(invalid.diagnostics[0].code, 'BOOK_RUNTIME_PAGINATION_FAILED');
assert.equal(invalid.diagnostics[0].phase, 'paginate');
assert.equal('value' in invalid, false);
console.log(`输入失败：${invalid.diagnostics[0].code}`);
dom.window.close();
NODE
```

该函数负责选择桌面/移动测量配置、执行整本分页与目录校准，并返回页面和映射。调用方不分别配置分页器、创建缓存或自行计算正文起页。

## 预期结果

- 第一行输出 `分页成功：6 页，正文起页 6`。六项 HTML 对应物理页 3–8；整本物理页数为 8，不等于页数组长度。
- `articleToPage['chapter-1']` 与 `bodyStart` 相同。
- 页面 HTML 保留示例正文内容。
- 第二行输出 `输入失败：BOOK_RUNTIME_PAGINATION_FAILED`。故障输入 `{}` 返回 `ok: false`，phase 为 `paginate`，没有 `value`；这是主动执行的失败路径，不是从成功输出推断。

这些页数只适用于本教程的固定 JSDOM 输入。JSDOM 不执行真实 CSS 排版，因此结果不能证明页面不溢出。浏览器几何和导航需运行 `npm run test:e2e`。

## 排错与清理

- `Cannot find package 'jsdom'`：在项目根执行 `npm ci`。
- `ERR_MODULE_NOT_FOUND`：确认当前目录为 `blog/`，且 workspace 依赖已安装。
- `ok: false`：查看 `diagnostics` 中的 `code`、`phase`、`message`，修正输入或测量环境后重跑。
- JSDOM 关闭会销毁本练习的内存 DOM；无需恢复文件或删除目录。

## 后续阅读

- [公共接口参考](../reference/api.md)：完整输入、输出和失败契约。
- [分页算法](../algorithms/pagination.md)：页轴、导航映射与目录收敛条件。
- [模块设计说明](../explanation/design.md)：组件边界和运行过程。
- [模块测试方案](../testing/strategy.md)：离线测试与浏览器验收范围。
