---
id: 'docs-architecture-overview'
type: 'architecture'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: '跨模块工程'
owner: '项目维护者'
parent: 'README.md'
related:
  - 'docs/standards/documentation.md'
  - 'docs/architecture/runtime-and-deployment.md'
---

# 系统架构与设计原则

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

系统将仓库文章和图片交付为传统文章页面与浏览器翻页书，并接收受控移动客户端的内容提交。设计需同时满足三类任务：

- 作者能提交正文和图片，辨认仓库写入是否完成，并在结果不确定时核对状态。
- 读者能访问文章、连续阅读书籍，在受测尺寸下保留正文文本和顺序。
- 维护者能定位内容提交、构建、部署或浏览器排版中的失败，而不把局部成功当成整条链路成功。

优先级为内容完整与恢复、契约可维护、故障可诊断、设备可用。具体判据和覆盖限制见 [Q1—Q9 质量场景](context-and-quality.md) 和 [全局测试方案](../testing/strategy.md)。

## 范围与约束

六个私有 workspace 包共享仓库和锁文件，各包分别维护版本。Astro `srcDir` 指向 `packages/site/src`。当前不提供多人 CMS、匿名投稿、任意 HTML 沙箱或 registry 发布。

Astro 路由、内容和实例配置由 Site 拥有。Book Build 不读取 Astro 集合；Runtime 在浏览器处理 DOM，不访问服务器内容目录。

跨模块源码调用只允许清单登记的 api 入口，依赖方向受 [模块清单](../../packages/tooling/src/modules.json) 检查。

HTML 来源按受信作者处理；Webhook 使用共享秘密而非多用户认证。浏览器资源通过 Astro/Vite 打包，public 保存静态资产及第三方原件，不作为项目运行时源码入口。生产凭据不进入页面、示例或测试。

## 系统上下文

图 1：系统上下文。框内为本项目交付的能力，框外为使用者及外部平台；箭头表示内容、请求或交付，不表示源码 import。

```text
作者 -- JSON 正文/图片 --> +------------------------------+
                         | Blog                         |
读者 -- HTTPS 阅读 ------>| 静态文章 + 浏览器翻页书       |
维护者 -- 修改/验收 ------>| 内容提交 + 只读巡检          |
                         +------------------------------+
                           |           |              |
                     Git Data API   资源请求       状态探针
                           v           v              v
                        GitHub     字体/评论服务   Nginx/systemd
                           |
                      CI 事件/产物
                           v
                     GitHub Actions
                           |
                        SSH/rsync
                           v
                     生产主机/Nginx -- 静态文件 --> 读者
```

- GitHub 存储代码与内容；
- Actions 验证和交付；
- 生产主机提供静态文件及发布入口。字体加载会改变分页，评论服务失败影响评论，每日一句更新失败影响快照新鲜度；
- 不能笼统承诺外部服务失败不影响展示。

## 模块与依赖

### 源码依赖

图 2：模块源码依赖。A --> B 表示 A 可导入 B 的登记公开入口，不表示任意文件可访问。

```text
Site ------------------> Book Build
  |
  +--------------------> Book Runtime

Tooling ---------------> Site
  |
  +--------------------> Book Build

Publishing              Operations
  无应用模块源码依赖       无应用模块源码依赖
```

Publishing 仍依赖内容路径约定；Operations 仍通过命令/HTTP 观察服务；Runtime 仍消费构建载荷。它们的源码无依赖不等于协议、运行或部署完全独立。

### 目录组织

图 3：六个受控模块、全局测试和根入口。模块目录不是独立进程；内部责任见模块 README。

```text
blog/
+-- README.md / AGENTS.md           项目与代理入口
+-- package.json / package-lock.json  命令与依赖
+-- astro.config.mjs / tsconfig.json  应用与类型配置
+-- packages/
|   +-- site/          Astro 源码、内容、配置、API、测试、文档
|   +-- book-build/    API、组装/渲染内部实现、测试、文档
|   +-- book-runtime/  浏览器 API、分页/导航内部实现、测试、文档
|   +-- publishing/    API、HTTP/Git 内部实现、CLI、测试、文档
|   +-- operations/    API、探针内部实现、CLI/资产、测试、文档
|   +-- tooling/       检查/生成器、配置、模块清单、测试、文档
+-- public/            图片、字体和第三方原件
+-- docs/              跨模块架构/协议/规范/验收/交付
+-- tests/
|   +-- integration/   跨模块、构建产物和部署契约
|   +-- e2e/           浏览器排版与交互
+-- .github/workflows/ 站点与服务工作流
```

根只保留需要直接发现的项目入口与 Astro/TypeScript 配置；ESLint 和 Playwright 配置由 npm 显式定位到 Tooling。贡献流程位于 `docs/guides/contributing.md`，不保留旧根文件或跳转页。

生成目录 `dist/`、`.astro/`、`test-results/` 与安装目录 `node_modules/` 不画成源码模块，也不计入六模块拥有关系。

### 责任与接口

| 模块         | 独立责任                                        | 主要调用入口与完整参考                                                                     |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Site         | 内容可见性、排序、路由及页面组合                | `buildHomepageModel(input)`；[接口](../../packages/site/docs/reference/api.md)             |
| Book Build   | 来源无关的模型、渲染、配置和 CSS 样式转换       | `buildBook({ document, config })`；[接口](../../packages/book-build/docs/reference/api.md) |
| Book Runtime | 浏览器测量、分页、映射与缓存                    | `paginateBook(payload)`；[接口](../../packages/book-runtime/docs/reference/api.md)         |
| Publishing   | 输入转换、文件计划、GitHub 提交和 HTTP 生命周期 | `startServer()`；[接口](../../packages/publishing/docs/reference/api.md)                   |
| Operations   | 探针定义、执行重试和分项报告                    | `runHealthChecks()`；[接口](../../packages/operations/docs/reference/api.md)               |
| Tooling      | 源码边界、文档契约和配置参考派生                | `inspectRepository(input?)`；[接口](../../packages/tooling/docs/reference/api.md)          |

