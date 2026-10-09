---
id: 'src-site-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/README.md'
related:
  - 'packages/README.md'
  - 'packages/site/docs/explanation/design.md'
  - 'packages/site/docs/reference/api.md'
---

# Site 模块

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

Site 是 Astro 应用，负责仓库内容政策、页面路由和页面组合。输入是 `content/blog`、`content/life` 的 Markdown 和 `data/` 配置，输出是构建后的静态页面、RSS 和 BookDocument。

发布鉴权属于 Publishing；真实分页属于 Book Runtime。

## 能力与限制

提供翻页首页 `/`、传统首页 `/classic`、文章及归档 `/blog`、`/life`、独立书 `/book/sample` 和运行时演示。书籍适配器过滤草稿，按有效 Date 倒序排序，保留来源标签。

传统目录负责显示限额和 UTC 日期格式，但不自行过滤草稿：页面在调用前过滤。

内容来自受信 Git 仓库，无匿名 HTML 清洗。每日一句使用仓库快照，上游失败保留 previous，不保证当天更新。Site 是独立版本化的 workspace 包，包根入口把翻页首页的模型组合成一次任务。

## 内部结构

```text
packages/site/
+-- src/
|   +-- api/                  首页模型、传统配置校验及类型声明
|   +-- internal/
|   |   +-- sources/          集合与 JSON -> BookDocument
|   |   +-- catalog/          传统目录排序与截断
|   |   +-- config/           传统配置字段与校验
|   |   +-- presentation/     页面样式组合
|   |   +-- quotes/           引语上游归一与回退
|   |   +-- book-runtime-entry.js  加载分页 API 与 Site 适配器
|   |   +-- book-app.js       载荷、启动、导航与失败回退
|   |   +-- turnjs-adapter.js Site 插件交互
|   |   +-- browser-globals.d.ts   Site 私有宿主声明
|   |   +-- cursor-dot.*      光标
|   +-- pages/ layouts/ components/  页面与宿主组件
|   +-- styles/ assets/       展示资源
|   +-- content/ data/        写作资产与配置
|   +-- content.config.ts     集合 Schema 与 loader
|   +-- cli/ tools/           引语更新与封面工具
+-- tests/                    内容、配置、引语与插件测试
+-- docs/                     模块资料
```

Astro 的 `srcDir` 是 `packages/site/src`；旧根 `src/pages` 等目录已删除，不是第二套应用入口。

## 依赖与数据流

```text
仓库 Markdown -> Astro 集合 -> Site 内容政策 -> BookDocument
                                                 |
                                                 v
配置/主题 ------------------------------> Book Build API
                                                 |
                                                 v
Site pages <---------------------------- articles/config/CSS
    |
    +-> HTML/JSON + BookShell + Runtime Assets -> 浏览器实际分页
    +-> 传统目录/单篇文章/RSS -> 静态浏览器页面
```

主题展示 CSS 位于 `src/styles/book-themes/`，由 Site 通过 Vite `?raw` 加载；`src/internal/load-book-theme.mjs` 将这些字符串与 KaTeX CSS 一并交给 Book Build 的 `createBookTheme()`。Site 不读取 Book Build 的私有目录。

Site 只通过 `@myblog/book-build` 调用构建、文章转换和主题初始化；浏览器入口只通过 `@myblog/book-runtime` 调用分页。书壳、vendor 加载、浏览器启动和光标都由 Site 组件组合，不跨包导入 Astro 子路径。

Publishing 写内容仓库，不导入 Site；句子更新 CLI 调用 Site 内部引语服务，将快照写入 `data/daily-quote.json`。该服务不是包根导出。

## 主要接口

包只声明 `@myblog/site` 一个导入路径。页面模型任务 `buildHomepageModel(input)` 组合集合适配、Book Build、主题挂接、页面 CSS 和引语回退；Tooling 专用的 `inspectHomepageConfig(config)` 也从同一入口调用。Astro 页面和组件负责集合读取、文件读取及 HTML 输出。

