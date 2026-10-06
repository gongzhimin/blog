---
id: 'src-book-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-build'
owner: 'Book Build 维护者'
parent: 'packages/README.md'
related:
  - 'packages/README.md'
  - 'packages/book-build/docs/explanation/design.md'
  - 'packages/book-build/docs/reference/api.md'
---

# Book Build 模块

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

面向 Site 构建集成者，将 `BookDocument` 和 Book 配置转换成文章 HTML、初始目录与浏览器载荷。调用者通过唯一主入口 `buildBook({ document, config })` 完成一次构建，不负责安排校验、渲染和装配步骤。

它不读取 Astro 集合、不决定草稿或排序、不加载浏览器运行组件、不测量最终页数。

## 能力与限制

支持 Markdown 和受信 HTML、公式和代码高亮、图片尺寸补充，以及 classic-paper 与 plain-manuscript 主题样式转换。展示 CSS 资源由 Site 持有；正文 key 可重复生成，来源 id/collection 保留用于追踪。

JSON 来源转换由 Site 持有。HTML 不净化，CRC32 key 可能碰撞；初始目录和总页数只是估计。Book Build 不读取主题文件；Site 导入 CSS 字符串后调用 `createBookTheme()` 派生显示与测量样式。

## 内部结构

```text
packages/book-build/
  package.json               私有 workspace 身份、版本与 exports
  README.md                  模块独立入口
  src/api/index.mjs          唯一包根入口
  src/api/content.mjs        文章正文转换
  src/api/book-theme.mjs     CSS 字符串到主题样式的转换
  src/api/book-config.schema.json 配置校验 Schema
  src/internal/              私有来源、装配、渲染、配置和主题转换算法
  tests/                     JSON 来源与主题单元测试
  docs/                      设计、算法、API、教程、指南与测试方案
```

Astro 书壳、阅读器启动和光标由 Site 组合；Book Build 不导出 `.astro` 组件。跨包只能导入 `@myblog/book-build`，不能导入内部路径。

## 依赖与数据流

```text
Site adapter -> BookDocument -> buildBook -> HTML / 目录 / 浏览器载荷
                                     |
Site page -> createBookTheme -> 主题显示 CSS / 测量 CSS
    |
    +-> Site BookShell -> DOM / JSON
    `-> Site Runtime Assets -> 浏览器调用 Book Runtime
```

图中箭头表示调用或数据交接。Book Build 不导入 Site 或 Runtime。

Site 负责 Astro 标记与资源加载；Book Build 只返回数据结果和 CSS 主题对象。

[跨模块契约](../../docs/reference/book-runtime-contract.md) 列出 DOM、JSON 和全局字段。

## 主要接口

| 导入路径             | 函数                              | 输入                              | 输出与副作用                                |
| -------------------- | --------------------------------- | --------------------------------- | ------------------------------------------- |
| `@myblog/book-build` | `buildBook({ document, config })` | 文稿模型、书籍配置                | `Result<BookRuntime>`；校验、渲染、组装载荷 |
| `@myblog/book-build` | `renderArticle({ body, title })`  | Markdown 正文、文章标题           | 去掉重复首标题后的 HTML                     |
| `@myblog/book-build` | `createBookTheme(id, sources)`    | 主题 ID、显示/测量所需 CSS 字符串 | 主题显示和测量 CSS；纯内存转换，不读文件    |

包只声明 `@myblog/book-build` 一个导入路径。`buildBook` 是默认任务；另外两个函数分别用于文章渲染和主题初始化。完整输入、输出和诊断见 [API 参考](docs/reference/api.md)。

成功结果中的 `config` 是 JSON 克隆；`document` 仍为输入引用。失败以 `diagnostics` 返回，不产生部分载荷。

## 最小使用示例

在 blog 根，Node 22.13+ 或 24+，先 npm ci。下例只在内存组装，读取 Site 拥有的配置实例：

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import config from './packages/site/src/data/book-config.json' with {type:'json'};
import { buildBook } from '@myblog/book-build';
const document = {id:'sample',title:'小书',tocTitle:'目录',entries:[
  {id:'one',collection:'blog',title:'第一章',date:new Date('2026-10-01T00:00:00Z'),
   body:'# 第一章\n\n你好 **世界**。',bodyType:'markdown',metadata:{}}
]};
const result = buildBook({document,config});
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
assert.match(result.value.articles[0].bodyHTML, /<strong>世界<\/strong>/);
assert.equal(result.value.config.book.turn.totalPages,12);
assert.notEqual(result.value.config,config);
console.log(result.value.articles.length,result.value.config.book.turn.totalPages);
NODE
```

输出 1 12。十二页是占位估计，不是浏览器实测。需要组合 Astro 书壳和主题时查 [API 示例](docs/reference/api.md)；完整两章与失败练习见 [教程](docs/tutorials/getting-started.md)。

## 配置

- 配置实例由 Site 持有：`packages/site/src/data/book-config.json`；结构权威是 `src/api/book-config.schema.json`。`buildBook` 自动校验且不补默认值；
- 字段类型/范围见[生成参考](docs/reference/book-config.generated.md)。Site 负责通过 Vite 导入主题 CSS 和 KaTeX CSS，再调用 `createBookTheme()` 生成显示与测量样式；
- Markdown 根路径图片按当前工作目录下的 `public/` 查找尺寸。

## 测试与验证

```sh
npm run --workspace @myblog/book-build test
npm run check:docs
npm run check:boundaries
npm run build
```

Node 断言转换、错误路径、引用隔离、主题选择器及 key 稳定性；不证明真实几何或净化。书壳、字体、布局和图片变化后，先本次 build 再运行 npm run test:e2e。生成来源变化执行 docs:generate。

风险与证据分层见 [测试方案](docs/testing/strategy.md)。

## 文档导航

- [六包协作总览](../README.md)：Book Build 与 Site/Runtime 的交接位置及全链路。

- [设计](docs/explanation/design.md) 解释模型、所有权、失败与取舍；
- [组装算法](docs/algorithms/runtime-assembly.md) 推导 key 和占位页码；
- [API](docs/reference/api.md) 定义调用契约；
- [教程](docs/tutorials/getting-started.md) 提供离线练习；
- [变更指南](docs/guides/change.md) 说明改动和恢复；
- [索引](docs/README.md) 汇总阅读任务。内容政策见 [Site](../../packages/site/README.md)，浏览器生命周期见 [Runtime](../../packages/book-runtime/README.md)。