表为主要入口摘要，不是完整白名单。Book 的类型、Schema、打包主题及 Runtime browser-entry 等公开资源以清单 entries 和模块参考为准，禁止根据摘要自行导入内部文件。

## 数据与契约

### 核心术语

| 术语                     | 含义、单位与使用边界                         | 责任/权威资料                                                                 |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------- |
| BookDocument / entry     | 来源无关的书与内容条目；不是浏览器 DOM       | Book Build [接口](../../packages/book-build/docs/reference/api.md)            |
| id / collection          | 条目的来源身份与集合标签；不使用动态页码代替 | Site/Book 模型                                                                |
| key                      | 当前有限哈希深链接键；不保证无碰撞           | [运行契约](../reference/book-runtime-contract.md)                             |
| 物理页                   | 运行时插件寻址用页；与内容身份不同           | Runtime 运行契约                                                              |
| 显示页码                 | 阅读呈现页码；不能默认等于物理页             | Runtime [分页算法](../../packages/book-runtime/docs/algorithms/pagination.md) |
| bodyStart / articleStart | 正文或文章映射起点；具体索引基准按协议       | Runtime 运行契约                                                              |
| width / height           | 测量尺寸，CSS px；不是设备物理像素           | Book 配置及 Runtime                                                           |
| date / timestamp         | 文章日期与 Unix 毫秒不同；UTC 派生规则见接口 | Site/Publishing                                                               |
| PublicationPlan          | 写入及删除项和提交信息；计划不代表已提交     | Publishing [接口](../../packages/publishing/docs/reference/api.md)            |
| ref / commit / dist      | 分支指针、Git 提交、静态构建产物；三者不等价 | Publishing 与交付工作流                                                       |

协议字段由对应参考定义；本文只统一术语，不复制字段表。

### 边界与所有权

构建期通过 HTML、JSON 和 CSS 向浏览器交付，不传递服务端对象引用。模块内部不是全面不可变：Site 条目可能共享原 data/Date，配置和运行时对象也各有所有权约束。调用者必须遵守具体接口，不推断“数组已复制”就等于深拷贝。

发布计划的正文、图片和删除项聚合到一个 tree/commit；只有 ref 成功指向该提交，目标分支才展示新状态。提交成功不等于 Actions 构建或部署成功。布局重算可能改变物理页，不改变文稿身份。

## 运行与部署

图 4：运行与交付单元。实线箭头标签说明数据或协议；两个 workflow 不是一个原子事务。

```text
GitHub 仓库
   |
   +-- deploy.yml --> Node/Astro 构建机
   |                     |
   |                verify (含 build) + Chromium/WebKit E2E
   |                     |
   |                verified-dist artifact
   |                     |
   |                  SSH/rsync --> Nginx 静态目录
   |                                      |
   |                                   HTTPS --> 读者浏览器
   |                                              |
   |                                        DOM 测量/分页
   |
   +-- deploy-webhook.yml --> 服务源码/锁文件/service 同步
                                      |
                                 systemd Node 进程
                                      ^
作者 -- HTTPS POST /webhook --> Nginx -- HTTP --> 127.0.0.1:9000
                                      |
                                  GitHub API --> ref

Operations CLI -- shell/HTTP 只读探针 --> Nginx + 服务 + 公网首页
```

- 目录模块不是部署容器。Site 与 Book 在构建进程运行；
- Runtime 在浏览器运行；
- Publishing 常驻 Node 服务；
- Operations 按需执行；
- Tooling 在开发机/CI 运行。两个 workflow 共享仓库、锁文件及主机，单独成功不能证明另一条完成。

verify 已包含 build，不另重复构建后替换已验证产物。详细阶段、失败判据和部署限制见 [运行视图](runtime-and-deployment.md) 与 [交付指南](../operations/deployment.md)。

## 设计取舍

- **Site 与 Book 分离**：合并可以减少适配层，但会把集合政策带入通用渲染。当前选择来源适配统一模型，成本是维护明确的模型契约，收益是 JSON 等来源可独立构建。
- **浏览器最终分页**：构建预分页无法取得读者字体和 viewport；浏览器测量更接近实际布局，但增加启动成本和资源就绪问题，不保证所有终端无溢出。
- **单仓目录模块而非多 npm 包**：共享安装与发版减少版本协调成本；隔离依赖仍需静态门禁。出现独立消费者、权限或发版周期后再评估拆包/分服务。
- **Git Data API 而非服务端工作树提交**：减少本地 Git 索引与脏文件依赖；代价是远程请求、配额、引用冲突和结果不确定性。实例内队列不提供跨进程事务。

## 风险与验证

Node 用例验证确定性转换、规划和替身请求；Chromium/WebKit 用例验证受测几何和交互；静态门禁验证有限结构。任何一层都不能独立证明需求、文档语义、真实 GitHub 或全设备兼容。

当前重要缺口包括发布体积/速率和幂等策略、跨进程及网络不确定结果恢复、多实例插件生命周期、Safari/iOS、性能基线及生产恢复演练。HTTP 鉴权、状态映射和实例队列已有回环案例。详见 [风险台账](evolution.md)。

改动时引用 Q 场景、核对消费者和交付边界，记录实际执行环境与未覆盖项，不用历史绿灯替代本轮验证。
