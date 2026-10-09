---
id: 'src-book-docs-reference-api'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-08'
scope: 'book-build'
owner: 'Book Build 维护者'
parent: 'packages/book-build/README.md'
related:
  - 'packages/book-build/src/api/index.mjs'
  - 'packages/book-build/src/api/index.d.ts'
  - 'packages/book-build/package.json'
---

# Book Build API 参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

本包只开放 `@myblog/book-build` 一个导入路径。默认任务 `buildBook` 接收一本书和配置，内部完成校验、正文转换、目录生成和 Runtime 载荷组装。两个辅助任务也从同一入口导入：`renderArticle` 转换文章正文，`createBookTheme` 把 Site 提供的 CSS 字符串转换为显示和测量样式。

Node 任务要求 Node `^22.13.0 || >=24`。Astro 书壳归 Site；Book Build 不向调用者暴露组件或子路径。配置 Schema 是包内校验资源，不是单独的导入入口。

## 接口清单

| 导入路径             | 成员                                | 用途                                                 |
| -------------------- | ----------------------------------- | ---------------------------------------------------- |
| `@myblog/book-build` | `buildBook(input)`                  | 默认任务：生成一本书的初始运行载荷                   |
| `@myblog/book-build` | `renderArticle(input)`              | 去掉重复标题并渲染一篇 Markdown 文章                 |
| `@myblog/book-build` | `createBookTheme(themeId, sources)` | 转换 Site 提供的 CSS 字符串，生成显示 CSS 与测量 CSS |

包根还导出 `BookDocument`、`BookConfig` 等类型。`src/internal/`、Schema 文件和 Site 的 Astro 组件不是可导入 API；包 `exports` 仅允许 `.`。

## 输入与配置

### `buildBook(input)`

**签名**：`buildBook(input: BuildBookInput): Result<BookRuntime>`

| 参数    | 字段       | 类型           | 必填 | 作用与限制                                            |
| ------- | ---------- | -------------- | ---- | ----------------------------------------------------- |
| `input` | `document` | `BookDocument` | 是   | 需要转换的书籍模型，结构见下表                        |
| `input` | `config`   | `BookConfig`   | 是   | Book 配置；使用权威 Schema 校验，不在调用者侧另行校验 |

BookConfig 的可选 `book.coverSprite.positions.titlePage` 定义扉页插画的 CSS background-position，必须为非空字符串；它与 `backgroundSize` 使用同一尺度。显示样式由 Site 消费，缺省时兼容使用 `backInside`，不改变本包输出字段。当前 Site 将扉页与封底内侧切片分别指定；字段及实例值见生成配置参考。

`BookDocument` 字段：

| 字段           | 类型                      | 含义               |
| -------------- | ------------------------- | ------------------ |
| `id`           | `string`                  | 书籍身份           |
| `title`        | `string`                  | 书名               |
| `tocTitle`     | `string`                  | 目录标题           |
| `description?` | `string`                  | 可选说明           |
| `metadata?`    | `Record<string, unknown>` | 可选来源元数据     |
| `entries`      | `BookEntry[]`             | 按此顺序生成的文章 |

每个 `BookEntry` 含 `id`、`collection`、`title`、`date: Date`、`body`、`bodyType: 'markdown' | 'html'` 和 `metadata`。`date` 是日期对象；Markdown 正文按受信内容渲染，HTML 正文直接进入输出。类型声明位于 [`types.d.ts`](../../src/api/types.d.ts)。

最小示例：

```js
import { buildBook } from '@myblog/book-build';

const result = buildBook({ document, config });
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
console.log(result.value.articles.length);
```

### `renderArticle(input)`

| 参数    | 类型     | 必填 | 作用                                                 |
| ------- | -------- | ---- | ---------------------------------------------------- |
| `body`  | `string` | 是   | Markdown 正文；空字符串得到空渲染结果                |
| `title` | `string` | 是   | 用于移除正文开头重复的同名标题；不匹配时正文标题保留 |

返回 HTML 字符串。仅用于受信文章正文，不净化 HTML。根路径图片可能触发当前工作目录下 `public/` 文件的尺寸读取；没有网络请求、文件写入或 DOM 操作。

### `createBookTheme(themeId, sources)`

