---
id: 'book-runtime-docs-reference-api'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-runtime'
owner: 'Book Runtime 模块维护者'
parent: 'packages/book-runtime/README.md'
related:
  - 'packages/book-runtime/src/api/index.mjs'
---

# Book Runtime API 参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

`@myblog/book-runtime` 是本包唯一导入路径，只导出 `paginateBook(payload)`。该函数把 Book Build 的运行载荷分页为物理页和文章映射。Astro 书壳、vendor 资源、页面启动和光标属于 Site，由 Site 自有组件与脚本组合；它们不是 Runtime API。

## 接口清单

| 导入路径               | 成员                    | 运行环境   | 任务                   |
| ---------------------- | ----------------------- | ---------- | ---------------------- |
| `@myblog/book-runtime` | `paginateBook(payload)` | 浏览器 DOM | 整本测量分页与导航映射 |

`Paginator` 和 `Orchestrator` 是内部实现命名空间，不属于 package exports，不承诺跨版本稳定。TurnAdapter 属于 Site；消费者不得通过全局变量访问 Runtime 私有成员。

## 输入与配置

### `paginateBook(payload)`

**签名**：`paginateBook(payload: BookRuntimePayload): Result<BookPagination>`

| 字段                       | 类型                       | 必填 | 用途                                                                    |
| -------------------------- | -------------------------- | ---- | ----------------------------------------------------------------------- |
| `articles`                 | `Article[]`                | 是   | Book Build 渲染的 HTML 文章，包含 `key`、`title`、`dateStr`、`bodyHTML` |
| `toc`                      | `string`                   | 否   | 初始目录 HTML；缺省按空字符串处理，分页时会按文章重建链接               |
| `runtime.pagination`       | `PaginationConfig`         | 是   | 桌面正文/目录测量宽高，单位 CSS px                                      |
| `runtime.mobilePagination` | `PaginationConfig \| null` | 否   | 可用时在视口宽度小于断点时选择                                          |
| `book.mobileBreakpoint`    | `number`                   | 否   | 移动布局断点，单位 CSS px；缺省 800                                     |
| `book.coverSprite`         | `object`                   | 否   | 内部缓存生成封面相关页面使用的受信配置                                  |
| `source.tocTitle`          | `string`                   | 否   | 目录标题，缺省“目录”                                                    |
| `source.documentTitle`     | `string`                   | 否   | 页面标题元数据，缺省空字符串                                            |
| `footer.content.author`    | `string`                   | 否   | 封底/版权页作者，缺省“志民”                                             |

`PaginationConfig` 的四个尺寸字段单位为 CSS px；必须与实际显示尺寸相符。显式 CSS 优先；空字符串会清空旧样式，即使宿主有 MEASURE_CSS。只有未提供（undefined/null）时才使用宿主样式，宿主也未提供时用空字符串。函数要求导入前存在 window 和 document.body。声明见 [index.d.ts](../../src/api/index.d.ts)。

## 输出与副作用

返回判别联合：

```ts
type Result<T> =
  { ok: true; value: T } | { ok: false; diagnostics: Diagnostic[] };
```

成功的 `BookPagination` 字段：

| 字段            | 类型                                            | 含义                                         |
| --------------- | ----------------------------------------------- | -------------------------------------------- |
| `totalPages`    | `number`                                        | 最后一页的物理页号                           |
| `backPage`      | `number`                                        | 封底所在物理页号                             |
| `articleStart`  | `number`                                        | 第一篇文章物理页号                           |
| `bodyStart`     | `number`                                        | 正文区第一物理页号；应与 `articleStart` 一致 |
| `pages`         | `Array<{ physicalPage: number, html: string }>` | 按物理页升序输出的页面内容                   |
| `articleToPage` | `Record<string, number>`                        | 文章 key 到物理起始页的映射副本              |
| `pageToArticle` | `Record<number, string>`                        | 正文物理页到文章 key 的映射副本              |

分页同步完成。函数会创建并清理临时测量 DOM；校准所需的样式可能写入当前文档 head，页面由调用方继续使用。返回页数组和映射为新对象，不暴露可变内部缓存。

## 错误与边界

预期失败统一为 `{ ok: false, diagnostics }`，诊断字段是 `code`、`phase`、`message`。当前 code 为 `BOOK_RUNTIME_PAGINATION_FAILED`，phase 为 `paginate`；消息保留实际错误说明。

- 缺少 `articles` 数组或 `runtime.pagination` 会返回诊断，不抛给调用者。
- DOM 测量错误、目录校准循环或超过 8 轮不收敛不会返回部分导航映射；调用方不应使用失败时的旧页面作为成功结果。
- 页 key 的短哈希目前没有碰撞拒绝保证；重复 key 会导致映射覆盖。调用前需保证 key 唯一。
- 不等待未就绪图片；字体由 Astro bootstrap 在启动前等待，但独立调用方须自行确保字体和 CSS 就绪。
- 测量成功不证明超高不可拆分元素不会溢出；JSDOM 不验证真实字体布局。

## 兼容与示例

以下离线示例在 `blog/` 根执行。JSDOM 能证明入口编排和 DOM 清理，不能证明真实分页几何：

```js
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
window.MEASURE_CSS = { article: '', toc: '' };

const { paginateBook } = await import('@myblog/book-runtime');
const result = paginateBook({
  articles: [
    {
      key: 'chapter-1',
      title: '第一章',
      dateStr: '2026/10/06',
      bodyHTML: '<p>正文</p>',
    },
  ],
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
assert.equal(result.value.articleToPage['chapter-1'], result.value.bodyStart);
dom.window.close();
```

Site 浏览器启动脚本先导入 `@myblog/book-runtime` 初始化算法，再调用 `paginateBook` 并交给 Turn.js 适配器。调用方不再导入 Runtime 内部文件或 Astro 子路径。

## 验证与关联

```sh
npm run --workspace @myblog/book-runtime test
npm run build
npm run test:e2e
```

Node/JSDOM 用例覆盖 payload、映射和诊断；E2E 覆盖真实 DOM 几何与导航。页码拓扑和校准依据见[分页算法](../algorithms/pagination.md)与[模块设计](../explanation/design.md)。
