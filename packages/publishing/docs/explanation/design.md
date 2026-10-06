---
id: 'scripts-publishing-docs-explanation-design'
type: 'module'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'publishing'
owner: 'Publishing 模块维护者'
parent: 'packages/publishing/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/publishing/docs/reference/api.md'
---

# 从移动创作到仓库提交的设计

目录：

- [问题与目标](#问题与目标)
- [范围与约束](#范围与约束)
- [内部组成](#内部组成)
- [数据与接口](#数据与接口)
- [关键流程](#关键流程)
- [设计取舍](#设计取舍)
- [失败与边界](#失败与边界)
- [验证与演进](#验证与演进)

## 问题与目标

移动客户端需要提交正文和图片，但不维护 Git 工作树、文件名映射或构建环境。服务器若依赖本地工作树，需要处理脏文件、锁和凭据；若正文和图片分次提交，分支可能暂时出现缺图文章。模块用远程 Git 数据 API 读取快照并组织一次提交。

Publishing 将正文、图片和同名副本删除项组成一个 tree/commit，最后通过一次 ref 更新让这些变更在目标分支一起可见。纯规划函数不写文件或访问网络；HTTP 服务器持有实例内 Promise 队列。

同名更新继承原日期和路径，客户端无需保存路径映射。Git 对象创建包含多个请求，不是可回滚事务，也不保证恰好一次交付。

本模块明确将生产静态站点的构建与部署、多租户内容管理系统（CMS）、高可用分布式消息队列以及协同编辑冲突协商列为非目标。模块独立运行，不依赖 `packages/site` 的内部实现，也不负责验证提交后的 Astro 构建是否成功。

## 范围与约束

在系统边界与生命周期划分上，发布流程被严格划分为互不耦合的两个阶段：

1. **内容发布阶段（Content Publication）**：移动端发起 HTTP 请求 → 服务端读取 GitHub 仓库快照 → 生成待变更文件计划 → 构建 Git Blob/Tree/Commit 对象 → 更新远程分支 Ref。此阶段由本模块全权负责，HTTP 200 响应仅代表目标分支的 Git Ref 已经成功指向新提交；
2. **站点发布阶段（Site Deployment）**：GitHub 分支产生变更 → 触发 CI/CD 自动化流水线（GitHub Actions） → 执行依赖安装、全站编译与静态产物同步 → 线上服务重载生效。该阶段属于全局运维范畴，由 `packages/operations` 协调管理。

在安全与输入假设方面，本模块目前基于受信任调用者模型：

- **认证机制**：工厂要求 token 为非空白字符串。trim 仅用于拒绝全空白配置，JSON body.token 与实例 token 仍按原值严格相等比较；字段名先 trim，Authorization 请求头不参与鉴权，未引入非对称签名或动态权限隔离；
- **资源限制**：当前内存收集请求体未设置硬性体积上限，图片字节直接通过 Base64 解码注入 Buffer，未集成深度文件幻数（Magic Number）嗅探与图像转码压缩；
- **不可强行覆盖他人提交**：更新远程分支 Ref 时严格声明 `force: false`，若在请求处理期间远程分支发生并发变动，GitHub API 将主动拒绝快进合并，防止静默冲掉他人的历史提交。

## 内部组成

下图表示运行调用边界，箭头是函数调用或 GitHub HTTP 请求；不是跨模块源码依赖。组件对应 internal 下的文件：

```text
运维脚本/服务启动器 (packages/publishing/src/cli/publish.cjs)
             |
             v
+-----------------------------------------------------------+
| Publishing 核心 API 边界 (packages/publishing/src/api/index.cjs)    |
|   |-- HTTP 接入层 (http.cjs) --------> 路由鉴权/收集 JSON/状态返回 |
|   |-- 输入解析层 (input.cjs) --------> 标题提取/排版换行/格式互转 |
|   |-- 发布规划层 (planning.cjs) -----> 图片路径推导/同名覆盖与去重 |
|   +-- GitHub 数据层 (github.cjs) ----> 树快照读取/Git 对象构建与提交 |
+-----------------------------------------------------------+
             |
             v
GitHub REST API (Git Database API)
  |-- GET repos/{owner}/{repo}/git/trees/{sha}?recursive=1
  |-- POST repos/{owner}/{repo}/git/blobs
  |-- POST repos/{owner}/{repo}/git/trees
  |-- POST repos/{owner}/{repo}/git/commits
  +-- PATCH repos/{owner}/{repo}/git/refs/heads/{branch}
```

各内部子系统的核心职责说明：

- **HTTP 接入层（`http.cjs`）**：负责监听指定端口、校验 Webhook Token、收集分块传输的 JSON 请求体，并在鉴权后管理实例内 Promise 队列，并将底层的业务结果映射为标准 HTTP 状态码；
- **输入解析层（`input.cjs`）**：负责解析客户端传入的 `raw`、`markdown` 或旧版 `html` 内容，执行移动端硬换行标准化与首行标题提取；
- **发布规划层（`planning.cjs`）**：对比仓库既有生活文稿（`packages/site/src/content/life/`），根据标题比对决定是新建文章还是覆盖原文章，生成包含待写入文件与待删除冗余文件的全量发布计划；
- **GitHub 数据层（`github.cjs`）**：读取快照、创建 Git 对象并更新 ref；注入 request 替身可离线核对请求参数，不需要本地 Git 工作树。

## 数据与接口

系统在处理发布请求时涉及的核心数据结构包含：

- **仓库快照状态（`RepositoryState`）**：包含目标分支的最新 `headCommitSha`、根树 `baseTreeSha`、全仓库既有文件路径集合 `existingPaths`，以及从 `packages/site/src/content/life/` 递归解析出的全部现有文稿对象列表；
- **发布计划（`PublicationPlan`）**：包含规范化的 Git 提交说明 `commitMessage`，以及文件操作项列表 `files`（每个文件项包含目标相对路径 `repoPath`、二进制内容 `content` 或删除标记 `delete: true`）。

文稿在仓库中的身份判定依据严格遵循“文稿标题（Frontmatter 中的 `title`）精确全等匹配”规则，而非依赖客户端上报的文件名或 URL Slug。

当仓库中存在多篇同名历史文稿时，规划器采用路径逆字典序（Reverse Lexicographical Order）选取唯一的标准文稿进行覆盖，并将其他同名历史副本标记为删除，确保内容库不会膨胀残留。

包根 API 只公开 `startServer()`，并且只有显式调用时才绑定固定监听地址。内容规划、Git 请求与 HTTP handler 是服务内部步骤；调用者不需要先调用规划、传递快照，再手工编排提交。

## 关键流程

发布模块处理移动端文章推送的标准生命周期包含请求路由、远程树快照读取、发布计划编制、Git 对象上传与分支指针前移：

```text
客户端发送 POST /webhook 请求 (包含 Token 与文章 JSON)
                 |
                 v
       HTTP 路由、JSON 解析与 body.token 鉴权
                 |-- Token 不匹配 ---------> [响应 HTTP 403]
                 |-- 非 POST 或未知路径 ---> [响应 HTTP 404]
                 |
                 v
   进入当前实例 pendingPublish Promise 队列
                 | (前项完成或失败后才执行)
                 v
   调用 github.loadRepositoryState()
   (拉取 HEAD 分支 Commit、递归 Tree 与所有 life 文稿 Blob)
                 |-- 读取失败 -------------> [响应 HTTP 400，输出错误原因]
                 |
                 v
   调用 planning.buildMobilePublication()
   (标题比对 -> 图片路径推导 -> 生成新增/覆盖/删除文件计划)
                 |-- 占位符数量不匹配 -----> [响应 HTTP 400，拒绝提交]
                 |
                 v
   调用 github.publishFiles() 构建底层 Git 对象
   |-- 1. 批量上传图片与 Markdown 内容为 Git Blobs
   |-- 2. 基于 baseTreeSha 创建新 Tree (删除项声明 sha: null)
   |-- 3. 以 headCommitSha 为唯一父节点创建新 Commit
   |-- 4. 发起 PATCH 更新分支 Ref (force: false)
                 |-- 触发快进冲突 ---------> [响应 HTTP 400，分支已被他人推进]
                 |
                 v
          [响应 HTTP 200 成功]
```

在整个提交流程中，所有文件被聚合为单一 Commit，因此避免了代码库中出现“有图片无正文”或“正文引用了尚未推送图片”的脏状态。Ref 更新前的错误不会由本请求推进分支，但已创建对象可能不可达。

PATCH 请求发送后的网络错误不能证明更新未发生；响应丢失时先核对目标 ref、文章路径及内容，再决定是否重发。

## 设计取舍

1. **直接调用 GitHub Git Database API vs. 本地 Git CLI 操作**：早期使用本地 Shell 执行 `git commit` 虽然直观，但要求服务器必须持有长期的磁盘写权限和完整的本地工作树，容易引发写锁与本地脏变更。采用远程 Git 数据 API 实现了不依赖本地工作树的提交；HTTP 服务仍持有实例内队列和未完成请求，部署需要考虑进程中断。
2. **基于标题匹配实现同名覆盖 vs. 强制要求客户端上报文件 ID**：移动端写作工具（如 iOS 备忘录、快捷指令）往往缺乏可靠的全局元数据存储能力。通过在服务端基于文稿标题反查历史路径，简化了移动端客户端的调用心智，换取了无需维护路径映射的调用方式。
3. **保留移动端原始硬换行规则 vs. 严格遵循 CommonMark 双空格换行**：移动端输入习惯倾向于单击回车即表达换行，若严格按标准 Markdown 忽略单回车，会导致随笔排版严重挤压变形。解析器在 `raw` 模式下自动保留硬换行，平衡了格式规范与创作直觉。

## 失败与边界

开发与维护过程中必须清晰识别如下系统边界与并发限制：

1. **并发提交拒绝策略**：每个 createWebhookServer 实例维护 pendingPublish Promise 链，将快照读取、规划与提交串行执行，前项失败后下一项仍继续。独立实例、外部写入和直接调用提交函数不共享队列，仍可能发生非快进冲突；队列没有持久化、背压、分布式锁或自动重试；
2. **缺乏网络重试幂等键**：若请求在 GitHub 成功更新 Ref 之后、但在 HTTP 响应回传移动端的网络传输中发生断开，客户端可能误判为失败。由于图片文件路径包含时间戳且新文章包含随机后缀，盲目重试可能导致生成两篇独立文稿；
3. **单向不可达对象残留**：若在 Blobs 与 Tree 创建成功后，最终更新 Ref 时发生网络故障或冲突，已创建的 Git 对象将滞留在 GitHub 仓库的松散对象库中，虽不会影响主分支，但不会被自动事务回收。

## 验证与演进

离线规划测试验证 Git 数据请求参数；回环 HTTP 测试验证鉴权、错误映射与实例队列：

- **纯逻辑与规划测试**：`packages/publishing/tests/webhook-receiver.test.cjs` 覆盖了同名文章覆盖、历史重复文章清理、图片占位符配对、日期继承及无图片正文规划；
- **网络边界替身测试**：通过向公共接口注入虚拟的 `request` 替身函数，验证了 Tree 创建参数、父提交关联以及 `force: false` 安全标志的传递。

`packages/publishing/tests/publishing-http.test.cjs` 使用 127.0.0.1 随机端口和 request 替身，验证缺失/空/非字符串 token 工厂报错、JSON body.token 与字段 trim、错误 token 与仅请求头 token 的 403、JSON/规划/GitHub 异常的 400、方法/路径的 404。

队列用受控 Promise 阻塞首项 PATCH，确认第二项已收完请求体但尚未读取 ref，再放行；覆盖首项成功与失败后继续，不使用 sleep 判定顺序。

- 未来演进方向包括：引入基于客户端 UUID 的幂等投递键（Idempotency Key），实现网络抖动时的安全重试；
- 在进入 Git 提交前增加轻量级图片尺寸校验，防止超大体积附件耗尽仓库配额；
- 支持直接向 `blog` 技术分类提交具备自定义标签与 Slug 的高级文稿。