| 参数                       | 类型                  | 必填                | 作用                                                                         |
| -------------------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------- |
| `themeId`                  | `string \| undefined` | 是                  | 内置主题标识；传 `undefined` 时默认 `classic-paper`，支持 `plain-manuscript` |
| `sources.fontsCSS`         | `string`              | 是                  | 字体 CSS；直接进入显示样式                                                   |
| `sources.bookContentCSS`   | `string`              | 是                  | 正文 CSS；选择器会转换为测量容器选择器                                       |
| `sources.codeHighlightCSS` | `string`              | 是                  | 代码高亮 CSS；进入显示与正文测量样式                                         |
| `sources.bookTocCSS`       | `string`              | 是                  | 目录 CSS；选择器会转换为目录测量选择器                                       |
| `sources.surfaceCSS`       | `string`              | 仅 plain-manuscript | 手稿主题页面表面 CSS                                                         |
| `sources.katexCSS`         | `string`              | 否                  | KaTeX CSS；未提供时按空字符串处理                                            |

返回主题 ID、显示用 `styles`、分页测量用 `measurement` CSS。函数只转换传入字符串，不读文件、不访问网络、不操作 DOM。

- `sources` 必须为非 null、非数组的对象；必填 CSS 缺失或非字符串时抛出 `TypeError`。
- `katexCSS` 省略时默认为空字符串；提供非字符串值时抛出 `TypeError`。
- 未知主题（包括原型属性名）抛出 `Error`，仅接受内置主题自身定义的 ID。

Site 通过 Vite `?raw` 导入主题资源，再调用此函数；包本身不决定 CSS 文件位置。

## 输出与副作用

`buildBook` 同步返回 `Result<BookRuntime>`：

| 分支 | 字段             | 含义                                                                |
| ---- | ---------------- | ------------------------------------------------------------------- |
| 成功 | `ok: true`       | 表示校验与载荷组装完成                                              |
| 成功 | `value.document` | 输入 `document` 的同一引用                                          |
| 成功 | `value.articles` | 渲染后的文章列表，每项含标题、日期文本、HTML、导航 key 和来源       |
| 成功 | `value.toc`      | 目录 HTML                                                           |
| 成功 | `value.config`   | 配置的 JSON 副本，带 Runtime 估算页码、分页测量配置、文章及来源数据 |
| 失败 | `ok: false`      | 表示任务未生成可用载荷                                              |
| 失败 | `diagnostics[]`  | 含稳定 `code`、`phase` 和人类可读 `message`                         |

调用会渲染 Markdown；本地图片尺寸处理可能读取当前工作目录下的 `public/` 文件。函数不请求网络、不操作 DOM、不写文件。配置是 JSON 副本；`document` 和其嵌套数据仍与输入共享引用。初始总页数是估算值，不能当作浏览器分页后的结果。

成功的 value.config 类型为 BookRuntimeConfig，而不是原始 BookConfig：它额外保证 articles、toc、runtime.pagination/mobilePagination 与 source。该值可直接传给 paginateBook；正反编译夹具验证 Build→Runtime 和 Site→Runtime 的交接，不依赖 any 绕过类型检查。

## 错误与边界

| 诊断 code             | phase      | 触发条件                              | 调用者处理                               |
| --------------------- | ---------- | ------------------------------------- | ---------------------------------------- |
| `BOOK_CONFIG_INVALID` | `validate` | 配置不符合 Book Schema                | 修正配置后重新调用；诊断消息包含字段路径 |
| `BOOK_BUILD_FAILED`   | `build`    | 正文回调/渲染、数据访问或载荷组装异常 | 检查输入和错误消息；本函数不重试         |

文章导航 key 来自有限宽度哈希，当前没有冲突检测；不能声称任意输入下导航唯一。HTML 和 Markdown 不做安全净化，仅处理受信内容。失败时不返回部分载荷。

## 兼容与示例

包根 `@myblog/book-build` 是唯一导入路径；三项任务各自定义输入，不要求调用方调用低层转换步骤。不要导入 `src/internal/`、Schema 或其他包内路径。变更输入/输出字段时，同步更新类型、Book Schema、Site 调用者、契约测试和本页。

Astro/Vite 示例与资源组合见 [模块 README](../../README.md)；首次运行步骤见[教程](../tutorials/getting-started.md)。配置字段见[生成配置参考](book-config.generated.md)。

## 验证与关联

```sh
npm run --workspace @myblog/book-build test
npm run check:contracts
npm run check:docs
```

测试覆盖结果判别、Schema 错误和载荷输出；这些 Node 测试不证明真实浏览器分页或导航映射。相关设计见[模块设计](../explanation/design.md)，算法细节见[组装算法](../algorithms/runtime-assembly.md)，跨包数据结构见[Runtime 契约](../../../../docs/reference/book-runtime-contract.md)。
