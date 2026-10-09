---
id: 'scripts-publishing-docs-tutorials-getting-started'
type: 'tutorial'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'publishing'
owner: 'Publishing 模块维护者'
parent: 'packages/publishing/README.md'
related:
  - 'packages/publishing/docs/explanation/design.md'
  - 'packages/publishing/docs/reference/api.md'
---

# 在本地验证发布服务边界

目录：

- [学习目标](#学习目标)
- [准备环境](#准备环境)
- [练习输入](#练习输入)
- [练习步骤](#练习步骤)
- [预期结果](#预期结果)
- [排错与清理](#排错与清理)
- [后续阅读](#后续阅读)

## 学习目标

本教程带读者验证 Publishing 的包根 API 边界和 HTTP 请求处理测试。完成后应能确认：导入包不会启动监听；只有显式调用 `startServer()` 才会绑定服务；请求解析和 Git 提交由服务内部编排。

包根不提供离线发布计划 API。`startServer()` 会启动本地 HTTP listener，并依赖服务环境凭据，因此本教程不会调用它，也不会要求真实 token 或 GitHub 访问权限。

## 准备环境

在 `blog/` 项目根执行，Node.js 版本为 22.13+ 或 24+，并已安装锁文件依赖。测试通过内存请求替身验证请求和 Git 调用；在当前环境中若 loopback bind 被操作系统策略拒绝，HTTP listener 用例会报告 `EPERM`，这不等同于业务断言通过。

## 练习输入

单元测试使用虚构的文章 JSON、虚构 token 和 GitHub 请求替身。数据仅在测试进程内存在，不连接远程仓库，也不修改文章文件。生产 Webhook 的鉴权字段为 JSON `body.token`，不是 Authorization 请求头。

## 练习步骤

1. 在 blog 根运行导入检查：

   ```sh
   node -e "console.log(Object.keys(require('@myblog/publishing')))"
   ```

   预期 `[ 'startServer' ]`，进程退出 0。此步骤不调用启动函数，仅验证导出；导入无监听的断言由下一步测试核对，无需先读私有实现。

2. 运行不需要 HTTP listener 的发布规划与入口测试：

   ```sh
   node --test packages/publishing/tests/webhook-receiver.test.cjs packages/publishing/tests/cli.test.cjs
   ```

3. 在允许本机 loopback 的环境中，运行 HTTP 路由、鉴权与串行请求测试：

   ```sh
   node --test packages/publishing/tests/publishing-http.test.cjs
   ```

4. 不要通过 `npm run server:publish` 验证本地示例。该命令会启动服务；生产发布和真实提交不属于此教程。

## 预期结果

无 listener 的测试应退出 0，并证明包根只暴露默认服务任务、导入本身没有网络副作用。HTTP 测试在支持 loopback 的环境中验证响应码、body.token 鉴权、失败传播及队列顺序；`EPERM` 仅表明当前运行环境禁止绑定本地端口，需在获准的本地或 CI 环境补测。

无 listener 阶段应看到 `Publishing package root exposes one task entry and starts nothing on import` 和 `publication stops after refs rejection without later writes or automatic retry` 通过。前者是入口边界判据，后者是失败后禁止继续写入的判据。请求替身不证明真实 GitHub 写入；回环 HTTP 不证明生产 `startServer()` 的部署环境和凭据可用。

HTTP `200` 的语义、失败结果不确定时的核对方式和重试限制见 [Publishing API 参考](../reference/api.md)。

## 排错与清理

- 若测试提示缺少 `BLOG_WEBHOOK_TOKEN`，确认没有启动服务 CLI；离线单元测试不应读取生产服务环境。
- 若 loopback 测试报 `EPERM`，保留该环境限制并在允许绑定端口的测试环境运行，不要降低断言或跳过后声称全套通过。
- 替身测试退出后不留下远端对象或本地内容变更；listener 测试会在 teardown 关闭服务。

## 后续阅读

- [模块设计](../explanation/design.md)：请求、文件计划和远端提交的职责边界。
- [API 参考](../reference/api.md)：唯一包根任务 `startServer()` 的副作用及 HTTP 协议。
- [Webhook 协议](../guides/ios-shortcuts-image-publishing.md)：移动端请求字段和示例。
- [测试方案](../testing/strategy.md)：请求替身与 loopback HTTP 的证据范围。
