---
id: 'operations-docs-tutorials-getting-started'
type: 'tutorial'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'operations'
owner: 'Operations 维护者'
parent: 'packages/operations/README.md'
related:
  - 'packages/operations/docs/explanation/design.md'
  - 'packages/operations/docs/reference/api.md'
---

# 在本地验证健康报告逻辑

目录：

- [学习目标](#学习目标)
- [准备环境](#准备环境)
- [练习输入](#练习输入)
- [练习步骤](#练习步骤)
- [预期结果](#预期结果)
- [排错与清理](#排错与清理)
- [后续阅读](#后续阅读)

## 学习目标

本教程带读者在不连接服务器、不执行系统命令的条件下，检查 Operations 的报告聚合和失败处理测试。完成后应能区分包根默认任务与测试专用内部执行器。

包根 `runHealthChecks()` 使用受控的生产探针配置和系统执行器。它不接收自定义 runner；不要为了本地练习调用它，也不要从内部模块构造生产报告。可注入探针与 runner 的用例只存在于模块测试。

## 准备环境

在 `blog/` 项目根执行，Node.js 版本为 22.13+ 或 24+，并已安装锁文件依赖。练习只运行 Node 测试，不需要服务器 SSH 密钥、环境文件、root 权限或生产凭据。

## 练习输入

用例在进程内构造固定检查项和 runner 替身：替身只返回预设的退出码、stdout 和 stderr，不启动 shell。首个启动探针先失败再成功，用于验证重试；配置探针持续失败，用于验证完整报告仍保留后续结果。

本教程不传入这些测试替身到包根 API。包根入口接受零参数，调用会启动真实探针命令。

## 练习步骤

1. 查看 [Operations 单元测试](../../tests/server-health-check.test.mjs)，确认 runner 在测试中如何注入，以及每个结果如何断言。测试 helper 属于模块内部，不是应用调用示例。

2. 运行该文件：

   ```sh
   node --test packages/operations/tests/server-health-check.test.mjs
   ```

3. 运行 Operations 全部包内测试：

   ```sh
   npm run --workspace @myblog/operations test
   ```

4. 只有在已授权的目标 Linux 主机上，运维人员才可执行 `npm run server:health`。该命令不属于本地教程，也不应在未确认环境时运行。

## 预期结果

测试进程退出码为 0，输出显示相关用例通过。用例断言重试次数、单项结果顺序、总体 `ok` 状态和错误项保留；这些结果证明内存执行路径，不证明真实服务健康。

真实探针命令的通过判据、依赖权限和目标地址见[健康检查参考](../reference/api.md)及[服务器指南](../guides/server-runtime/README.md)。

## 排错与清理

- 若 Node 版本不符，切换到项目规定版本后重跑；不要改测试以绕过运行时差异。
- 若测试试图连接生产主机或执行 `systemctl`，停止执行并检查是否运行了错误脚本。本教程只允许运行列出的测试命令。
- 用例运行结束后会释放其内存替身和临时 DOM；不产生文件、网络或服务器状态变更，无额外清理步骤。

## 后续阅读

- [模块设计](../explanation/design.md)：报告状态与探针调度边界。
- [API 参考](../reference/api.md)：包根 `runHealthChecks()` 的真实输入、输出和副作用。
- [测试方案](../testing/strategy.md)：替身证据和真实环境验收的区别。
- [文档规范](../../../../docs/standards/documentation.md)：教程与操作指南的章节要求。
