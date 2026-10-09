---
id: 'book-runtime-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: 'book-runtime'
owner: 'Book Runtime 模块维护者'
parent: 'packages/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/README.md'
---

# Book Runtime

目录：

- [用途与边界](#用途与边界)
- [能力与限制](#能力与限制)
- [内部结构](#内部结构)
- [依赖与数据流](#依赖与数据流)
- [主要接口](#主要接口)
- [最小使用示例](#最小使用示例)
- [配置](#配置)
- [测试与验证](#测试与验证)
- [文档导航](#文档导航)

## 用途与边界

在浏览器把 Book Build 提供的文章 HTML 切成页面，建立目录与文章起页映射。输入是 `paginateBook(payload)` 的运行载荷；输出是页面 HTML、物理页轴和双向文章映射。

Site 从 BookShell 的 `#book-data` 读取载荷，调用本包，再将结果交给 Site 的 Turn.js 适配器。DOM 数据读取和翻页交互不属于 Runtime。

不读取 Astro 集合，不渲染 Markdown，不管理发布。

## 能力与限制

提供正文与目录分页，以及文本、列表、表格和代码块分割。包根只提供 `paginateBook(payload)`，一次完成配置选择、测量和整本分页。

- 物理页用于宿主装配页面；显示页是正文数字或目录罗马数字，不能互换。
- 目录点击、URL 定位、键盘、触摸和 Turn.js 装配归 Site；Runtime 仅提供这些交互所需的页码映射。
- 分页同步执行，没有字体/图片统一就绪屏障或自动缓存失效。超高不可拆分元素仍可能溢出。

Runtime 包只处理浏览器分页；Turn.js 适配、Astro 页面、启动和光标属于 Site。Site 从包根调用分页，不读取 Runtime 内部缓存或适配器。Runtime 不创建持久交互资源，也不提供 destroy 生命周期。

## 内部结构

core 管理测量配置，splitters 分割元素，paginator 执行测量，orchestrator 校准目录并组装页轴。交互和页面启动在 Site。

```text
packages/book-runtime/
+-- src/
|   +-- api/index.mjs          唯一任务 paginateBook
|   +-- api/index.d.ts         输入、分页结果与诊断类型
|   +-- internal/
|       +-- paginator-core.js 测量配置与临时 DOM
|       +-- paginator-splitters.js  富文本切分
|       +-- paginator.js      正文与目录测量
|       +-- orchestrator.js   页轴、目录校准与映射
+-- tests/                    分页、编排与清理测试
+-- docs/                     设计、算法、API 与测试
```

## 依赖与数据流

```text
Book Build payload -> API/browser bootstrap
                           |
                 Paginator + Splitters
                           | HTML pages
                    Orchestrator cache
                           | physical pages
                 返回页数组与映射 -> Site 适配器 -> Turn.js
```

Site 的 `BookShell.astro` 输出 DOM 和 `window.MEASURE_CSS`；Site 的 `BookRuntimeAssets.astro` 加载 `public/vendor` 并导入 Runtime 根 API。页面启动和 CursorDot 也由 Site 持有。

包只有 `@myblog/book-runtime` 一个导入路径。`paginateBook` 是唯一任务函数；Site 的资源组件和页面启动脚本不是 Runtime 的公开入口。

## 主要接口

| 导入路径               | 函数                    | 输入                                      | 输出                                                        |
| ---------------------- | ----------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `@myblog/book-runtime` | `paginateBook(payload)` | 浏览器 DOM、Book Build 载荷、主题测量 CSS | `Result<BookPagination>`：页 HTML、物理页轴、文章映射或诊断 |

- 内部目录校准最多 8 轮；循环或未稳定时 `paginateBook` 返回失败诊断，不交付新导航结果；
- 重复非空 key 在正文测量前拒绝，返回 `BOOK_RUNTIME_DUPLICATE_KEY`，不交付部分页面或覆盖后的映射。完整条件见 [接口](docs/reference/api.md)。

## 最小使用示例

在 blog 根、Node 22.13+ 或 24+ 且已安装依赖时，可直接运行以下离线示例。JSDOM 提供 window 和 document.body，只证明本夹具的正常 DOM 路径，不测量真实字体高度：

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { paginateBook } = await import('@myblog/book-runtime');
dom.window.MEASURE_CSS = { article: '', toc: '' };
const result = paginateBook({
  articles: [{ key: 'example', title: '示例', dateStr: '2026/10/04', bodyHTML: '<p>第一段正文。</p>' }],
  toc: '<div class="table-contents"><h1>目录</h1></div>',
  runtime: { pagination: { articleWidth: 280, articleHeight: 380, tocWidth: 280, tocHeight: 380 } },
  book: { turn: { totalPages: 12 }, mobileBreakpoint: 800 },
  source: { tocTitle: '目录' },
});
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
assert.equal(result.value.pages.length, 6);
assert.equal(result.value.totalPages, 8);
assert.equal(result.value.bodyStart, 6);
assert.equal(result.value.articleToPage.example, result.value.bodyStart);
assert.equal(document.querySelector('#__bap_inner'), null);
console.log(result.value.pages.length, document.querySelector('#__bap_inner') === null);
dom.window.close();
NODE
```

预期输出 `6 true`。本夹具返回物理页 3–8 的六项 HTML，`totalPages` 为 8；页数组长度不是整本物理页数。正文起页和 `example` 映射均为 6，临时测量节点已清理。

这些数值仅是上述固定 JSDOM 夹具的判据，不是主题默认值。JSDOM 不提供真实字体几何；浏览器阅读器由 Site 的 Astro Assets 入口集成。

[离线练习](docs/tutorials/getting-started.md) 给出完整断言及其限制。

## 配置

Book Build payload 提供桌面与移动分页几何；`paginateBook` 根据窗口宽度选择适用配置，并从 BookShell 注入 `MEASURE_CSS`。CSS px、字体、边距与显示页须协调。配置仍是浏览器共享状态，不支持多实例隔离。跨移动断点目前 reload，不是原地重建。

示例尺寸不是主题默认值，参数以 [书籍参考](../../packages/book-build/docs/reference/book-config.generated.md) 为准。

## 测试与验证

在 blog 根运行：

```sh
node --test packages/book-runtime/tests/paginator-config.test.mjs packages/site/tests/book-app-mobile.test.mjs packages/book-runtime/tests/runtime-lifecycle.test.mjs
npm run build
npm run test:e2e
```

Node 验证配置和启动协议；浏览器验证实际交互、内容连续性及两种宽度高度。通过不证明任意 HTML 无溢出或资源晚到自动重排。[测试方案](docs/testing/strategy.md) 列出现有证据与缺口。

## 文档导航

- [六包协作总览](../README.md)：Runtime 与 Site/Book Build 的数据交接及全链路。

- [模块设计](docs/explanation/design.md)：组成、流程与取舍。
- [分页算法](docs/algorithms/pagination.md)：测量、校准与正确性条件。
- [接口](docs/reference/api.md)：签名、结果、副作用与错误。
- [变更](docs/guides/change.md)：修改与安全恢复。
- [文档索引](docs/README.md)：按任务选择资料。

全局：[系统架构](../../docs/architecture/overview.md)、[跨模块协议](../../docs/reference/book-runtime-contract.md)。