| 导入路径       | 函数                            | 输入                                       | 输出                                 |
| -------------- | ------------------------------- | ------------------------------------------ | ------------------------------------ |
| `@myblog/site` | `buildHomepageModel(input)`     | life/blog 集合、BookConfig、引语快照、主题 | 页面模型、Book 载荷、CSS、引语或诊断 |
| `@myblog/site` | `inspectHomepageConfig(config)` | 传统首页配置                               | JSON Schema 和校验结果；不写文件     |

内容、配置、目录和样式转换函数是包内实现，不属于跨包调用契约。快照读写和远端句子抓取由 Site CLI 处理，不在 `buildHomepageModel` 中执行。

模型调用链渲染根路径图片时可能读取 `cwd/public` 文件以补充尺寸；不请求网络、不写文件。配置与主题的共享引用约束见 [API 的输出与副作用](docs/reference/api.md#输出与副作用)。

## 最小使用示例

在 blog 根运行，Node 22.13+ 或 24+，已安装依赖：

```sh
node --input-type=module <<'NODE'
import { buildHomepageModel } from '@myblog/site';
import config from './packages/site/src/data/book-config.json' with { type: 'json' };
const result = buildHomepageModel({
  lifePosts: [{id:'hello',body:'正文',data:{
    title:'你好',date:new Date('2026-01-01T00:00:00Z')}}],
  blogPosts: [],
  bookConfig: config,
  dailyQuote: null,
  theme: {runtime:{id:'classic-paper'},styles:{visualCSS:''},measurement:{articleCSS:'',tocCSS:''}},
});
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
console.log(result.value.document.id, result.value.runConfig.articles.length);
NODE
```

预期 `zhimin-blog 1`。无文件写入、无网络、无浏览器挂载。内存主题替身只证明组合流程，不证明真实主题资源或浏览器排版。实际页面执行 `npm run dev` 后访问终端显示的地址。

六页个性化入口：`src/data/book-edition.json` 保存当前文案；`src/internal/presentation/special-pages/` 每页一个模板文件，并保存专用主题 CSS 与资源角色映射。初始书壳和运行时使用同一份 HTML，不改分页代码即可调整版面。详见 [六页设计](docs/explanation/special-pages.md)。

## 配置

`data/homepage-config.json` 仅用于传统首页，字段真相位于 Site 配置校验器；`data/homepage-config.schema.json` 和配置参考由 Tooling 通过 `@myblog/site` 的 `inspectHomepageConfig()` 生成。

`data/book-config.json` 用于翻页首页，直接指向 Book Build 公共 schema，不维护转发 schema。`data/books/*.json` 用于独立书籍。

集合 loader 显式读取 `packages/site/src/content/{blog,life}`。每日一句 CLI 的日期使用上海时区；页面读取快照，不在访问时请求上游。配置、正文和 CSS 均要求受信输入。

## 测试与验证

`node --test tests/integration/public-api.test.mjs tests/integration/book-runtime.test.mjs packages/site/tests/homepage-data.test.mjs packages/site/tests/homepage-config.test.mjs packages/site/tests/daily-quote.test.mjs` 验证数据与失败政策。

先构建，再运行首页/归档产物测试。布局、字体或浏览器协议变化必须运行 `npm run test:e2e`；完整交付执行 `npm run verify`。

插件适配和移动手势的局部回归为 packages/site/tests/turnjs-adapter.test.mjs、book-app-mobile.test.mjs；浏览器断言仍在 tests/e2e。发布候选执行 verify:release，包含 tarball 隔离消费。

单测不证明真实排版高度；构建不证明触摸或无障碍。覆盖与限制见 [测试方案](docs/testing/strategy.md)。

## 文档导航

- [六包协作总览](../README.md)：Site 如何串联 Book Build 与 Book Runtime，以及发布和检查链路的位置。

- [文档索引](docs/README.md)；
- [模块设计](docs/explanation/design.md)；
- [内容选择算法](docs/algorithms/content-selection.md)；
- [API 参考](docs/reference/api.md)；
- [入门教程](docs/tutorials/getting-started.md)；
- [变更指南](docs/guides/change.md)；
- [封面编辑与导出](docs/guides/cover-generator.md)；
- [测试方案](docs/testing/strategy.md)；
- [生成配置参考](docs/reference/homepage-config.generated.md)。
