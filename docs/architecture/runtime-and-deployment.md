---
id: 'docs-architecture-runtime-and-deployment'
type: 'architecture'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: '跨模块工程'
owner: '项目维护者'
parent: 'docs/architecture/overview.md'
related:
  - 'docs/standards/documentation.md'
  - 'docs/architecture/overview.md'
---

# 运行、数据与部署视图

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

区分四个阶段：内容提交、静态构建、生产同步、浏览器排版。本文用于定位失败阶段和选择核对证据，不承诺提交后固定时间上线。

验收必须回答：目标 ref 是否包含内容、目标构建是否通过、哪份产物被部署、浏览器是否使用该产物并完成阅读初始化。一个阶段成功不能代替后续阶段。

## 范围与约束

源码和内容原件在 Git；dist 是特定输入的构建产物，不是持久备份。Webhook 使用 GitHub API，不把生产主机工作树作为内容提交持久层。浏览器状态限当前页面，不能当作仓库提交状态。

构建机、浏览器和发布进程不共享内存；它们仍通过资源、协议和部署协调。发布服务实例有内存 Promise 队列，不是持久化任务队列，不与另一进程共享锁。

生产操作需要单独授权。真实 GitHub token 和 SSH 密钥只在批准环境中使用，不进入静态载荷、文档示例或测试。

## 系统上下文

图 1：运行参与者。箭头为 HTTP、事件或产物交付，不表示源码依赖。

```text
作者 -- POST JSON --> Nginx -- HTTP --> Publishing Node 服务
                                           |
                                      GitHub Git API
                                           v
读者 <-- HTTPS 静态文件 -- Nginx <-- dist -- Actions <-- 仓库事件
  |
  +-- DOM/CSS 排版 --> 浏览器分页与交互

维护者 -- Operations CLI --> 服务、环境配置存在性、HTTP 探针
```

Nginx 同时托管静态资源和代理 webhook。发布进程失败通常不要求已部署静态文件失效，但主机、Nginx、磁盘或配置故障可能同时影响两条路径，不能宣称故障域完全独立。

## 模块与依赖

| 模块              | 执行环境与生命周期             | 交付内容或边界                                                        |
| ----------------- | ------------------------------ | --------------------------------------------------------------------- |
| Site / Book Build | Node/Astro 构建进程            | 内容选择、模型、HTML/CSS/JSON 和 dist                                 |
| Book Runtime      | 读者浏览器页面                 | Vite 打包资源、测量 DOM、分页缓存、插件                               |
| Publishing        | systemd 托管的 Node 进程       | packages/publishing/src/cli/publish.cjs 调用 API；监听 127.0.0.1:9000 |
| Operations        | 按需 Node CLI，执行 shell/HTTP | packages/operations/src/cli/health.cjs；顺序探针和报告                |
| Tooling           | 开发机或 Actions               | TypeScript AST、文档校验和生成比对                                    |

完整源码关系和目录图见 [总览](overview.md)。目录边界与执行环境不是一一对应的容器边界。

## 数据与契约

- 构建向浏览器传递 HTML、可序列化 JSON 及测量 CSS，不传递服务端内存引用。字段和加载顺序以 [运行契约](../reference/book-runtime-contract.md) 为准。
- Publishing 规划正文、图片和删除项；创建 blobs、tree、commit 后以 force:false 更新 ref。远程对象创建不是跨请求事务；ref 更新失败不自动删除已创建对象。
- POST /webhook 校验 JSON 顶层 token，不读取 Authorization 请求头作为客户端鉴权。默认 GitHub transport 的 Bearer token 是另一条上游边界，不能混用。
- HTTP 200 表示服务观察到 ref 更新成功，不返回 commit SHA，也不包含构建或部署确认。HTTP 400 不区分 JSON、规划和上游失败，错误文字不是稳定机器协议。

完整输入、错误及配置读取时点见 [Publishing API](../../packages/publishing/docs/reference/api.md)。站点产物、服务源码和运行环境版本应分别核对。

## 运行与部署

### 静态站点交付

图 2：deploy.yml 的阶段顺序。verify 内已经 build，不重新构建替换验证产物。

```text
PR / main push / 手动 / 定时
               |
          checkout + npm ci
               |
     定时任务更新每日一句（仅 schedule）
               |
   verify: 格式/静态/文档/边界/Astro/build/Node
               |-- 失败 --> 停止后续交付
               v
       安装 Chromium + test:e2e
               |-- 失败 --> 保存 trace/截图，停止交付
               v
     定时任务提交已验证引语（仅有差异）
               |
       上传 verified-dist artifact
               |
       非 PR 且 main 的 deploy job
               |
     SSH 准备目录 + rsync 同步 dist
               |
       curl 公网首页可达性检查
```

