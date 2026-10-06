---
id: 'workspace-packages-overview'
type: 'architecture'
status: 'active'
created: '2026-10-06'
modified: '2026-10-06'
scope: '跨模块工程'
owner: '项目维护者'
parent: 'README.md'
related:
  - 'docs/architecture/overview.md'
  - 'packages/tooling/src/modules.json'
---

# Workspace 包协作

目录：

- [问题与目标](#问题与目标)
- [范围与约束](#范围与约束)
- [系统上下文](#系统上下文)
- [模块与依赖](#模块与依赖)
- [数据与契约](#数据与契约)
- [运行与部署](#运行与部署)
- [设计取舍](#设计取舍)
- [风险与验证](#风险与验证)

## 问题与目标

本页回答三个问题：六个包分别负责什么、包之间如何交接数据、如何从输入走到页面或发布结果。接口字段和错误码见各包的 API 参考，不在这里重复。

## 范围与约束

六个包共享一个 npm workspace、锁文件和构建流水线，各自维护版本。它们当前均为 `private` 包，不会发布到 npm。

每个包只开放一个导入路径：`@myblog/<package>`。包内任务由该入口提供；Astro 页面组件属于 Site，不作为 Book Build 或 Book Runtime 的跨包入口。准确的源码所有权以 [模块清单](tooling/src/modules.json) 为准。

## 系统上下文

```text
作者 --HTTPS/JSON--> Publishing --GitHub API--> GitHub 内容分支
                                                  |
                                                  +--push 事件--> CI
                                                                   |
                                                                   +--> Tooling 检查
                                                                   +--> Site 构建
                                                                   `--> 静态部署

读者 --HTTPS--> 静态站点 --> Site 页面 --> Book Runtime 浏览器分页

维护者 --> Operations 探针 --> 已部署站点与 Publishing 服务
```

发布服务更新内容仓库；CI 再构建和部署网站。Operations 读取服务状态，不执行发布。Tooling 检查源码与文档，不代替测试或线上探针。

## 模块与依赖

### 六个包的职责

| 包           | 负责                                             | 主要结果                           |
| ------------ | ------------------------------------------------ | ---------------------------------- |
| Site         | 读取 Astro 集合、筛选内容、组织路由和页面        | 页面、`BookDocument`、书籍展示资源 |
| Book Build   | 校验书籍配置，把 `BookDocument` 渲染成浏览器载荷 | `BookRuntime` 数据或诊断           |
| Book Runtime | 在浏览器测量 DOM、分页、映射文章并控制 Turn.js   | 物理页、文章页映射或诊断           |
| Publishing   | 校验 webhook 请求、规划文件变更并写入 GitHub     | HTTP 结果及远端提交状态            |
| Operations   | 执行服务器和站点只读探针                         | 分项检查结果及进程退出码           |
| Tooling      | 检查模块边界、文档和配置参考                     | 诊断或生成的参考文件               |

### 源码依赖

```text
Site ------import------> Book Build
  `-------import-------> Book Runtime（浏览器入口）

Tooling ---import------> Site
  `-------import------> Book Build

Publishing                 Operations
无应用包导入               无应用包导入
```

箭头仅表示源码导入。Publishing 通过 HTTPS/GitHub API 工作；Operations 通过 shell/HTTP 探测目标；它们不导入 Site 源码。Tooling 在本地和 CI 读取六包文件，但这不等于包间业务调用。

## 数据与契约

### 阅读页面构建

```text
Astro 集合与 JSON 配置
          |
          v
Site：过滤草稿、排序、生成 BookDocument
          |
          v  buildBook({ document, config })
Book Build：校验、渲染文章、组装目录和运行载荷
          |
          v
Site：加载主题 CSS，渲染 BookShell 和 Runtime Assets
          |
          v  HTML + JSON + CSS + 浏览器脚本
Book Runtime：测量 DOM、分页、生成文章导航映射
          |
          v
Turn.js：呈现物理页并响应翻页
```

职责边界：

- Site 决定哪些文章进入书、如何排序和呈现；
- Book Build 不读取 Astro 集合，也不决定草稿政策；
- Book Runtime 在浏览器运行，不读取内容文件；
- 构建时估算页数不等于浏览器实测页数。最终导航映射以 Runtime 分页结果为准。

### 各包的默认 API

以下调用均从包根导入；字段、错误和副作用见对应 API 参考。

| 包           | 调用                              | 输入                           | 结果                                          |
| ------------ | --------------------------------- | ------------------------------ | --------------------------------------------- |
| Site         | `buildHomepageModel(input)`       | Astro 集合、配置、引语、主题   | 页面模型或诊断                                |
| Site         | `inspectHomepageConfig(config)`   | 传统首页配置                   | Schema 与校验结果                             |
| Book Build   | `buildBook({ document, config })` | 文稿模型和书籍配置             | 浏览器载荷或诊断                              |
| Book Build   | `renderArticle({ body, title })`  | Markdown 正文和标题            | 去掉重复标题后的 HTML                         |
| Book Build   | `createBookTheme(id, sources)`    | 主题 ID 和主题 CSS 字符串      | 主题显示 CSS 与测量 CSS；纯数据转换，不读文件 |
| Book Runtime | `paginateBook(payload)`           | 浏览器 DOM、书籍载荷和测量 CSS | 实际页面、页码映射或诊断                      |
| Publishing   | `startServer()`                   | 服务环境配置                   | HTTP 服务句柄                                 |
| Operations   | `runHealthChecks()`               | 默认探针和目标环境             | 检查报告                                      |
| Tooling      | `inspectRepository(input?)`       | 仓库路径和检查模式             | 诊断报告                                      |

Site 的 Astro 页面直接组合 Site 自有组件；它们不再从其他包导入 `.astro` 子路径。Runtime 的分页算法通过 Runtime 包根 API 暴露给 Site 的浏览器入口。

## 运行与部署

```text
本地开发：npm run dev
本地验收：npm run verify
浏览器验收：npm run test:e2e

移动发布：客户端 -> Publishing -> GitHub ref 更新 -> CI -> Site 构建/部署
线上检查：Operations -> HTTP/shell 只读探针 -> 检查报告
```

Webhook 的 HTTP 成功表示远端内容分支已更新，不代表 CI 或部署成功。部署成功也不自动证明内容完整；需要检查提交、构建产物和线上探针结果。

## 设计取舍

统一包根导入让调用者只需记一个路径；包内部仍可提供不同任务函数，避免用一个带 `kind` 分支的万能函数隐藏职责。Site 持有 Astro 组件，因为路由、HTML 和资源加载都由 Site 决定。Book Build 和 Runtime 只保留可跨包复用的数据任务，不暴露宿主组件子路径。

六包不是一条串行链：Site/Book Build/Runtime 构成阅读流程；Publishing 构成独立写入流程；Operations 观察运行结果；Tooling 在开发和 CI 验证工程资料。

## 风险与验证

修改包 API 或责任边界后，必须完成以下核对：

1. `package.json` 仅导出 `.`；消费者只从 `@myblog/<package>` 导入。
2. 更新模块清单、调用方、API 参考、模块 README 和集成测试。
3. 执行目标包测试、`npm run check:contracts`、`npm run check:docs`、`npm run check:boundaries` 和 `npm run build`。
4. 修改页面组件、浏览器脚本或分页时，再执行 `npm run test:e2e`。

各包详细资料：

- [Site](site/README.md)
- [Book Build](book-build/README.md)
- [Book Runtime](book-runtime/README.md)
- [Publishing](publishing/README.md)
- [Operations](operations/README.md)
- [Tooling](tooling/README.md)

系统级架构见 [总览](../docs/architecture/overview.md)。
