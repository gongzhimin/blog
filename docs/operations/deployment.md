---
id: 'docs-operations-deployment'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: '跨模块工程'
owner: '项目维护者'
parent: 'README.md'
related: ['docs/standards/documentation.md']
---

# 交付、运行验收与恢复设计

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

### 目标与交付模型

交付应能定位“哪份版本以什么证据进入哪个环境”，并在失败时判断已发生的副作用。内容提交、CI 验证、产物同步、服务启动和业务生效分别验收。

站点与 webhook 使用两条工作流：前者交付 dist，后者交付 Node 入口、模块实现、依赖和 service。它们共用仓库和服务器，但不构成统一事务，跨两种交付的变更要专门协调。

## 前置条件

### 发布前检查点

必须记录目标 commit、变更类型、受影响模块、预期线上结果和恢复版本。确认依赖版本与服务器 Node 满足 package engines，凭据通过受控配置存在，不输出值。

站点需 verify 和 Chromium/WebKit；服务需发布/健康/工程测试。工作流定义可解析是基础，不足以证明上传路径、依赖安装或真实执行正常。发布操作者应核对 CI 日志和产物来源，不能仅凭本地 build。

## 输入与配置

| 输入               | 当前来源                                                                             | 操作者核对项                                    |
| ------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 目标版本和构建产物 | 选定 CI run 的 SHA 与 verified-dist                                                  | 事件、分支、实际构建内容及校验阶段              |
| 站点流程           | `.github/workflows/deploy.yml`                                                       | main、目标 dist 目录及 rsync 删除范围           |
| 服务流程           | `.github/workflows/deploy-webhook.yml`                                               | 触发路径、完整模块文件及相容锁文件              |
| 主机与 SSH         | workflow 当前为 ubuntu / 13.193.240.51；Secret LIGHTSAIL_SSH_KEY                     | 是否仍为已批准目标；不输出私钥                  |
| 服务配置           | `packages/operations/src/assets/blog-webhook.service` 与受控 `/etc/blog-webhook.env` | 9000 本地端口、工作目录、用户和字段；不输出真值 |
| 恢复输入           | 已验证的旧 dist 或相容服务版本                                                       | 可恢复性、备份、权限和业务数据边界              |

表中的主机信息是仓库配置，不是实时环境调查结论。跨站点与 webhook 的变更要列出旧/新版本兼容矩阵：先部署哪一侧、过渡期允许哪些组合、出现哪项失败时停止。两工作流没有共同的发布锁或原子回滚。

## 操作步骤

### 当前站点流程

deploy.yml 在 PR/main、手动及定时事件进行验证。定时引言先更新、后验证，成功才提交。验证 job 上传 dist，部署 job 依赖 verify，下载同次产物并同步到 /var/www/blog/dist，最后 curl 公网首页。

PR 不执行服务器部署。同期任务可能产生不同提交，workflow 并发组不是全系统发布锁；不能假定 main 最新版本和某次部署产物永远相同。

同步采用 rsync --delete，会移除目标中不属于产物的文件。上线前确认目标是 dist 而非内容仓库，且其中没有只在服务器保存的资产。当前非原子目录切换，可能短暂混合新旧文件，不承诺零中断。

### 当前 webhook 流程

deploy-webhook.yml 对相关路径执行局部检查和 Node 测试，包含回环 HTTP 鉴权、错误映射及实例队列回归。

服务部署安装启动 CLI、publishing/operations 实现、service、package/lock，执行 npm ci --omit=dev，再 reload/restart 和健康检查。

当前启动路径为 /var/www/blog/packages/publishing/src/cli/publish.cjs。恢复时不能只复制这个薄文件，缺模块实现目录就不能启动。PUPPETEER_SKIP_DOWNLOAD=1 避免服务依赖安装时浏览器下载，是否与目标环境相容仍需实测。

远端 script 的 set -eu 阻止安装失败后继续宣称成功；它不会回滚已经安装的文件，也不能让覆盖式安装成为事务。依赖安装失败时应保留输出并处理当前服务状态，不盲目反复重启。

## 结果核对

### 分层运行验收

在已授权服务器上执行：

```sh
node /var/www/blog/packages/operations/src/cli/health.cjs
```

退出 0 表示定义的七项条件通过：服务活动、配置字段存在、localhost webhook 的 GET 404 和公网首页可达。字段存在不证明 token 有效，GET 404 不证明 POST 发布正确，首页成功不证明目标 commit 已显示。

进一步验收须人工或专门探针核对：目标文章内容、关键静态资源、浏览器翻页、服务日志及版本。真实发布探针会写仓库，需单独选择测试内容和获得授权，不能混入日常健康检查。

## 失败与恢复

### 故障处置路径

| 失败阶段       | 先保留/检查                         | 处理原则                           |
| -------------- | ----------------------------------- | ---------------------------------- |
| verify/build   | 首个失败、输入与环境                | 不部署，不降低门禁                 |
| 静态同步       | 产物版本、目标、rsync 输出          | 评估混合文件，按受控产物恢复       |
| npm ci/install | 安装日志、文件版本、服务状态        | 不宣称重启成功，恢复相容依赖       |
| restart        | systemd/journal、监听、env 字段形状 | 不打印 env，不把 active 当业务正常 |
| 健康失败       | 分项报告及版本                      | 按层定位，不能自动推断配置需覆盖   |
| 页面旧内容     | commit、workflow、部署产物、缓存    | 区分提交与上线，不重复写同名碰运气 |

日志可能含外部错误信息，报告前脱敏。不要直接读取完整真实 env 来“证明配置”。

### 回滚

站点回滚使用明确版本的已验证产物或受控重建并部署。GitHub 的“重新运行 workflow”通常沿用原事件 SHA，不是随意选择任何提交的方法；dispatch 还可能带来新的发布行为。必须先确认工作流选中的 ref 与恢复目标。

Webhook 回滚同时恢复该版本入口、实现、service 及相容 package/lock，安装依赖、reload/restart 并分层验收。迁移前单文件版本使用自己的部署方式，不能混用本版本薄入口。

回滚代码不等于回滚文章提交。删除或恢复内容是独立业务写入，应记录目标和授权。机密保留服务器受控配置，不装入回滚包。

### 完整重建与演进

[重建手册](../../packages/operations/docs/guides/server-runtime/rebuild-server.md) 提供步骤，[运行资料](../../packages/operations/docs/guides/server-runtime/README.md) 定义预期拓扑。

重建前确认备份、域名、证书、环境和依赖，完成后记录版本及业务结果。

需要更可靠发布时评估版本化目录/原子切换、产物版本标识、两工作流协调和恢复演练。先建立故障及耗时证据，不无依据引入复杂编排。

## 关联资料

[运行与部署架构](../architecture/runtime-and-deployment.md)、[Operations 设计](../../packages/operations/docs/explanation/design.md)、[健康检查接口](../../packages/operations/docs/reference/api.md)、[服务器恢复](../../packages/operations/docs/guides/server-runtime/rebuild-server.md)、[Publishing 接口](../../packages/publishing/docs/reference/api.md)、[全局测试](../testing/strategy.md)。

本文件负责跨模块交付协调，不复制模块发布算法或系统安装步骤。
