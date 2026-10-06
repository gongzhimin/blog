---
id: 'decision-task-oriented-module-apis'
type: 'decision'
status: 'active'
created: '2026-10-05'
modified: '2026-10-06'
scope: '六个独立版本 workspace 包的 API、协作契约与诊断'
owner: '项目维护者'
parent: 'docs/decisions/README.md'
related:
  - 'docs/decisions/0004-physical-modules-and-public-api.md'
  - 'docs/architecture/overview.md'
  - 'docs/standards/documentation.md'
  - 'packages/tooling/src/modules.json'
---

# ADR 0005：六模块独立版本 workspace 包

目录：

- [背景](#背景)
- [备选方案](#备选方案)
- [决定](#决定)
- [后果](#后果)
- [再评估条件](#再评估条件)

## 背景

上一版提案把独立 npm 包排除在方案之外，也没有说明模块 API 的完整输入、输出和协作数据。本 ADR 修正这一点：六个模块分别成为有独立 `package.json`、公开导出和版本号的 workspace 包；这次先在仓库内构建、链接和版本化，不发布到公共或私有 registry。

现有六模块入口将不同层级的能力放在一起。一个常见站点构建调用多个内容、配置、组装和 Runtime 函数；书籍运行时调用者可接触 DOM 测量、缓存和物理页映射；Publishing 调用者可自行拼接远程读取及 Git 提交步骤；Operations 和 Tooling 将底层检查机制作为主要入口。调用者因此必须了解模块内部结构，接口文档也被迫逐一解释这些实现步骤。

项目内已有实际跨模块契约：Site 将内容整理为 `BookDocument`；Book Build 将它转为 JSON 浏览器载荷；Book Runtime 从载荷和浏览器 DOM 建立可翻阅书页；Publishing 写入 Site 读取的内容路径；Operations 观测 Site 与 Publishing 的部署状态；Tooling 在 CI 检查这些模块的边界和资料。这些交接目前依靠仓库相对路径、源码导入和文档解释，尚未全部表达为独立包可校验的版本契约。

本 ADR 定义包边界、调用方向、主要输入/输出、状态与诊断，以及版本协作策略。决定已获接受，但不代表新契约已实现。具体 TypeScript/JSDoc 定义和 schema 文件按批准的实施计划落地；包名采用实施计划登记的私有名称。

2026-10-06 实施核对：六个 workspace 包均只开放一个包根导入路径；这不等于每包只能有一个任务函数。当前导出清单以各包 `package.json#exports` 与 `docs/reference/api.md` 为准；本 ADR 中 `BookDocumentV1`、`RuntimeHandle`、ports 等详细 DTO/句柄签名是早期设计提案，不是当前实现契约。不得据提案示例调用未导出的接口。

2026-10-06 边界更新：Site 拥有 Astro 书壳、浏览器启动组件、展示 CSS 与 Vite 资源导入；Book Build 只做书籍组装、文章渲染和传入 CSS 字符串的主题转换。六包当前包根任务分别见模块参考；Book Build 的主题转换入口为 `createBookTheme(id, sources)`，CSS 资源由 Site 提供。该实现更新优先于下方早期宿主子路径图示。

本提案采用函数式核心与命令式边界：跨包默认以显式函数调用和数据输入/输出表达任务；纯计算不得读写隐式状态，有副作用的能力必须由单独入口和明确资源/端口承载。函数式风格不等于要求 DOM、网络和文件系统操作成为纯函数，也不要求把每个内部步骤暴露给调用方。

目标：

- 六个模块能从其 package root 被单独安装、构建、测试和版本化。
- 跨包调用使用包名和声明的导出，不引用对方仓库相对源码路径。
- 协议生产者明确输出字段，消费者声明兼容的生产者版本。
- 常见任务通过任务级入口调用；组装顺序、默认值和正常校验由责任包持有。
- 有副作用的工作流可区分失败、降级、冲突、超时和结果不确定，并提供脱敏诊断。
- 根 workspace 统一安装和集成验收；每个包单独声明依赖、脚本、导出、版本和模块文档。

非目标：

- 本轮将包发布到公共 npm、付费私有 npm registry 或其他外部 registry。
- 立即拆分 Git 仓库、网站部署单元或运行进程。
- 将六个 package version 强行锁定为同一版本。
- 为了独立包装而把 Site 应用或 Tooling 检查器错误包装成面向第三方的通用库。
- 从版本号推导生产部署已完成；部署需要独立产物和线上验证。

## 备选方案

| 方案                                               | 收益                                                   | 代价与结论                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 单根 `package.json` 和单一版本，继续以目录作为模块 | 迁移成本低                                             | API、依赖和发布仍是一个整体；不能满足用户对模块独立版本的要求；拒绝                                         |
| 六个独立 Git 仓库                                  | 仓库权限和交付可分别隔离                               | Site、Book、Runtime、发布路径、Operations 与 Tooling 协同改动会跨仓库发布和联调；目前没有该隔离需求；不采用 |
| 六个独立 package workspace，共享根安装，包独立版本 | 本地使用真实包名、可声明依赖/exports、整体集成成本可控 | 根 lockfile 与发布版本必须一致维护；采用                                                                    |
| 将全部 package 固定版本、整体同步发布              | 协议总是同步，发布流程直接                             | 与“模块可独立演进”目标冲突，任一模块变化都扩大版本影响；拒绝                                                |

npm workspaces 适合在一个根项目中管理本地包并自动链接 workspace；Node.js package `exports` 能列出允许的 package entry points，并阻止常规包名导入未导出的子路径；Semantic Versioning 规定兼容 API 的 patch/minor 与不兼容 major 变化。具体使用边界见 [npm Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/)、[Node.js Package Entry Points](https://nodejs.org/api/packages.html) 和 [Semantic Versioning 2.0.0](https://semver.org/)。

## 决定

本章是已接受的目标架构。迁移完成前，现有根 `src/` 布局、根 `package.json`、模块导出和当前运行协议仍是实际有效契约；实施计划规定兼容的转换顺序。

### 包结构、版本和入口封装

目标目录将六个模块放在一个单一根级 `packages/` 中，避免再增加六个顶层工程目录：

```text
blog/
+-- package.json                 根 workspace 协调器；不承担业务 API
+-- package-lock.json            一份锁文件，固定根和 workspace 依赖
+-- packages/
|   +-- site/                    Astro 站点应用 package
|   +-- book-build/              来源无关的书籍构建 package
|   +-- book-runtime/            浏览器书籍运行 package
|   +-- publishing/              移动内容接入和仓库提交 package
|   +-- operations/              部署检查与运维 package
|   +-- tooling/                 仓库约束和代码生成 package
+-- docs/                        跨包架构、规范、共用协议和集成验收
+-- tests/                       跨包集成与浏览器端到端测试
```

- 根 `package.json` 使用 npm workspaces 声明 `packages/*`，保持 `private: true`。根仅协调 `install`、全仓 `verify`、集成测试和 release 检查；Astro 应用依赖和配置归 Site package。
- 每个模块有自己的 `package.json`、源码、`README.md`、`docs/`、模块测试和独立 `version`。对外包名采用项目 scope 占位符；实际 scope 不在本 ADR 中臆定。
- 六个 package manifest 均设 `private: true`，所以不能被误发布到 registry；这不妨碍 workspace 内独立记录和升级版本。Site 是可独立构建和版本化的站点应用；Tooling 是仅供开发和 CI 使用的工程包。包是否公开和发布由单独决定授权。
- workspace 之间使用包名导入，并在 `dependencies`、`peerDependencies` 或 `devDependencies` 明确关系；根 npm 安装本地 workspace 链接。跨包源码相对路径、`src/...` alias、直接导入对方 `internal/` 一律禁止。
- 每个包配置 `exports` 白名单：`.` 是主要 API，确有实际宿主资产需求时才增加明确的 `./astro`、`./browser`、`./cli` 或 `./schema` 子路径。没有登记的文件不构成受支持 API；包封装是入口规则，不宣称为安全沙箱。
- 版本独立推进，依赖方在自身 `package.json` 声明兼容范围。稳定契约遵循 SemVer；接受本 ADR 时先发布前内部版本可使用 `0.x`，不得把 `0.x` 误写成稳定兼容承诺。
- 建议采用 Changesets 作为独立版本和依赖版本联动工具。配置将 `privatePackages.version` 设为 `true`、`privatePackages.tag` 设为 `false`，使私有 workspace 包可独立 bump、但不生成 registry tag；根协调器不纳入包版本。CI 只运行版本计算/文件更新检查，不配置 `changeset publish`。Changesets 将版本更新与发布分开，且默认不版本化 private package，必须显式配置；见[配置说明](https://changesets.dev/guide/config)和[版本与发布指南](https://changesets.dev/guide/versioning-and-publishing)。
- 每包的测试须从 workspace 入口运行，并增加 pack/tarball 检查：验证声明的 `files` 中包含真实运行所需代码、类型、CSS、Astro 组件和不可变第三方资源。workspace 符号链接成功不代表打包产物完整。

### API 风格与副作用边界

跨包默认接口是“一个任务函数 + 一个明确输入模型 + 一个明确结果模型”。领域输入/输出使用 JSON-safe 值；生产方返回结果后不得继续修改该快照，消费者按只读值使用。DOM、资源句柄和 capability ports 是明确标注的宿主边界，不属于 JSON 领域 DTO。日期、单位、默认值和协议版本写入 schema 或类型，不依赖全局配置、调用顺序或隐含环境。模块可在内部使用对象、类和可变数据结构，但这些不因此成为跨包契约。

- **纯核心**：相同输入返回相同结果，不读写文件、网络、DOM、进程或时钟，不依赖可变模块级状态。配置归一化、内容建模、HTML 组装前的纯转换、页码映射、计划生成、结果格式化和规则评估属于此类。时间、随机数和环境信息由调用者作为值传入。
- **副作用边界**：网络、Git、文件系统、DOM、计时器和进程 I/O 只在明确命名的执行/挂载入口发生。调用者从入口输入配置与请求，输出为结果或显式资源句柄；模块导入不得启动服务、请求网络、读取项目文件或挂载 DOM。
- **依赖端口**：需要替身测试或选择宿主实现时，可向副作用入口显式传入最小 capability port（例如 `fetch`、Git client、filesystem 或 probe runner）。端口是执行依赖，不混入领域 DTO，不由生产数据对象携带任意回调；默认宿主适配器由包的 CLI、Astro 或浏览器集成层提供。回调只允许出现在本地资源句柄（如 Runtime 的 `subscribe`）或宿主端口边界，不放进可序列化的跨包业务数据。
- **结果和错误**：可能因输入、资源或外部依赖失败的跨包任务用判别联合表达：`{ ok: true, value }` 或 `{ ok: false, diagnostics }`；保证全定义域有效的纯函数直接返回值，不额外包装成功状态。冲突、拒绝、降级和提交结果未知等业务终态属于 `value.status`，不是调用异常；意外程序错误不能静默转成成功。对外诊断含稳定 `code`、`phase` 和脱敏定位信息，文案不作机器契约。
- **资源生命周期**：DOM、订阅、服务监听器等不能编码为纯数据。创建资源的函数返回明确所有权句柄，调用方负责一次性 `destroy()`/`close()`；句柄只暴露任务所需操作和不可变状态快照，不暴露内部缓存或任意修改能力。
- **复杂度控制**：普通调用使用默认宿主能力，不要求传一串底层函数；高级调用者可以选择端口、策略或诊断订阅。禁止把实现步骤拆成必须由每个消费者手动排序的公共小函数。
- **配置和常量**：环境路径、URL、超时、重试次数、内容上限、默认值、状态名和跨包字段不得散落在函数实现中。可变策略归所属模块的权威配置/schema；协议固定值归版本化类型/schema；不可配置的算法不变量使用有名称、有单位、有依据的常量并配测试。此规则不要求把每个算法数字都变成用户配置，也不以全局禁止数字字面量代替审查。
- **接口参考**：每份 API 参考逐一列出全部公开导出和函数。每个参数/输入字段说明名称、类型、是否必填、默认值、单位、取值范围、校验时点和用途；每个返回值说明同步/异步、类型、各字段语义、成功判据和引用/资源所有权；同时说明副作用、稳定错误码/状态、重试条件、运行环境和最小可执行示例。不得只写函数名或整体参数对象简介。

```ts
type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };

Site         buildHomepageModel(input)        -> Result<SiteHomepageModel>
Book Build   buildBook({ document, config })  -> Result<BookRuntime>
Book Runtime paginateBook(payload)            -> Result<BookPagination>
Publishing   startServer()                    -> HTTP Server handle
Operations   runHealthChecks()                -> Promise<HealthReport>
Tooling      inspectRepository(input?)        -> InspectRepositoryReport
```

这里的函数签名说明接口类别，不是已实现的类型声明。每包 API 参考必须标明每个入口属于纯函数、副作用函数还是资源句柄，并列出依赖、输出、状态与清理责任。

`Result` 的 `ok` 表示这次函数调用能否生成结构化结果，不等同于业务是否健康或操作是否提交。例如探针均已执行但站点不健康时，函数仍可返回 `ok: true`，由 `HealthReport.status` 表达 `unhealthy`；无法读取配置或执行探针时才返回 `ok: false`。同步纯函数直接返回 `Result`，有 I/O 的调用返回 `Promise<Result<...>>`。

### 六包的输入、输出和状态

以下是调用者可依赖的业务结果。每个包仍可有私有算法数据，但不得要求消费者读取这些私有状态才能完成任务。

| 包             | 默认任务及输入                                                                                              | 输出与成功判据                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `site`         | `buildHomepageModel({ lifePosts, blogPosts, bookConfig, dailyQuote, theme })`；Astro adapter 提供集合和主题 | `Result<SiteHomepageModel>`：BookDocument、Runtime 载荷、首页样式与引语；Astro 随后渲染页面   |
| `book-build`   | `buildBook({ document, config })`；配置按 Book Schema 校验                                                  | `Result<BookRuntime>`：document、渲染文章、目录与配置；不测量浏览器物理页数                   |
| `book-runtime` | `paginateBook(payload)`；Book Build 载荷及浏览器 DOM/测量环境                                               | `Result<BookPagination>`：物理页面、起页及双向导航映射；Astro Assets 另行启动 Turn.js         |
| `publishing`   | `startServer()`；服务环境提供 webhook 与 GitHub 凭据                                                        | 返回 HTTP server 句柄；宿主负责关闭，服务处理鉴权、远端写入和响应                             |
| `operations`   | `runHealthChecks()`；使用包内固定生产探针和系统 runner                                                      | `Promise<HealthReport>`：`ok` 与有序探针结果；失败探针汇总，不隐式修复或重启服务              |
| `tooling`      | `inspectRepository({ root?, mode? })`；mode 为 all/docs/boundaries                                          | 同步只读检查报告，含 `ok`、mode、diagnostics、stdout 和 stderr；参考资料生成仍由独立 CLI 执行 |

协调顺序：Site 读取并适配内容，调用 Book Build 生成初始载荷；Astro 输出书壳和主题资源；浏览器 Runtime 测量并分页。Publishing 独立接收 webhook 并更新内容仓库；Operations 独立探测运行服务；Tooling 在开发/CI 读取六包并检查规则。接口字段和失败细节以各包 API 参考为准。

#### 每包的函数式调用形态

| 包           | 纯函数核心                                                                                                                               | 显式副作用/资源边界                                                                                                                                | 调用方拿到什么                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Site         | `buildHomepageModel(input)`：集合适配后的值、配置与引语快照 → `Result<SitePageModel>`；日期格式化、导航/页脚模型和样式模型是纯转换       | `fetchDailyQuote(input, ports)` 发起带截止时间的请求；Site CLI 决定读取/原子写入快照，纯模型函数不联网、不写盘                                     | 静态路由可消费的页面模型；quote 子状态 `fresh/retained/unavailable`                                        |
| Book Build   | `buildBook(input)`：`BookDocumentV1 + BookConfigV1 → Result<BookRuntimePayloadV1>`；Markdown 渲染、目录和导航键构造在同一任务 API 内完成 | 不直接产生外部副作用；主题资源加载是独立宿主适配入口，I/O 由调用者提供或在适配层完成                                                               | 完整 JSON-safe 运行载荷，或带阶段和 code 的诊断                                                            |
| Book Runtime | `paginateBook(payload)` 选择测量配置并编排目录、正文分页与映射                                                                           | 接触浏览器 DOM 并返回完整页集合；页面挂载由 Astro Assets 与内部 Turn.js adapter 负责                                                               | `Result<BookPagination>`；诊断或物理页、起始页及双向导航映射                                               |
| Publishing   | `planArticle({ request, repositorySnapshot }) → Result<PublicationPlan>`：校验内容、路径并生成确定性提交计划                             | `executePublication(plan, ports)` 读取远程 ref、创建提交并更新 ref；HTTP 服务启动只属于 Publishing CLI/server adapter，不属于包导入或纯计划函数    | `Promise<Result<PublicationResult>>`；含 `committed/rejected/conflict/failed/unknown` 终态，不声称部署成功 |
| Operations   | `evaluateProbeResults(input, results) → HealthReport`：固定排序、状态聚合、诊断脱敏                                                      | `runHealthChecks(input, ports)` 执行 HTTP、进程或配置探针；不隐式重启/修复服务                                                                     | `Result<HealthReport>`；探针失败作为 `HealthReport` 数据，总体 `healthy/unhealthy/incomplete`              |
| Tooling      | `evaluateRepository(snapshot, checks) → RepositoryReport`：对已读取快照运行模块图、契约和文档规则                                        | `inspectRepository(input, ports)` 读取文件并组装 snapshot；`generateReferences(input, ports)` 仅 `mode: write` 时写文件。CLI 负责 stdout/exit code | `Result<RepositoryReport>` / `Result<GenerationReport>`；`check` 模式无写入，`write` 模式报告实际改动文件  |

表中的辅助纯函数是模块内部可组合实现，不要求全部成为公开入口。每包默认入口仍是任务级 API；公开纯辅助函数仅在存在独立调用任务时才保留。`ports` 仅包含本操作所需的能力，不能暴露模块私有对象或让调用者重演内部步骤。

表中名字表示核心业务输出，不代表每个包对消费者只允许这一个接口。下列详细领域 DTO 是早期目标草案；若与当前包 API 参考及导出清单不同，以后者为准，不能把草案字段当成当前生产者已实现的协议。

#### 后续协议目标：Book Build 与 Runtime

以下 `BookDocumentV1` / `BookRuntimePayloadV1` 是早期协议设计稿，不是当前包输入输出。当前结构、Date/HTML 语义及失败诊断以 [Book Build API](../../packages/book-build/docs/reference/api.md)、[Site API](../../packages/site/docs/reference/api.md)、[Runtime API](../../packages/book-runtime/docs/reference/api.md) 为准。

```ts
type BookDocumentV1 = {
  protocolVersion: 1;
  id: string;
  title: string;
  tocTitle: string;
  description?: string;
  entries: Array<{
    id: string;
    collection: string;
    title: string;
    date: string; // ISO 8601，必须包含 Z 或 UTC offset
    body: { format: 'markdown' | 'html'; content: string };
    metadata?: Record<string, JsonValue>;
  }>;
};

type BookRuntimePayloadV1 = {
  protocolVersion: 1;
  source: { documentId: string; title: string; tocTitle: string };
  themeId: string;
  layout: {
    desktop: { article: SizePx; toc: SizePx };
    mobile?: { article: SizePx; toc: SizePx };
    turn: {
      elevation: number;
      durationMs: number;
      estimatedTotalPages: number;
      startPhysicalPage: number;
    };
  };
  toc: {
    title: string;
    items: Array<{
      articleId: string;
      key: string;
      title: string;
      displayNumber: number;
    }>;
  };
  articles: Array<{
    articleId: string;
    key: string;
    source: { id: string; collection: string };
    title: string;
    dateLabel: string;
    bodyHtml: string;
  }>;
};

type SizePx = { width: number; height: number };
type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
```

- `BookDocumentV1` 是 Book Build 的输入模型。Site 来源 adapter 负责过滤 draft、验证日期并确定排序；JSON adapter 负责显式处理字段缺省。Book Build 不知道 Astro 集合或文件位置。
- 日期在 package/model 边界使用带时区的 ISO 8601 字符串；Book Build 在展示时格式化为 `dateLabel`。不得把 JavaScript `Date` 对象、DOM 节点、回调函数或 `undefined` 传入载荷。
- `BookRuntimePayloadV1` 是 Build 的浏览器侧输出，也是 Runtime 唯一的书籍领域输入；DOM 根节点和主题资源是宿主资源，不属于领域载荷。`layout` 使用 CSS px；物理页和实际目录页数由 Runtime 测量，不能由 Build 伪报为实测值。
- `articleId` 是原始文档身份；`key` 是 URL/Runtime 导航键。Build 必须拒绝重复 `articleId`、key 碰撞、非 JSON 值和无法渲染的正文，并确保目录 `articleId` 与文章列表一一对应。
- `turn` 只包含 `elevation`（正数，阴影高度）、`durationMs`（正数，翻页动画毫秒数）、`estimatedTotalPages`（正整数，初始化估计值，不是实测值）和 `startPhysicalPage`（正整数，启动页的物理页号）。适配层将字段映射到当前配置中的 `elevation`、`duration`、`totalPages`、`startPage`；Runtime 分页后以实测总页数替换估计值。Schema 拒绝未知键；数值边界和默认值由唯一 Book Config schema 定义，不复制到另一份手写默认配置。

#### 后续协议目标：六包输入与结果扩展

本节列出的扩展 DTO 与 ports 签名未作为包根 API 实施；当前六个根入口以上方“六包的输入、输出和状态”表及各包 API 参考为准。它们只能在出现版本协商、独立消费者或状态追踪需求时，经新的实现计划后采用。

##### Site

- `buildHomepageModel(input)` 接受 `{ collections: { lifePosts: SitePostV1[], blogPosts: SitePostV1[] }, config: { site: SiteConfigV1, book: BookConfigV1 }, dailyQuote: DailyQuoteSnapshot | null }`，返回 `Result<SitePageModel>`。Astro adapter 先把集合记录转为 `SitePostV1`；模型函数不接收 Astro 内部对象、不做网络或文件 I/O。
- `fetchDailyQuote(input, ports)` 接受 `{ date: string, previous?: DailyQuoteSnapshot, timeoutMs?: number }`，返回 `Promise<Result<QuoteFetchResult>>`。返回 `fresh/retained/unavailable` 属于领域状态；快照持久化由 Site CLI 执行。

##### Book Build

- `buildBook(input)` 接受 `{ document: BookDocumentV1, config: BookConfigV1 }`，返回 `Result<BookRuntimePayloadV1>`。这是同步纯函数；不访问网络、进程、DOM 或文件系统。
- `loadThemeAssets({ themeId }, host)` 是 Vite/Astro 专用资源适配入口，返回 `Result<BookThemeAssets>` 或资源 manifest。它不得从 Node 默认入口导入 Vite 的 `?raw` 模块。

##### Book Runtime

- `mountBook(input)` 接受 `{ root: HTMLElement, payload: BookRuntimePayloadV1, theme: BookThemeAssets }`，异步返回 `Promise<Result<RuntimeHandle>>`。`RuntimeHandle` 提供 `getSnapshot()`、`subscribe(listener)`、`goToArticle(articleId)` 和 `destroy()`；导航状态是 `navigated/not-found/not-ready`，snapshot 含阶段、最终页数、已挂载文章数和 diagnostics。
- `root`、`theme` 和 handle 是宿主资源，不是 JSON DTO。调用方负责持有并销毁 handle；Runtime 销毁自身创建的监听器、计时器和插件资源。

##### Publishing

- `planArticle(input)` 接受 `{ request, repositorySnapshot }`，返回 `Result<PublicationPlan>`；计划含经过校验的仓库相对路径和待提交内容摘要，不含凭据。
- `executePublication(plan, ports)` 接受提交计划和远程 Git capability，返回 `Promise<Result<PublicationResult>>`。request 为 `{ requestId, title?, body: { format: 'markdown' | 'text' | 'html', content }, images: Array<{ filename?, mediaType, base64 }>, submittedAt? }`。
- `PublicationResult` 含 `{ operationId, status, commit: { branch, sha } | null, changedPaths, diagnostics }`。认证属于 HTTP adapter；返回内容不含正文或图片 bytes。

##### Operations

- `runHealthChecks(input, ports)` 接受 `{ profile: 'production' | 'local', target: { siteUrl, webhookUrl, serviceName, environmentFile }, deadlineMs? }`，返回 `Promise<Result<HealthReport>>`。CLI 从受信配置构造 input/ports，不从不可信参数拼 shell 命令。
- `HealthReport` 含 `{ status, profile, startedAt, durationMs, checks: Array<{ id, status, attempts, durationMs, diagnostic? }> }`。探针 stdout/stderr 原文不进入报告。

##### Tooling

- `inspectRepository(input, ports)` 接受 `{ root, checks?: CheckId[] }`，缺省运行全部只读检查，返回 `Promise<Result<RepositoryReport>>`。报告含 `passed/failed`、package 清单和结构化诊断；诊断给出规则 code、package、仓库相对路径和修复提示。
- `generateReferences(input, ports)` 接受 `{ root, mode: 'check' | 'write' }`，返回 `Promise<Result<GenerationReport>>`。报告含 `unchanged/written/stale/failed` 和目标文件；`check` 不写盘，只有 `write` 可修改生成产物。

Site 的 package API 面向其 Astro routes，不承诺是通用 Site SDK。主题 CSS 的打包方式、`SiteConfig`/`BookConfig` schema 引用和 `DailyQuoteSnapshot` 原始字段，以模块 API 参考和生成配置为权威；page model 边界不能退化为各 route 手工重演 Book Build 的组装顺序。

```ts
type SitePageModel = {
  page: { title: string; description: string };
  book: BookRuntimePayloadV1;
  navigation: SiteNavigation;
  footer: SiteFooter;
  styles: { tokensCss: string; pageCss: string };
  theme: { id: string; measurementCss: { article: string; toc: string } };
  quote: QuoteDisplay;
};

type DailyQuoteSnapshot = {
  date: string;
  english: string;
  chinese: string;
  author: string;
  source: 'shanbay' | 'youdao' | 'fallback';
};
```

`BookConfigV1` 的完整字段与默认值引用 Book Build 唯一 schema；`SiteConfig` 的完整字段引用 Site 唯一 schema。上列未展开的 `SiteNavigation`、`SiteFooter`、`QuoteDisplay` 必须在实施时从实际消费组件推导出最小 JSON 形状，不能直接复制整份 `BookConfig` 或传递 Astro collection 内部对象。

### 包间协作和版本契约

下图只展示 package API 和运行期数据边界；部署过程中的 HTTP/Git 与 npm 源码依赖不是同一种关系。

```text
                 Astro collections + Site config/theme CSS
                              |
                              v
+-----------+  BookDocument  +------------+  articles/toc/config   +-------------+
| Site app  | -------------> | Book Build | ---------------------> | Book Runtime|
| workspace |                | workspace  |   browser DOM + CSS    | (browser)   |
+-----------+                +------------+                        +-------------+
      |                           ^                                      |
      +-- Site BookShell/theme/assets ---- HTML/CSS/JS + JSON payload ---+
                              |
                              v
                      deployed static Site

mobile request --> Publishing --> Git hosting: committed / conflict / unknown
                      ^                    |
                      | config/runtime     +--> content commit --> Site build
                      |
               Operations observes Site + webhook service

Tooling --read-only checks--> six package manifests / exports / schemas / tests
Root workspace --install/test/release-check--> all six packages (no public publish)
```

| 依赖方         | 上游与契约                                                                      | 依赖类型及约束                                                                    |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Site           | 调用 Book Build `buildBook`；浏览器交付由 BookShell/Runtime Assets 资源组合提供 | 依赖 Book Build 与 Runtime workspace 包；集合读取和页面渲染仍由 Astro routes 持有 |
| Book Build     | `buildBook({ document, config })` 返回文章、目录和配置                          | 不读取 Astro 集合、不访问浏览器 DOM；主题与书壳是宿主集成子路径                   |
| Book Runtime   | `paginateBook(payload)` 消费载荷与浏览器测量环境                                | 返回物理页面及导航映射；Astro Assets 管理 Turn.js bootstrap                       |
| Publishing     | `startServer()` 启动 HTTP webhook 服务                                          | 不依赖 Site 源码；HTTP/Git 写入由服务内部执行                                     |
| Operations     | `runHealthChecks()` 执行配置的主机/服务探针                                     | 不调用 Publishing 私有函数，不自动修复或重启服务                                  |
| Tooling        | `inspectRepository(input?)` 执行只读检查；参考资料写入由独立 CLI 执行           | 开发期 workspace；不导入包内私有实现                                              |
| Root workspace | 安装、构建、验证并协调六个 workspace 包                                         | 使用一个 lockfile；各包独立维护版本且当前 `private: true`                         |

当前协作使用 workspace 声明的包名、登记的 exports、Book Build 输出对象、Astro 编译时组件以及 webhook/探针的外部协议。当前 DTO 尚未普遍带独立协议版本字段；如果引入跨仓库消费者，再按兼容性要求添加版本协商。包 API 依赖、HTML/JSON/CSS 产物、HTTP 调用和 Git 写入是不同关系，不可用源码依赖图代替。

所有依赖关系还须有构建期/运行期/开发期分类，不能仅靠一列泛化的 `dependencies` 推断。若 `book-runtime` 的 `peerDependency` 需要真实 JavaScript import 才成立，评审后调整为独立、最小的共享协议包；不能为了版本协调让 Runtime 依赖 Book Build 实现。

版本协作按协议影响而不是按改动目录决定：

- 只修复实现且公开输入/输出完全不变：对应包 patch。
- 新增可选字段、向后兼容入口或新状态：对应生产者 minor；消费者选择是否升级及是否适配。
- 移除/重命名字段、改变状态含义、成功判据或必要输入：生产者 major；所有直接依赖包升级其兼容范围并通过契约测试后才能集成。
- Site、Operations、Tooling 等 private workspace package 仍有各自版本，但只有定义了消费约定的 package 才参与 SemVer 承诺；私有应用版本服务于可追溯部署，不意味着 npm registry 可安装。
- 发布当前关闭。后续启用外部 registry 发布必须另审包名、访问权限、LICENSE、依赖可安装性、产物/来源审查、provenance、不可复用版本号、凭据和部分发布恢复流程。

### 状态、错误与可观测结果

统一诊断用机器稳定 code 和责任阶段，业务状态由 package 分别定义。结果中可有多条诊断，CLI/HTTP/UI 负责展示，库函数不直接打印 stdout。

```ts
type Diagnostic = {
  code: string;
  phase: string;
  severity: 'info' | 'warning' | 'error';
  retryable: boolean;
  message: string;
  details?: Record<string, string | number | boolean | null>;
};
```

调用者依据 `status` 和 `code` 分支，不解析可调整的 `message`。`details` 只能含经白名单筛选的定位字段；不得包含 token、请求鉴权头、文章正文、图片数据、环境变量值或未脱敏远程响应。

模块诊断 code 使用稳定的模块前缀和原因，例如 `SITE_INVALID_CONTENT_DATE`、`BOOK_NAVIGATION_KEY_COLLISION`、`RUNTIME_TOC_CALIBRATION_FAILED`、`PUBLISH_REF_CONFLICT`、`PUBLISH_RESULT_UNKNOWN`、`OPS_PROBE_TIMED_OUT` 和 `TOOLING_GENERATED_REFERENCE_STALE`。错误 code 表必须随对应包的 API 参考及正反测试维护；HTTP status/CLI exit code 是 adapter 对领域诊断的映射，不能取代领域错误身份。

| 包           | 操作状态                                                                                                                                         | 状态转换及失败判据                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site         | `building` → `ready`；引语子结果为 `fresh`、`retained` 或 `unavailable`                                                                          | 内容选择、配置或 Book Build 失败则整体构建失败，不输出部分首页。引语上游失败保留 previous 时是 `retained`，不是 fresh；无可用旧值是 `unavailable`                                                                                  |
| Book Build   | `validating` → `building` → `ready`，错误终态 `failed`                                                                                           | 纯同步调用返回 `Result<BookRuntimePayloadV1>`；无效模型/配置、重复导航 key 和非 JSON-safe 输出返回诊断，不返回半成品；意外程序错误仍由宿主处理                                                                                     |
| Book Runtime | `waiting-for-dom` → `measuring` → `paginating` → `calibrating` → `ready`；错误终态 `degraded`、`failed`、`destroyed`                             | `degraded` 只用于定义明确且可观察的后备呈现，必须说明缺少的能力；DOM/数据不可继续挂载为 `failed`；清理完成为 `destroyed`。销毁必须解除 Runtime 自己拥有的监听、计时器和插件资源；若第三方资源不能可靠清理，则不能宣称 destroy 完整 |
| Publishing   | `validating` → `planning` → `reading-remote` → `creating-commit` → `updating-ref`；终态 `committed`、`rejected`、`conflict`、`failed`、`unknown` | `unknown` 是提交远端结果超时或响应丢失且 ref 状态未核实；不是失败、不是可安全重试。`conflict` 是 ref 条件更新明确失败。鉴权拒绝属于 HTTP adapter 403，不回传到发布内容服务的成功态                                                 |
| Operations   | 总体 `healthy`、`unhealthy`、`incomplete`；单项 `passed`、`failed`、`timed-out`、`skipped`                                                       | 一项失败后仍执行独立检查；超出 profile 总截止时间或关键探针无法执行为 incomplete。报告给出每项耗时、尝试数和固定 code                                                                                                              |
| Tooling      | 检查 `passed/failed`；派生文件 `unchanged/written/stale/failed`                                                                                  | 诊断含 package name、规则 ID、仓库相对路径和修复方向；写操作只有 `mode: write` 才会发生。exit code 不代替结构化结果                                                                                                                |

可能因输入、资源或外部依赖失败的跨包任务以 `{ ok, value | diagnostics }` 表达可预期失败；保证全定义域有效的纯函数直接返回领域值，不用 `{ status: 'success' }` 包装。业务状态保留在对应结果模型中（例如 `PublicationResult.status`），不与函数调用是否成功混为一谈。意外程序错误由宿主 adapter 捕获、补充操作上下文并转换为进程/HTTP 故障；不得吞错。诊断 `retryable: true` 只用于相同输入、相同远端状态下可证明安全的重试；未知远端写入一律不能盲目重试。

### 实施边界和验收

按 [六包实施计划](../changes/2026-10-06-independent-workspace-packages/plan.md) 逐阶段迁移；每包完成 API、测试和文档验收后再拆除旧源码位置，不先批量迁移目录。

1. **包骨架与契约验证。** 创建六个 workspace manifests、明确 package names/exports/dependencies；制定 `BookDocumentV1`、`BookRuntimePayloadV1`、PublishingRequest/Result、HealthReport、Tooling Diagnostic schema；通过 npm 包名自引用与 pack 文件检查证明导出边界。清点现有魔法值，将环境策略/默认值迁至唯一配置或 schema，将真正的算法不变量命名并验证。
2. **Book Build。** 封装配置默认与渲染步骤，定义唯一浏览器载荷 schema，消除载荷字段重复和导航 key 碰撞；输出结构化构建错误。
3. **Book Runtime。** 仅消费声明版本的浏览器载荷；实现任务级 mount controller、状态订阅和可验证资源销毁；端到端验证文字连续、导航定位、失败与销毁清理。不可收敛必须停止输出错误映射。
4. **Site。** 迁移为 workspace 应用包，提供页面级组合和独立 build artifact；仅由 Site 调用 Book Build/Runtime 完成翻页页面，确认未把 Site policy 反向塞入通用书籍包。
5. **Publishing 与 Operations。** 去除内容写入对 Site 源码路径的隐式依赖，采用显式、白名单化路径映射配置；结果区分提交/冲突/失败/未知；观测报告提供逐探针证据。HTTP webhook wire contract 变更单独审查，不能随 package 迁移悄然更改。
6. **Tooling 与根协调。** 将现有边界和文档检查转换为对 workspace package manifests/exports/contracts 的检查；根命令明确 fan-out 顺序、失败短路和报告汇总；Changesets 只准备版本，不 publish。
7. **每包资料迁移。** 每包 README 定义输入、输出、上游/下游、安装前置和最小例子；`docs/reference/api.md` 逐个定义公开 export、每个函数的全部参数和返回字段、默认值、单位/边界、用途、错误、副作用、所有权和调用示例，并链接对应契约测试；设计文档提供包协作 ASCII 图。删除已失效的路径文档，不建立中转页。

集成顺序用兼容的 workspace ranges 约束，CI 验证完整 DAG。分别执行每包 unit/build、跨包 consumer-contract test、`npm run verify`、`npm run test:e2e`、每包 `npm pack --dry-run` 及隔离安装 smoke test。变更配置、业务 URL、webhook 语义、部署目标、第三方 vendor 内容或凭据都不由本 ADR 自动授权。

函数式边界的测试至少覆盖：纯函数相同输入得到相同输出且没有 I/O；调用者修改输入不会改变已返回快照；导入包不会启动服务或产生外部请求；副作用函数通过替身 ports 验证请求、截止时间、失败映射和重试边界；Runtime 在成功、失败及重复销毁路径都释放自己持有的资源。跨包测试通过公开 exports 和版本化 DTO 调用，不直接导入对方 `internal/`。

必须能用最终设计回答：

- 每一个包是否有一条普通调用路径，输入完全由哪个调用者负责，输出由哪个消费者负责？
- 每个跨包字段的 schema、生产者版本与兼容范围是否明确？
- Site 首页面、单独 JSON 书、移动端提交、运维探针和文档门禁是否全部有成功与失败用例？
- package tarball 是否包含运行所需资源，不依赖单仓的 sibling 相对路径或环境遗留？
- Publishing 的 `unknown` 是否能实际阻止盲目重试，Operations 是否能显示各阶段诊断，Runtime 是否可验证资源销毁？
- 单包变化时，哪些包要升级，哪些旧版本消费者仍可运行，根 Site 选择了哪些互相兼容版本？

## 后果

实施完成后，源码仍在一个仓库，但六个 package 成为可分别版本化、测试和通过 `exports` 限制入口的交付单元。根目录只新增统一的 `packages/` 源码容器，不为每个包再在根创建一套并列源码树。

本 ADR 已替代 ADR 0004 中“暂不拆分为独立 package、由单一根项目统一交付”的交付选择；ADR 0004 关于明确模块边界、公开 API、删除旧入口和保持单一资料位置的要求仍然有效。实施时同步更新架构总览并保留 0004 中未被替代的选择。

协调复杂度会从相对路径和“同一提交一起升级”转为版本范围与契约兼容。每次跨包协议变更要同时提交生产者、消费者、schema 和 changeset，但只有变化的包及必须兼容的消费者需 bump。npm workspaces 只提供本地管理/链接；它本身不承诺独立 SemVer 发版或公共分发。

Site 和 Tooling 虽可版本化，仍然是应用和内部工具；不是因为有 `package.json` 就可视为稳定公共库。Publishing 和 Operations 需要显式部署 profile 及 package 版本对齐，不能依赖“生产服务器刚好有源码目录”。浏览器资源和 Astro integration 的真实 tarball 兼容仍须专门验证，不能由 Node `exports` 检查替代。

这是范围较大的架构变化。应以兼容契约顺序迁移，逐个 package 保持可构建、可回退，不把六包全部重写为一次不分阶段的跨模块替换。

## 再评估条件

- 某模块没有独立调用者、可定义的 exports 或独立语义版本边界：考虑它是否实际是 Site 的子模块，而非为满足数量目标保留伪 package。
- Site 发布为 private workspace 后仍需单独源码构建和部署：保留 app package 版本，但不生成虚构的 npm registry release。
- Book Runtime 与 Book Build 的 payload 版本需要同步发布：优先契约测试和 peer range；若不能减少循环依赖，再评估独立 book-contracts 包，不预先创建第七个包。
- Operations 与 Publishing 的服务资源不能以可安装包清晰交付：重新界定 package 和 deployment artifact 的责任，不能以复制 CLI 文件绕过依赖。
- 发现外部消费者或准备 registry publish：补充包名、scope、可见性、许可证、Node/浏览器支持矩阵、精确 `exports`、清单文件、Provenance/凭据及 staged 发布恢复决策。
- 某 package 频繁 major 升级或依赖循环使独立版本没有收益：复审其契约边界，不能只关闭版本校验或统一重发掩盖问题。

---
