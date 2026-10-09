---
id: 'project-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: '跨模块工程'
owner: '项目维护者'
parent: 'README.md'
related:
  - 'docs/architecture/overview.md'
  - 'docs/guides/contributing.md'
  - 'packages/README.md'
---

# Zhimin's Blog

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

个人写作站点，将仓库中的文章、图片和配置构建为传统文章页面与翻页书。面向作者、读者和维护者，支持受信作者内容及移动发布；不提供多人 CMS、公开投稿或任意 HTML 的安全沙箱。[线上站点](https://zhimin.ink/)。

受版本控制与 npm 项目根是 blog，本文件所在目录即项目根；外层工作区不是 npm 根。跨模块规则见 [贡献指南](docs/guides/contributing.md)。

## 能力与限制

首页为书籍阅读，/classic 为传统文章入口，文章路由和 JSON 书示例共享统一书模型。分页按浏览器真实高度进行，构建估算页数不是最终页数。图片与字体、viewport 会影响结果；自动浏览器矩阵覆盖 Chromium/WebKit，不承诺 Safari/iOS 真机一致。

五个应用模块和一个 Tooling 工具域共享安装与锁文件，各包独立维护 workspace 版本但仍为私有包。Publishing 提交成功仅证明 GitHub 仓库更新，静态交付另行验证。当前原始 HTML 基于受信作者，发布输入体积与速率仍有局限。

## 内部结构

```text
blog/
+-- README.md / AGENTS.md          项目与代理入口
+-- package.json / package-lock.json  命令、依赖与锁定版本
+-- astro.config.mjs / tsconfig.json  应用与类型配置
+-- packages/
|   +-- README.md      六包关系、数据交接与贯通场景
|   +-- site/          Astro 页面、内容政策与路由
|   +-- book-build/    来源无关模型、渲染与初始载荷
|   +-- book-runtime/  浏览器分页与映射；插件交互归 Site
|   +-- publishing/    输入转换、GitHub 提交与服务
|   +-- operations/    运行探针、报告与服务器操作
|   `-- tooling/       模块清单、检查、生成与工程配置
+-- tests/
|   +-- integration/   跨模块、构建产物与部署契约
|   +-- e2e/           浏览器排版与交互
+-- public/            静态资源与只读 vendor 原件
+-- docs/              全局架构、规范、贡献指南与交付
+-- .github/           CI 与平台配置
```

六个包各自管理 `src/api/`、私有实现、`tests/`、README 和 `docs/`；有命令行入口的包另设 `src/cli/`。包之间的责任与常见数据流从 [包协作总览](packages/README.md) 开始。

Astro `srcDir` 指向 `packages/site/src`；Runtime 源码由 Astro/Vite 打包，不以 `public/` 脚本作为实现入口。工程配置由 Tooling 包维护并由根 npm scripts 显式引用，不设置配置转发副本。

`node_modules/` 是安装结果，`dist/`、`.astro/` 和 `test-results/` 是构建/检查产物，不属于源码模块。它们按忽略规则管理，不通过删除环境目录来整理项目结构。

[模块清单](packages/tooling/src/modules.json) 是拥有关系及公开入口登记。系统级四视图见 [架构总览](docs/architecture/overview.md)。

## 依赖与数据流

```text
Site -- API import --> Book Build
Site -- API/resource import --> Book Runtime
Tooling -- API import --> Site + Book Build

Content -> Site policy -> BookDocument -> Book Build -> HTML/JSON/CSS
                                                           |
                                                           v
                                                 Book Runtime -> browser pages
Mobile author -- HTTP --> Publishing -- Git --> GitHub -- CI --> deployed assets
Operations -- read-only probes --> website + Publishing
Tooling -- static checks --> packages + docs
```

- 第一组箭头是允许源码依赖；
- 后两组表示数据和交付。Book Build 不读取站点集合，Runtime 不读取服务器或内容文件，Publishing/Operations 不导入站点实现。跨模块只能调用清单登记的 api/ 文件；
- 分模块的输入、输出和顺序见 [包协作总览](packages/README.md)；系统上下文、源码依赖、运行及部署四视图见 [系统架构](docs/architecture/overview.md)。

## 主要接口

| 包           | 常见任务入口                      | 输入与结果摘要                                            |
| ------------ | --------------------------------- | --------------------------------------------------------- |
| Site         | `buildHomepageModel(input)`       | 集合、配置与主题 -> 首页模型或诊断                        |
| Book Build   | `buildBook({ document, config })` | `BookDocument` 与配置 -> HTML、目录、初始浏览器载荷或诊断 |
| Book Runtime | `paginateBook(payload)`           | 浏览器 DOM 与载荷 -> 实际页、文章映射或诊断               |
| Publishing   | `startServer()`                   | 服务配置 -> HTTP server 句柄；HTTP 请求会显式写 GitHub    |
| Operations   | `runHealthChecks()`               | 默认探针 -> 分项报告与总体状态                            |
| Tooling      | `inspectRepository(input?)`       | 工程输入 -> 诊断或参考报告                                |

六包的 `exports` 只开放包根 `.`，禁止跨包导入私有子路径。各包以常见任务为默认入口，少量配置和构造函数仍从同一根入口导出；完整契约见 [包协作总览](packages/README.md) 及各包 API 参考。

Publishing 和 Operations 导入 API 不会自动启动服务或执行探测。CLI 分别为 `npm run server:publish`、`npm run server:health`。载荷交接见 [运行契约](docs/reference/book-runtime-contract.md)。

## 最小使用示例

前提是 Node ^22.13.0 或 >=24、npm；在 blog 执行：

```sh
npm ci
npm run dev
```

打开终端显示的地址，核对首页可翻页、`/classic` 有文章列表、文章页正文完整。停止进程即可结束。跨包输入、输出和贯通步骤见 [包协作总览](packages/README.md)。生产产物练习：

```sh
npm run build
npm run preview
```

build 写 `dist/`，preview 在本地交付该产物，不是上线。Book Build 独立调用和失败示例见 [模块教程](packages/book-build/docs/tutorials/getting-started.md)。服务与健康 CLI 的权限、输入和结果先读对应模块文档，不在入门练习启动真实发布。

## 配置

Site 拥有 packages/site/src/data/book-config.json、homepage-config.json、文章和每日引语快照。

Book 配置结构来自 packages/book-build/src/api/book-config.schema.json，buildBook 在任务入口检查；首页配置由 Site 根入口 inspectHomepageConfig 检查。

- 主题配置选择已登记 theme.id；
- 具体参数与当前值见 [书籍参考](packages/book-build/docs/reference/book-config.generated.md) 和 [首页参考](packages/site/docs/reference/homepage-config.generated.md)。配置参考不是所有主题默认值，也不是完整 Schema；
- 改来源后运行 npm run docs:generate，不直接编辑生成文件。

Publishing/Operations 的环境变量属于服务/观测配置，不进入静态 JSON。真实 token、密钥及图片 base64 不写入源码、文档或日志。

## 测试与验证

```sh
npm run verify
npm run test:e2e
```

verify 串行执行格式、lint、六包契约类型、文档、边界、测试盘点、Astro、构建和 Node；失败后的阶段不执行。verify:release 再执行实际 tarball 隔离消费与 Chromium/WebKit。单独 test:e2e 也先盘点并重新构建；测试 preview 使用独立 4392 端口，不复用 4321 开发服务。首次执行先运行 `npx playwright install chromium webkit`。门禁要求非空测试集、零失败、零取消、零跳过、零 TODO、零重试。配置来源变化先生成再检查漂移。

- Node 替身不能证明真实 GitHub；
- JSDOM 不能证明真实高度；
- 健康路由不能证明发布业务；
- 静态门禁不能证明语义。交付报告记录本次命令、环境、退出码与跳过项。[全局测试方案](docs/testing/strategy.md) 提供证据分层。

## 文档导航

| 任务                   | 权威入口                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 理解系统边界与设计取舍 | [架构总览](docs/architecture/overview.md)、[包协作总览](packages/README.md)、[文档中心](docs/README.md)                              |
| 修改与验收             | [贡献指南](docs/guides/contributing.md)、[规范中心](docs/standards/README.md)                                                        |
| 应用内容与书籍构建     | [Site](packages/site/README.md)、[Book Build](packages/book-build/README.md)                                                         |
| 浏览器、发布与观测     | [Runtime](packages/book-runtime/README.md)、[Publishing](packages/publishing/README.md)、[Operations](packages/operations/README.md) |
| 工程检查               | [Tooling](packages/tooling/README.md)                                                                                                |
| 发布及恢复             | [交付指南](docs/operations/deployment.md)                                                                                            |
| 代理执行               | [AGENTS.md](AGENTS.md)                                                                                                               |
| 演进条件               | [风险台账](docs/architecture/evolution.md)                                                                                           |

每个模块提供设计、算法、公共 API、练习、变更与测试策略。历史原件用于了解时点，不代替当前契约；本地工作不自动授权提交、推送或上线。
