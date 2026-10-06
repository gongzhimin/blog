---
id: 'operations-docs-reference-interface'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'operations'
owner: 'Operations 维护者'
parent: 'packages/operations/README.md'
related:
  - 'packages/operations/src/api/index.cjs'
  - 'packages/operations/src/cli/health.cjs'
---

# Operations API 参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

Operations 的包根只提供一个任务入口：执行项目配置的默认健康检查。它面向授权的目标 Linux 环境，不是通用命令执行器。

## 接口清单

| 导入                 | 成员                | 调用目的                   |
| -------------------- | ------------------- | -------------------------- |
| `@myblog/operations` | `runHealthChecks()` | 执行默认探针并返回汇总报告 |

探针定义、runner、重试和控制台格式化是包内部实现，不作为调用者必须串联的 API。CLI 是面向操作人员的默认执行方式：`npm run server:health`。

## 输入与配置

### `runHealthChecks()`

**签名**：`runHealthChecks(): Promise<HealthReport>`

公开声明见 [index.d.cts](../../src/api/index.d.cts)。没有用户输入；返回报告不含恢复或重启能力。

无参数、无调用方默认值。函数读取包内受控探针定义并使用系统 shell runner。当前配置检查 Nginx、Webhook 服务、环境文件、监听端口和公网首页；目标主机和探针策略见[运维设计](../explanation/design.md)及[服务器指南](../guides/server-runtime/README.md)。

返回字段：

| 字段              | 类型            | 说明                                 |
| ----------------- | --------------- | ------------------------------------ |
| `ok`              | `boolean`       | 全部探针通过时为 `true`              |
| `results`         | `CheckResult[]` | 按定义顺序排列的探针结果             |
| `results[].id`    | `string`        | 固定探针标识                         |
| `results[].label` | `string`        | 面向人的探针说明                     |
| `results[].ok`    | `boolean`       | 单项判定                             |
| `results[].error` | `string`        | 成功时为空；失败时为最后一次诊断文本 |

## 输出与副作用

函数返回 `Promise<HealthReport>`。它会启动系统命令、执行 HTTP 检查，并可能按探针策略等待后重试；不修改服务、不发布内容、不重启进程。shell 输出仅用于判定和本地诊断，不应将报告作为包含完整 stdout/stderr 的日志快照。

调用失败时 Promise reject；探针命令返回非零则汇总成对应 `results[]` 失败项，并继续其余探针。CLI 将报告写到 stdout，全部通过退出 0，否则退出 1。

## 错误与边界

- 该入口执行生产 profile，不接受调用者指定任意 shell 命令、URL、环境文件或 retry 策略。
- 部分探针需要 Linux `systemctl`、`sudo`、`curl` 和配置文件权限；其他系统不满足这些前提。
- 网络超时或命令启动错误可能使任务拒绝；非零退出作为检查失败结果处理。
- `ok: true` 表示所有已配置探针按各自判据通过，不证明发布内容正确或静态站点已部署到预期版本。
- 不应在开发者本机或未授权目标上调用默认探针。

## 兼容与示例

运维人员应优先通过仓库根命令执行：

```sh
npm run server:health
```

该命令调用同一任务入口并依据报告设置退出码。运行条件、检查步骤与通过判据见[服务器健康检查指南](../guides/server-runtime/README.md)。

探针增加、删除或判据变化时，更新内部定义、测试、此参考和运维指南；不新增让普通调用者手工组装探针的主 API。

## 验证与关联

```sh
npm run --workspace @myblog/operations test
npm run check:docs
```

单元测试通过替身 runner 验证调度与失败聚合，不执行生产探针。真实服务器证据必须在授权环境记录。设计与风险见[模块设计](../explanation/design.md)，测试分层见[测试方案](../testing/strategy.md)。
