---
id: 'independent-workspace-packages-plan'
type: 'record'
status: 'active'
created: '2026-10-06'
modified: '2026-10-06'
scope: '六个独立版本 workspace 包与模块 API 重构'
owner: '项目维护者'
parent: 'docs/changes/README.md'
related:
  - 'docs/decisions/0005-task-oriented-module-apis.md'
  - 'docs/decisions/0004-physical-modules-and-public-api.md'
  - 'docs/standards/documentation.md'
  - 'docs/standards/testing.md'
  - 'packages/tooling/src/modules.json'
---

# 六个独立版本 workspace 包重构计划

目录：

- [范围](#范围)
- [实施记录](#实施记录)
- [验证证据](#验证证据)
- [剩余限制](#剩余限制)

> **面向 AI 代理的工作者：** 用户已批准 ADR 0005 的独立版本 workspace 包与“函数式核心 + 命令式边界”方向。执行此计划前先检查并保护当前 worktree；不得用 `git reset`、`git clean` 或覆盖式迁移清除既有修改。每个行为迁移先写失败测试，再实现最小改动。不得提交、推送、发布包、触碰真实凭据或执行生产操作。

**目标：** 将 Site、Book Build、Book Runtime、Publishing、Operations 和 Tooling 重构为六个各自版本化、具明确公开 API、文档和测试的 npm workspace 包。

**架构：** 根 `package.json` 仅协调私有 npm workspace、锁文件、集成门禁和版本检查。六个包分别维护实现、配置、测试、README、设计和 API 参考；跨包用明确函数和版本化数据契约协作。纯计算留在可测函数核心，网络、文件、Git、DOM 和进程操作留在显式宿主端口或资源句柄边界。

**技术栈：** Node.js ESM/CommonJS、npm workspaces、Astro、JSON Schema、JSDoc/TypeScript 契约检查、node:test、Playwright、Changesets、Prettier、ESLint。

---

## 范围

### 决策与非目标

- 六个包先作为私有 workspace 包在单仓库内独立版本化，不发布到任何 npm registry。
- 内部包名采用 `@myblog/site`、`@myblog/book-build`、`@myblog/book-runtime`、`@myblog/publishing`、`@myblog/operations` 和 `@myblog/tooling`；所有 manifest 保持 `private: true`。发布授权另行评审。
- Changesets 显式启用 private package version bump、关闭 tag，并只用于版本/依赖范围更新；根协调器不单独版本化，也不提供 publish 命令。
- 不新增第七个 contracts/runtime 包。结构性 `Result` 和 `Diagnostic` 在各 package API 类型中以同形类型表达，由 Tooling 的契约检查和跨包测试验证形状一致；不建立运行期循环依赖。
- 保留当前文章、配置、内容行为、Webhook wire contract、页面 URL、服务运行目标和部署结果语义。拆包本身不授权业务策略、鉴权、生产路径或外部服务变更。
- `public/vendor/` 是只读上游。Runtime 打包如需包含 vendor 文件，只允许构建时复制到生成产物，并以源文件摘要核验字节一致；不直接编辑、覆盖或删除上游目录。

### 文件结构和职责

| 目标路径                                                                                     | 职责                                                                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `package.json`、`package-lock.json`                                                          | 私有根 workspace、共享安装、串行全仓验证、集成/E2E 聚合、版本一致性检查；Astro 业务依赖不留在根  |
| `packages/site/`                                                                             | Astro 应用、站点公开 API、内容 adapter、页面、静态资源入口、Site 测试及模块文档                  |
| `packages/book-build/`                                                                       | BookDocument 校验/来源无关建模、HTML/目录组装、配置与主题 schema、Book Build 测试及模块文档      |
| `packages/book-runtime/`                                                                     | 浏览器入口、分页/导航、Astro 资源组件、资源生命周期、Runtime 测试及模块文档                      |
| `packages/publishing/`                                                                       | 发布请求模型、纯提交计划、Git/HTTP 执行端口、CLI、服务资源、测试及模块文档                       |
| `packages/operations/`                                                                       | 健康探针、纯报告聚合、CLI、systemd/deployment 资源、测试及模块文档                               |
| `packages/tooling/`                                                                          | 模块清单、文档/边界/契约检查、生成器、配置、CLI 和 Tooling 测试                                  |
| `tests/integration/`、`tests/e2e/`                                                           | 跨包消费者契约、完整构建、真实浏览器分页与页面验收；每个测试由权威模块清单登记                   |
| `docs/architecture/`、`docs/standards/`、`docs/testing/`、`docs/decisions/`、`docs/changes/` | 只放跨包架构、共享规范、全局集成策略、ADR 和变更证据；模块专项设计、算法、接口与操作文档随包移动 |
| `.changeset/`                                                                                | 私有包独立版本变更说明和 Changesets 配置；不包含发布凭据或 registry 发布工作流                   |

### 六个包的职责与数据流

```text
Astro content/config
       |
       v
  Site adapter -- JSON BookDocumentV1 --> Book Build
       |                                      |
       |                             BookRuntimePayloadV1
       |                                      v
       +-- HTML/CSS/JS + payload ----------> Book Runtime
                                              |
                                       browser DOM/handle

mobile request --> Publishing --> Git provider -- content commit --> Site build
                       ^
                       | HTTP adapter / CLI
Operations -- HTTP/process/file probes --> Site + Publishing service

Tooling -- read-only snapshots/contracts/docs/tests --> six packages
Root workspace -- install/version-check/build/test --> all six packages
```

图中每条关系只表示对应标签的 JSON、静态构建产物、HTTP、Git、探针或 workspace 协调，不把不同关系推断成源码 import。Site 是 Book Build 与 Book Runtime 的生产消费者；Publishing 不导入 Site；Operations 观测运行端点，不调用 Publishing 私有函数；Tooling 是开发期包。

### API、配置与文档验收定义

避免硬编码不等于禁止代码中的所有固定值。重构时逐项分类：

- 环境相关路径、URL、凭据、超时、重试、内容限额、默认值和可变化策略只能有一个权威配置或 Schema 来源；调用方不得在多个包重复维护副本。
- 协议字段、状态枚举和版本写入权威类型/Schema；消费者校验其支持的版本并对未知/不兼容输入明确失败。
- 仅由算法定义的固定条件用命名常量表达，标明单位/理由并有边界测试。除非用户或部署确实需要变化，不把这些内部不变量扩成每个调用都要传的参数。
- Tooling 静态检查重复配置值、散落的环境策略和未登记字段；人工评审确认算法常量是否为不变量。不得用全局禁用数字字面量规则代替语义判断。

每个 package 的 `docs/reference/api.md` 必须按公开 API 清单逐项覆盖，不能只写模块级简介。对每个 interface、function、component、CLI 命令或 HTTP endpoint 写明：

- **作用与调用场景**：解决什么任务，谁调用，运行于 Node、Astro、浏览器、CLI 还是 HTTP adapter。
- **每个输入参数/字段**：名称、类型、必填性、默认值及其权威来源、单位、允许范围、校验时点、用途、敏感性和非法输入行为。
- **返回值/输出字段**：同步或异步、完整类型、每个字段含义、状态值、成功判据、空值/部分结果规则、引用是否共享，以及资源由谁销毁。
- **错误与副作用**：稳定错误 code/phase、可否重试及前置核对、网络/文件/Git/DOM/进程副作用、超时和取消行为、日志脱敏边界。
- **调用示例与验证**：最小可执行成功例、至少一个失败例、对应测试名/测试路径、调用者应观察的结果。

目录、全字段表、示例和实现使用相同名称与单位；生成参考从单一 schema 派生。README 独立说明用途、能力限制、上下游、默认入口、配置、测试和文档导航；不能要求读者先读 API 参考才能理解模块用途。

## 实施记录

### 2026-10-06：workspace 骨架与 Book Build 首包迁移

- 根包已启用 `packages/*` workspace，并建立六个 `@myblog/*` 私有包 manifest；`package-lock.json` 已登记 workspace 依赖。版本管理工具和根级包验证脚本尚未接入。
- Book Build 源码从 `src/book/` 移至 `packages/book-build/src/`；README 与 `docs/` 放在包根，单元测试放在 `packages/book-build/tests/`。
- 当时 Site 通过 Book Build 子路径导入主题和 Astro 壳；该边界已由后续记录调整，当前 Site 自己持有 Astro 组件，六包只开放包根入口。
- 增加 Book Build TypeScript 声明，覆盖任务入口及宿主集成入口。当前实现的 `buildBook({ document, config })` 是同步任务 API；其实际模型和失败契约以包 API 参考为准，不以早期设计稿中未落地的 `BookDocumentV1` 草案替代。
- 已执行并通过：`npm run check:docs`、`npm run check:boundaries`、`npm run check:contracts`、`npm run check`、`npm run build`、`npm run --workspace @myblog/book-build test`，以及 Book Build 配置/架构/API 集成测试。
- `npm run format:check` 仍受工作区既有 `tests/e2e/test-pages-debug.spec.mjs` 格式问题阻断；未编辑该文件。模块清单集成测试也因此报告该未登记 E2E 文件；本轮不将它计入 Book Build 结果。

### 2026-10-06：六包任务级入口收敛（阶段记录，已被后续调整替代）

- 当时 Book Build 包根只导出 `buildBook({ document, config })`，资源通过子路径提供；当前包根还提供 `renderArticle` 和 `createBookTheme`，不再导出资源子路径。
- Publishing 包根只导出 `startServer()`；Operations 包根只导出 `runHealthChecks()`。对应 CLI 在模块内部处理打印、参数和退出状态。包根测试固定单任务导出，集成测试不再要求暴露规划函数、runner 或 report printer。
- 当时 Site、Runtime 和 Book Build 仍有集成子路径；当前 Site 根入口提供 `buildHomepageModel` 与 `inspectHomepageConfig`，Runtime 仅提供 `paginateBook`，Book Build 提供 `buildBook`、`renderArticle` 和 `createBookTheme`。所有包的 `package.json#exports` 只含 `.`。
- 六个包 README、API 参考和教程已切换到任务级入口；公开入口测试固定根导出和代表性结果。接口具体参数/结果、Astro 资源边界和失败状态以各包当前 API 参考及 `package.json#exports` 为准。
- Operations 与 Publishing 教程改为安全的测试走查，不再指导调用者直接执行内部实现，也不把启动生产探针/发布服务作为本地示例。Publishing 的 loopback HTTP 测试须在允许绑定本机端口的环境验证。
- 修正 Book Build README 文件树、测试规范中的过时函数示例、Operations/Publishing 设计说明的导出描述、systemd 集成断言的旧 CLI 路径，以及 Runtime 教程和跨模块契约中的旧接口描述。
- 同步当前架构图、模块操作/测试资料、Astro 配置说明及两条 GitHub Actions 的 workspace 路径；webhook 部署工作流现在传输 `packages/` 与根清单，使部署端 `npm ci` 能发现 workspace。Site 配置子入口增加 `.d.ts`，使 Tooling 消费者取得明确返回类型。
- 更新过期集成断言以检查实际 workspace 和任务级 API；把本地已有 Runtime 诊断 E2E 的归属登记到模块清单，未修改该文件内容。
- 本轮单包验证：Book Build 7/7、Book Runtime 37/37、Operations 7/7、Publishing 21/21、Site 24/24、Tooling 25/25；全仓 `npm run test:node` 173/173；布局和分页 E2E 11/11；六包 `npm pack --dry-run --workspaces` 通过。`npm ls --workspaces --depth=0`、`npm run check:docs`、`npm run check:contracts`、`npm run check:boundaries`、`npm run lint`、`npm run check`、`npm run build`、相关集成测试及 `git diff --check` 通过。
- 全量 `npm run verify` 在第一阶段 `format:check` 停止：报告 37 个文件未满足 Prettier，其中包括既有文章资料及未跟踪的 Runtime 调试测试；未批量格式化或改写这些文件。相关实现和文档本次修改文件已单独格式化。其后阶段通过各自命令验证，不能把这次 `verify` 记为整体通过。
- 六个根 API 的任务级收敛已完成；这不等于本计划所有工作完成。版本管理接入、各包完整消费隔离验证、六模块独立读者任务走查、E2E 和所有 pack 检查仍是单独验收项，不得据此宣称已完成。

### 2026-10-06：包边界与默认调用路径再次收敛

- 六个 workspace 包的 `exports` 均仅开放包根；跨包源码导入使用 `@myblog/<package>`，不再使用 `./theme`、`./shell`、`./assets` 等包内子路径。
- Site 负责 Astro 页面组合、书壳、Runtime 资源装载和浏览器启动；Book Build 负责书籍构建、文章渲染和主题 CSS 读取；Book Runtime 负责浏览器分页任务。站点及独立书籍路由从包根调用 Build 和 Runtime。
- `packages/README.md` 是包协作入口，说明六包职责、数据流、源码依赖和默认调用。各包自己的输入输出字段仍以包内 API 参考为准。
- 该轮已执行并通过：`npm run check:contracts`、`npm run check:docs`、`npm run check:boundaries`。全量 Node 测试中除 Publishing 的 6 个 loopback HTTP 用例因沙箱禁止监听 `127.0.0.1` 未能执行外，其余 169 项通过；需在允许本机回环监听的环境重跑全量测试。构建和 E2E 尚待验证。

### 阶段 0：工作区保护和可执行基线

- [ ] **步骤 0.1：保护当前差异。** 开始前列出 `git status --short`、未跟踪文件和文件移动；逐项确认本任务可编辑范围。若现有改动与待迁移目录重叠，先在变更说明中区分归属，不能假设它们可丢弃。
- [ ] **步骤 0.2：确认当前基线。** 在 `blog/` 运行 `npm run check:docs`、`npm run check:boundaries`、`npm run check:contracts`、`npm run check`、`npm run build` 和 `npm run test:node`；将成功、环境限制和当前未登记测试单独记录。未通过阶段修复归属或记为实施阻塞，不通过降低断言绕过。
- [ ] **步骤 0.3：确定迁移清单。** 使用 `packages/tooling/src/modules.json`、根配置、CI、服务和所有 docs 中的源码引用建立来源→目标映射。确认文章、JSON 内容、图片、vendor 原件、部署文件及生成文件各自是否移动、复制或留在根；任何删除必须在迁移前确认目标和来源。

### 阶段 1：先固定 API 与配置事实

- [ ] **步骤 1.1：为六包建立公开导出清单。** 每个包列出当前 `api/index.*` 导出、宿主调用点、所需常见任务、高级扩展和现有低层调用链；将目标 API 标为纯函数、副作用函数、宿主 adapter 或资源句柄。
- [ ] **步骤 1.2：建立契约测试反例。** 在 `tests/integration/public-api.test.mjs` 及各包单测中断言包根入口、JSON 输入/输出、`Result` 判别、错误 code、未知版本拒绝和导入无副作用。先运行新测试并确认其因目标入口/结果缺失而失败。
- [ ] **步骤 1.3：归一配置来源。** Book 配置以 `packages/book-build/src/api/book-config.schema.json` 为唯一 schema；Site 可变设置以 `packages/site/src/data/homepage-config.schema.json` 等实际现有 schema 为准。盘点 URL、限额、超时、重试、状态字段和目录布局常量，删除重复权威值；固定算法值提取命名常量，不擅自变成配置项。
- [ ] **步骤 1.4：定稿跨包 JSON 契约。** 为 `BookDocumentV1`、`BookRuntimePayloadV1`、发布请求/结果、健康报告和公共诊断写 JSON-safe schema/type 与正反样例。生产者负责生成/校验，消费者负责验证版本和边界；HTML 正文的信任/清洗策略按现有契约保持，不在拆包时更改。

### 阶段 2：建立 workspace 骨架和单包构建

- [ ] **步骤 2.1：添加六个 package manifests。** 创建 `packages/{site,book-build,book-runtime,publishing,operations,tooling}/package.json`，包名、`private`、独立版本、Node 版本、`files`、`exports`、依赖和脚本与各自运行环境一致；没有真实消费者的子路径不导出。
- [ ] **步骤 2.2：配置根协调器。** 修改根 `package.json` 的 workspaces 和脚本，使用 `packages/*`；生成并审查单一 `package-lock.json`。根的 `verify` 以确定顺序串行 fan-out，每包失败时保留 package 名、命令和退出码；根 Astro 业务依赖迁至 Site。
- [ ] **步骤 2.3：配置版本管理但禁发包。** 新增 `.changeset/config.json`：private package 可版本化、不生成 tag；新增每包 changeset 检查；不得加入 `changeset publish`、npm token 或自动 registry 上传命令。
- [ ] **步骤 2.4：建立包发现反例。** 更新 `tests/integration/module-layout.test.mjs` 与 Tooling 模块清单，让测试拒绝旧 `src/<module>` 源码树、越界 import、漏登记测试、未声明 `exports` 和非包名跨模块导入；测试从失败状态证明检查有效。

### 阶段 3：按依赖顺序迁移 Book Build 与 Book Runtime

- [x] **步骤 3.1：迁移并收敛 Book Build。** Book Build 已位于 `packages/book-build/`；包根只导出 `buildBook({ document, config })`，Site 以包名调用。当前 `BookDocument` 含 `Date`，不是早期草案里的 JSON-safe `BookDocumentV1`；key 碰撞拒绝和深层 JSON 输出校验仍未实现，作为独立契约缺口跟踪。配置 Schema 仍是唯一权威来源。
- [ ] **步骤 3.2：补齐 Book Build API 参考。** 为 `buildBook`、文档构造、渲染、主题列表/加载、Schema 和 Astro/Vite 主题资源入口逐项定义输入字段、返回结构、格式默认值、错误、是否纯函数、示例和测试链接。删除不是独立调用任务的低层导出。
- [x] **步骤 3.3：迁移 Runtime 并设计任务入口。** Runtime 已位于 `packages/book-runtime/`；包根 `paginateBook(payload)` 负责选择测量配置并协调分页、目录校准和映射。Astro Assets 管理页面装载和翻页插件；调用者不再调用 configure→paginate→cache→adapter 内部步骤，也不获得 `RuntimeHandle`。
- [ ] **步骤 3.4：固定 Runtime 失败和资源语义。** 挂载检查 `protocolVersion`、视口与主题输入；TOC 重测需重新校准导航；校准不收敛必须返回明确错误，不交付错误映射。状态快照、导航返回态、订阅退订和 `destroy()` 全部测试正常、失败、重入和重复清理。
- [ ] **步骤 3.5：验证 Runtime 交付资源。** 构建时从只读 vendor 源复制所需资产到包产物，使用清单和摘要断言字节不变；运行 `npm pack --dry-run --workspace=packages/book-runtime` 检查 tarball 含 browser entry、Astro 组件、CSS 和 vendor 资产，隔离消费测试验证资源 URL。

### 阶段 4：迁移 Site 与页面组合

- [x] **步骤 4.1：迁移 Astro 应用。** Astro 页面、内容、数据、组件、布局、样式、adapter、CLI、测试和 docs 已位于 `packages/site/`；`astro.config.mjs` 指向 `packages/site/src`，站点依赖由该 workspace 声明。当前页面/归档集成测试及静态构建通过。
- [x] **步骤 4.2：建立 Site 页面模型任务。** `buildHomepageModel(input)` 已负责内容集合适配、Book Build 调用、主题配置、样式与引语回退；输入是 Site 当前 Astro 集合对象及配置，不是早期提案中的 JSON-safe `SitePostV1[]`。Astro 页面仍拥有集合读取、Vite 主题加载和 HTML 渲染。
- [ ] **步骤 4.3：隔离引语网络和快照文件。** `fetchDailyQuote(input, ports)` 单独表达外部请求；日期、超时、fallback/retained 条件来自一个来源；CLI 负责读取与原子写入。替身测试覆盖成功、超时、坏响应、保留旧值和无旧值。
- [ ] **步骤 4.4：由 Site 组合 Runtime。** Site 仅从 `myblog-book-build`、`myblog-book-runtime` 声明入口导入；Astro 组件负责传 JSON payload 并装载 Runtime 资源。保留当前路由、静态输出和视觉/阅读行为断言；导航映射通过真实/受控分页验证。
- [ ] **步骤 4.5：逐函数补齐 Site API 文档。** 覆盖内容转换、页面模型、配置、主题、样式、引语和 CLI 每个公开入口；列每一输入字段和返回字段，指明 Astro-only 与 Node 可调用边界；最小命令使用本地 fixture，不访问引语上游。

### 阶段 5：迁移 Publishing 与 Operations

- [x] **步骤 5.1：迁移并收敛 Publishing 任务入口。** Publishing 位于 `packages/publishing/`，包根只导出显式启动 listener 的 `startServer()`，导入模块不监听。计划生成、GitHub transport 和 HTTP 请求处理均为服务内部职责；没有把低层步骤作为包根调用 API。
- [ ] **步骤 5.2：锁定提交结果契约。** 用注入 Git port 测试 `committed/rejected/conflict/failed/unknown`；`unknown` 不得自动重试；认证 wire contract、HTTP 状态码和 deploy/webhook workflow 保持当前语义。API 文档逐字段定义 request、plan、result、错误阶段、幂等及重试条件。
- [x] **步骤 5.3：迁移并收敛 Operations 任务入口。** Operations 位于 `packages/operations/`，包根 `runHealthChecks()` 执行固定探针并返回报告；CLI 输出报告和退出码。调用者不能注入任意 shell 命令，检查失败不会自动修复或重启服务。
- [ ] **步骤 5.4：完善运维契约与指南。** 每个 probe 文档定义输入 target、阈值/单位/超时来源、attempt 与 status 含义、输出诊断和机密过滤；systemd/deployment 资产准确引用包 CLI。只运行本地替身和只读探针，不执行服务器命令。

### 阶段 6：迁移 Tooling 并收敛根依赖图

- [x] **步骤 6.1：迁移工程工具。** 工程 API、CLI、配置、检查实现、测试、文档和 `modules.json` 已位于 `packages/tooling/`；清单登记六个 workspace 根、公开 exports、依赖及测试归属，Tooling 包根提供只读检查任务。
- [x] **步骤 6.2：收敛 Tooling 检查入口。** 包根 `inspectRepository(input?)` 仅执行只读检查并返回结构化报告；检查规则留在包内。派生参考的写入仍由 `npm run docs:generate` CLI 完成，不与只读根 API 合并。
- [ ] **步骤 6.3：更新所有仓库消费者。** 同步根 scripts、Astro 配置、ESLint/Playwright/TS 配置、GitHub Actions、daily-quote workflow、部署打包清单、服务资产和模块测试路径。对全文搜索发现的旧 `src/...` 引用逐项判定当前资料、历史归档或可执行配置；当前链接不得指向旧路径，历史文档保留时明确 historical。
- [ ] **步骤 6.4：验证版本和入口封装。** Tooling 检查六个 workspace 都 `private`、版本独立、依赖闭合、exports 可用、无跨包 `internal`/相对路径导入、无多份配置权威值、每项公开 API 有文档和测试对应关系。

### 阶段 7：每包文档与集成交付验收

- [ ] **步骤 7.1：完成六份模块 README。** 对 Site、Book Build、Book Runtime、Publishing、Operations、Tooling 分别写用途/限制、组成图、上下游、主要接口、最小示例、配置、测试和文档导航。图用朴素 ASCII，并区分源码 import、数据载荷、HTTP、Git、构建和部署。
- [ ] **步骤 7.2：完成模块设计与算法资料。** 将书籍分页/TOC 校准/文章映射、Book 组装/导航 key、Publishing 文件计划/远端提交、Operations probe 汇总、Tooling 契约/文档检查分别归属责任包；算法资料写问题、字段/单位、不变量、步骤、失败/终止、复杂度和独立测试案例。
- [ ] **步骤 7.3：逐成员审 API 文档。** 对照 `package.json#exports`、`api/index.*`、组件 props、CLI flags 和 HTTP routes 建清单；每个成员按本计划“API、配置与文档验收定义”逐字段写文档，示例执行并关联契约/边界测试。未文档化导出不允许进入 exports。
- [ ] **步骤 7.4：读者任务走查。** 六个包分别由未参与该包实现的人只读 README，完成“判断模块责任→找到默认 API→构造输入→找到错误处理→运行测试/验证”的任务；记录每个实际路径、阻塞点和结果，失败时修订 README 后重跑，不以链接存在代替走查。
- [ ] **步骤 7.5：完成工作区集成。** 根 `npm run verify` 串行跑格式、lint、契约、文档、边界、Astro check、build 和 Node tests；`npm run test:e2e` 验证 Runtime；六包 `npm pack --dry-run` 并用隔离 smoke consumer 导入公开 exports。失败阶段后续阶段标未执行，不伪报通过。
- [ ] **步骤 7.6：写真实完成记录。** 更新 `docs/changes/README.md` 与本目录完成记录，登记实际移动映射、API 迁移、配置单一来源、命令和退出码、E2E 环境、pack 验证、未验证风险。完成后将本计划和记录改为 historical；更新架构/ADR 的实现状态，不覆盖旧证据。

## 验证证据

### 当前规划基线

2026-10-06 规划时已观察到以下状态；它们是本轮真实 worktree 状态，不能视为后续重构结果：

- `npm run check:docs`、`npm run check:boundaries`、`npm run check:contracts`、`npm run lint`、`npm run check` 和 `npm run build` 均退出 0；Astro check 有 deprecated `z` hints。
- `npm run verify` 在首个 `format:check` 阶段停止，提示当前未跟踪 `tests/e2e/test-pages-debug.spec.mjs` 不符合 Prettier。不要直接格式化或删除该用户文件；实施前审阅并确认其归属。
- `npm run test:node` 有失败：部分 HTTP server 测试因运行环境拒绝本机监听而报 `EPERM`；`tests/integration/module-layout.test.mjs` 还发现上述未跟踪 E2E 文件没有在模块清单登记。要先区分沙箱限制和文件登记问题，不能把整轮 Node tests 写成通过。

### 最终验收命令

所有命令从项目根 `blog/` 执行。每条保留完整退出码和失败阶段：

```sh
npm run check:docs
npm run check:contracts
npm run check:boundaries
npm run lint
npm run check
npm run build
npm run test:node
npm run test:e2e
npm run verify
npm ls --workspaces --depth=0
npm pack --dry-run --workspace=packages/site
npm pack --dry-run --workspace=packages/book-build
npm pack --dry-run --workspace=packages/book-runtime
npm pack --dry-run --workspace=packages/publishing
npm pack --dry-run --workspace=packages/operations
npm pack --dry-run --workspace=packages/tooling
git diff --check
```

最终门槛：六个包根导入无私有路径、包版本独立且没有 publish workflow、无配置策略重复、每个公开成员有参数/返回字段/API 测试映射、单包测试与集成/E2E 覆盖其责任，所有内容原件和只读 vendor 文件均经路径/摘要核对。

## 剩余限制

- 本计划处于实施中；上述记录只说明已完成的工作区迁移与 API 收敛，不覆盖仍未执行的全量集成、读者走查、E2E、pack 及版本管理工作。
- 包名目前采用仓库私有的 `@myblog/*` 建议；如果用户希望使用组织 scope，需在创建 manifests 前调整一次名称并同步所有 imports。
- `public/vendor/` 只读资产的 package 交付方式必须以 tarball 检查验证，不得假设 workspace symlink 能代表独立消费。
- 本机监听受限的 Node 测试需要在获准的本地/CI 环境执行；若仍无法运行，完成记录明确标注范围，不降低测试门槛。
- 部署环境、真实 Git provider、凭据、线上内容更新、服务重启和 registry 发布均不属于本计划授权。