流程以 [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) 为准。curl 可达不证明文章完整、页面属于目标提交或分页正确。

rsync 直接同步当前目录，不是 release 目录的原子切换；同步失败需核对线上文件，不能假定旧版完整。

### 移动内容提交

图 3：一个 server 实例处理请求的顺序。路由判断先于 JSON 解析及鉴权。

```text
POST /webhook
    |
方法/路径匹配? -- 否 --> 404
    |
收集 body -> JSON.parse -> 顶层字段名 trim
    |-- 解析异常 --> 400
    |
body.token 匹配? -- 否 --> 403
    |
加入本实例 Promise 队列（前一任务失败也继续）
    |
读取当前 ref/commit/tree/life blobs
    |
编制正文/图片/删除计划 -> 创建 blobs/tree/commit
    |
PATCH ref (force:false)
    |-- 解析/规划/上游异常 --> 400
    v
服务收到成功响应 -> 200
    |
后续 Actions/部署另行确认
```

同实例每个任务在前一个结束后重新读取快照；不同 server 或外部写入仍可能产生引用冲突。服务重启不会持久化排队任务。

超时或响应丢失不能证明 ref 未更新。先查看目标分支、同名文章路径/正文/图片及提交记录，再决定是否重新提交；不能根据 400 或“客户端没收到 200”直接重试。未确认结果时停止自动重试，保留请求时间和非敏感定位信息。

### 服务部署与探测

服务工作流另行同步 Publishing、Operations、启动 CLI、service、依赖清单和锁文件。

实际步骤见 [deploy-webhook.yml](../../.github/workflows/deploy-webhook.yml) 和 [Operations 安装指南](../../packages/operations/docs/guides/server-runtime/rebuild-server.md)。

配置变化必须检查服务进程是否加载新环境，不能只检查文件存在。

Operations 默认检查 7 项。本地 webhook GET 预期 404，用于检查监听和路由，不发送真实发布；最多 9 次尝试，失败间隔 500 ms，每次 curl 最大时间 5 s。

该预算不构成所有探针的统一超时保证，runner/validate 异常可能使检查 Promise 拒绝。细节见 [Operations API](../../packages/operations/docs/reference/api.md)。

## 设计取舍

| 选择              | 不采用的方案             | 收益与成本                                                     |
| ----------------- | ------------------------ | -------------------------------------------------------------- |
| 静态构建交付      | 每次阅读动态读取内容     | 阅读无需内容数据库；内容上线需要构建/同步，时间无固定保证      |
| 浏览器最终测量    | 构建预分页作为最终结果   | 取得实际 viewport/字体；增加初始化成本，仍需设备和复杂内容验证 |
| Git Data API 提交 | 服务本地 Git 工作树      | 减少本地索引和脏文件依赖；增加网络、配额和不确定结果处理       |
| 实例内顺序发布    | 同实例并发读取同一旧快照 | 减少同实例冲突；不能解决跨进程、外部作者或服务重启恢复         |
| 当前目录 rsync    | release 目录原子切换     | 工作流简单；同步期间和失败后可能混合版本，恢复须实测           |

## 风险与验证

| 现象                 | 首先核对                                       | 不能推导的结论                           |
| -------------------- | ---------------------------------------------- | ---------------------------------------- |
| 客户端 400/超时      | 请求阶段、服务日志、目标 ref 和文章内容        | 一定未提交、一定是快进冲突、可以直接重试 |
| 200 后页面未更新     | 对应分支变化、Actions 运行、产物和线上文件     | 200 已确认网站上线                       |
| 正文溢出或缺失       | 实际 viewport、字体/图片状态、源正文和分页文本 | Node 测试通过即所有浏览器正确            |
| 服务监听失败         | systemd、环境配置存在性、端口及代理            | Node PID 存在即业务可用                  |
| 文档看似新但行为不同 | 权威 API、源码、具体测试和生成比对             | modified 日期新即没有漂移                |

本地替身不证明真实 GitHub 或生产恢复，基础探针不证明发布业务和目标版本。真实环境验收需明确授权、目标提交、数据和恢复方案，按 [交付指南](../operations/deployment.md) 记录结果。
