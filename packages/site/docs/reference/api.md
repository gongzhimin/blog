---
id: 'src-site-docs-reference-interface'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/site/README.md'
related:
  - 'packages/site/docs/explanation/design.md'
  - 'packages/site/src/api/homepage-config.mjs'
---

# Site API 参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

`@myblog/site` 是 Site 唯一导入路径。`buildHomepageModel` 为翻页首页组合模型；`inspectHomepageConfig` 供 Tooling 生成传统首页配置参考。Astro 路由读取集合和文件、装载主题；`buildHomepageModel` 不读盘、不请求网络，也不操作 DOM。

页面和 CLI 在同一包内直接使用 `internal/` 实现；跨包调用只能导入包根，不使用配置子路径。

## 接口清单

| 导入路径       | 导出                            | 调用场景                                   |
| -------------- | ------------------------------- | ------------------------------------------ |
| `@myblog/site` | `buildHomepageModel(input)`     | 组合翻页首页所需数据                       |
| `@myblog/site` | `inspectHomepageConfig(config)` | Tooling 读取传统首页 Schema 并验证当前配置 |

日常页面只调用 `buildHomepageModel`。配置检查是 Tooling 专用任务，不是页面编排的第二步。

## 输入与配置

### `buildHomepageModel(input)`

**签名**：`buildHomepageModel(input: BuildHomepageModelInput): Result<SiteHomepageModel>`

| 字段         | 类型            | 必填 | 用途与限制                                                                                                                                                                                       |
| ------------ | --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lifePosts`  | `AstroPost[]`   | 是   | life 内容集合。`draft: true` 条目先过滤；其余条目必须含有效 `date` 或 `pubDatetime`                                                                                                              |
| `blogPosts`  | `AstroPost[]`   | 是   | blog 内容集合。日期优先用 `pubDatetime`，否则用 `date`；过滤草稿后按日期降序合并                                                                                                                 |
| `bookConfig` | `BookConfig`    | 是   | Book Build 当前配置实例；由 `buildBook` 按其权威 Schema 校验，不在 Site 内复制默认值                                                                                                             |
| `dailyQuote` | `Quote \| null` | 否   | 页面已读取的引语快照；缺失或字段为空时回退到 footer 配置                                                                                                                                         |
| `theme`      | `BookTheme`     | 是   | Site 内部 `loadSiteBookTheme()` 通过 Vite 导入原始 CSS，再调用 `@myblog/book-build` 的 `createBookTheme()`；须含 `runtime`、`styles.visualCSS`、`measurement.articleCSS` 和 `measurement.tocCSS` |

`AstroPost` 的最小字段为 `{ id, body?, data: { title, date?, pubDatetime?, draft? } }`。有效日期是有限值 `Date`。非草稿缺日期或日期无效会失败；草稿不参与日期检查或输出。

### `inspectHomepageConfig(config)`

**签名**：`inspectHomepageConfig(config: object): HomepageConfigInspection`

该函数生成 Draft 2020-12 JSON Schema，并用同一份字段定义验证传入配置。只有 Tooling 的参考生成器需要调用。它不读写配置文件。

## 输出与副作用

`buildHomepageModel` 返回判别联合：

```ts
type Result<T> =
  { ok: true; value: T } | { ok: false; diagnostics: Diagnostic[] };
```

成功值 `SiteHomepageModel` 包含：

| 字段             | 类型                                                   | 含义                                                                       |
| ---------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `document`       | `BookDocument`                                         | 从非草稿集合生成、按日期降序排列的 `zhimin-blog` 文档                      |
| `runConfig`      | `BookRuntime`                                          | Book Build 返回的配置和文章/目录载荷；Site 附加已加载主题的 `runtime` 部分 |
| `homepageStyles` | `string`                                               | 由 BookConfig 和主题生成的翻页首页 CSS                                     |
| `quote`          | `{ english: string, chinese: string, author: string }` | 快照中存在的值；否则回退至 footer 配置                                     |

`inspectHomepageConfig` 成功返回 `{ ok: true, schema }`；失败返回 `{ ok: false, schema, diagnostic }`，Schema 仍可用于定位编辑器字段约束。

函数不执行 I/O。`document.entries` 中的 `Date` 与 `metadata` 保留来源集合引用；`runConfig` 是 Book Build 返回的新配置对象，但 `theme.runtime` 与传入主题共享引用。调用方不得在模型生成后再原地修改这些共享输入。

## 错误与边界

- Astro 集合适配失败返回 `SITE_INPUT_INVALID`，phase 为 `input`。
- Book Build 拒绝配置时原样保留错误 code，并把 phase 前缀为 `book-`；不返回部分页面模型。
- 样式或主题组合抛错时返回 `SITE_MODEL_FAILED`，phase 为 `compose`。
- 所有诊断字段为 `{ code, phase, message }`；该结果表示 Site 模型任务是否成功，不代表 Astro 构建或浏览器分页成功。
- `dailyQuote` 不发起网络请求，也不保证日期是当天；抓取和快照更新由 `update-daily-quote` CLI 处理。
- Site 接受受信仓库 HTML/CSS；不提供任意用户输入净化。

## 兼容与示例

以下示例从仓库根执行，使用内存主题替身，不读写文件、不发网络请求：

```js
import { buildHomepageModel } from '@myblog/site';
import config from './packages/site/src/data/book-config.json' with { type: 'json' };

const result = buildHomepageModel({
  lifePosts: [
    {
      id: 'hello',
      body: '正文',
      data: { title: '你好', date: new Date('2026-01-01T00:00:00Z') },
    },
  ],
  blogPosts: [],
  bookConfig: config,
  dailyQuote: null,
  theme: {
    runtime: { id: 'classic-paper' },
    styles: { visualCSS: '' },
    measurement: { articleCSS: '', tocCSS: '' },
  },
});

if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
console.log(result.value.document.id, result.value.runConfig.articles.length);
```

预期为 `zhimin-blog 1`。这只验证模型组合，不验证真实 Vite 主题、Astro HTML 或浏览器布局。

## 验证与关联

```sh
npm run --workspace @myblog/site test
node --test tests/integration/public-api.test.mjs tests/integration/homepage-render.test.mjs
npm run check:contracts
npm run build
```

`public-api.test.mjs` 固定根导出、成功输出和输入诊断；浏览器布局变化另需 `npm run test:e2e`。页面模型与所有权见 [设计说明](../explanation/design.md)，传统首页字段见[生成配置参考](homepage-config.generated.md)。
