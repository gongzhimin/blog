---
id: 'scripts-publishing-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'publishing'
owner: 'Publishing 模块维护者'
parent: 'packages/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/README.md'
---

# Publishing

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

将受控移动客户端的一次正文与图片输入转成 GitHub 仓库的一次提交。同标题更新保留原路径与日期，删除同名副本。HTTP 成功表示分支 ref 更新成功，不表示网站构建或部署成功。模块不调用 Site 或 Book Build。

## 能力与限制

- 兼容 markdown、raw、旧 HTML；
- 优先使用 truthy markdown，其次 raw，再 html。正文、图片和删除项进入一个 tree/commit。每个 createWebhookServer 实例用 pendingPublish Promise 队列串行执行快照读取到 ref 更新；
- 没有分布式锁、持久队列、幂等键、自动冲突重试、请求体上限和速率限制。base64 解码不验证图片真实性。共享 token 面向受控调用者，不是多用户认证。

## 内部结构

```text
packages/publishing/
+-- src/
|   +-- api/index.cjs         唯一启动任务
|   +-- api/index.d.cts       服务句柄声明
|   +-- internal/input.cjs    正文、标题与图片转换
|   +-- internal/planning.cjs 身份、文件与删除计划
|   +-- internal/github.cjs   Git 对象 transport
|   +-- internal/http.cjs     HTTP 与实例队列
|   +-- cli/publish.cjs       显式启动
+-- tests/                    转换、提交与回环 HTTP
+-- docs/                     设计、协议与操作资料
```

调用者只通过 api/index.cjs 进入模块；internal 不承担跨模块契约。CLI 显式启动服务，导入 API 不创建 HTTP 对象。

## 依赖与数据流

```text
客户端 -> HTTP(token/JSON) -> 仓库快照 -> 转换/规划
                                           |
                                           v
                          blobs -> tree -> commit -> ref
                                                       |
                                                       v
                                                独立构建与部署
```

GitHub 是外部网络边界。模块不依赖本地工作树。Operations 负责服务观测，全局交付负责网站部署。

## 主要接口

| 入口            | 输入                       | 输出                                                                      |
| --------------- | -------------------------- | ------------------------------------------------------------------------- |
| `POST /webhook` | `body.token` 和正文 JSON   | `200` 远端 ref 更新；`403` 鉴权失败；`404` 路由错误；`400` 请求或提交错误 |
| `startServer()` | 无参数，从服务环境读取配置 | 返回监听 `127.0.0.1:9000` 的 HTTP server；凭据缺失时抛错                  |

导入模块不监听。字段与错误条件见 [接口](docs/reference/api.md)。

## 最小使用示例

在 blog 根运行，无 token、无网络写入：

```sh
node -e "console.log(Object.keys(require('@myblog/publishing')))"
```

预期输出 `[ 'startServer' ]`。此检查只验证导出集合，不调用 `startServer()`，不验证监听就绪、鉴权或 GitHub 提交。

请求转换、失败传播与回环 HTTP 的安全验证步骤见[教程](docs/tutorials/getting-started.md)。其中使用内部请求替身，不是公开 API 的生产调用；真实发布须另行授权。

## 配置

- BLOG_WEBHOOK_TOKEN 进行共享秘密匹配，BLOG_GITHUB_TOKEN 用于仓库 API；
- BLOG_GITHUB_REPO 默认 gongzhimin/blog，BLOG_GITHUB_BRANCH 默认 main。服务固定监听 127.0.0.1:9000，目前没有端口环境变量覆盖。GitHub 配置在模块加载时读取；
- webhook token 在创建服务器时读取，不承诺已创建服务器热更新，详见 [接口](docs/reference/api.md)。真实值不进入文档、提交或截图。服务器安装和反向代理归 Operations。

## 测试与验证

blog 根执行 `node --test packages/publishing/tests/webhook-receiver.test.cjs packages/publishing/tests/publishing-http.test.cjs tests/integration/service-api.test.cjs`。

规划/Git 替身测试验证转换、覆盖与请求参数；HTTP 测试使用回环随机端口，验证工厂拒绝无效 token、body.token 鉴权、400/403/404 和实例队列首项成功或失败后继续。没有真实 GitHub 写入。

再执行 `npm run verify`。真实交付需另行授权，按 [部署指南](../../docs/operations/deployment.md) 核对提交、产物及页面。

## 文档导航

- [六包协作总览](../README.md)：Publishing 与 Git、CI、Site 部署及 Operations 的关系。

- [设计](docs/explanation/design.md)：责任、状态与取舍。
- [提交算法](docs/algorithms/publication.md)：规划、Git 对象与提交步骤。
- [接口](docs/reference/api.md)：HTTP 协议与函数契约。
- [iOS 操作](docs/guides/ios-shortcuts-image-publishing.md)：输入与结果核对。
- [测试](docs/testing/strategy.md)：风险、用例与验收步骤。
- [索引](docs/README.md)：按任务选择资料。

[系统架构](../../docs/architecture/overview.md) 区分内容提交与站点部署。
