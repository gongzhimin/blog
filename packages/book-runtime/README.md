---
id: 'book-runtime-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
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

在浏览器把 Book Build 提供的文章 HTML 切成页面，建立目录与文章起页映射，再接入 Turn.js。输入是 BookShell 的 `#book-data`；输出是 HTML 页缓存与阅读交互。

不读取 Astro 集合，不渲染 Markdown，不管理发布。

## 能力与限制

提供正文与目录分页、文本/列表/表格/代码块分割、目录点击、URL 定位、键盘及触摸。包根只提供 `paginateBook(payload)`，一次配置测量并完成整本分页，返回物理页和文章映射。物理页用于 Turn.js，显示页是正文数字或目录罗马数字，不能互换。分页同步执行，没有字体/图片统一就绪屏障或自动缓存失效。超高不可拆分元素仍可能溢出。

Runtime 包只处理浏览器分页与 Turn.js 适配，不负责 Astro 页面、应用启动和光标样式。Site 浏览器入口先导入 Runtime 包根，再启动本地 `book-app.js`；Runtime 不导出 Astro 组件，也不提供独立 destroy 生命周期。

## 内部结构

core 维护共享测量配置，splitters 提供元素分割策略，paginator 组合策略；orchestrator 管理全书页轴，adapter 隔离第三方交互，app 负责启动。

```text
packages/book-runtime/src/
  api/index.mjs              唯一包根入口与分页函数 paginateBook
  internal/paginator-core.js 配置和临时测量 DOM
  internal/paginator-splitters.js 富文本分割
  internal/paginator.js      正文与目录分页
  internal/orchestrator.js   缓存、映射与封底
  internal/turnjs-adapter.js  第三方交互适配
  tests/                    分页、编排和适配器测试
  docs/                     设计、算法、API、操作与测试
```

## 依赖与数据流

```text
Book Build payload -> API/browser bootstrap
                           |
                 Paginator + Splitters
                           | HTML pages
                    Orchestrator cache
                           | physical pages
                  TurnAdapter -> Turn.js
```

Site 的 `BookShell.astro` 输出 DOM 和 `window.MEASURE_CSS`；Site 的 `BookRuntimeAssets.astro` 加载 `public/vendor` 并导入 Runtime 根 API。页面启动和 CursorDot 也由 Site 持有。

包只有 `@myblog/book-runtime` 一个导入路径。`paginateBook` 是唯一任务函数；Site 的资源组件和页面启动脚本不是 Runtime 的公开入口。

## 主要接口

| 导入路径               | 函数                    | 输入                                      | 输出                                                        |
| ---------------------- | ----------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `@myblog/book-runtime` | `paginateBook(payload)` | 浏览器 DOM、Book Build 载荷、主题测量 CSS | `Result<BookPagination>`：页 HTML、物理页轴、文章映射或诊断 |

- 内部目录校准最多 8 轮；循环或未稳定时 `paginateBook` 返回失败诊断，不交付新导航结果；
- 输入 key 冲突仍未检测。完整条件见 [接口](docs/reference/api.md)。

## 最小使用示例

在 blog 根、Node 22.13+ 或 24+ 且已安装依赖时，可直接运行以下离线示例。JSDOM 提供 window 和 document.body，只证明本夹具的正常 DOM 路径，不测量真实字体高度：

```sh
node --input-type=module <<'NODE'
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
console.log(result.value.pages.length, document.querySelector('#__bap_inner') === null);
dom.window.close();
NODE
```

预期输出页数和 `true`，表示分页完成且临时测量节点已清理。JSDOM 不提供真实字体几何；浏览器阅读器由 Astro Assets 入口集成。

[离线练习](docs/tutorials/getting-started.md) 给出完整断言及其限制。

## 配置

Book Build payload 提供桌面与移动分页几何；`paginateBook` 根据窗口宽度选择适用配置，并从 BookShell 注入 `MEASURE_CSS`。CSS px、字体、边距与显示页须协调。配置仍是浏览器共享状态，不支持多实例隔离。跨移动断点目前 reload，不是原地重建。

示例尺寸不是主题默认值，参数以 [书籍参考](../../packages/book-build/docs/reference/book-config.generated.md) 为准。

## 测试与验证

在 blog 根运行：

```sh
node --test packages/book-runtime/tests/paginator-config.test.mjs packages/book-runtime/tests/book-app-mobile.test.mjs packages/book-runtime/tests/runtime-lifecycle.test.mjs
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
