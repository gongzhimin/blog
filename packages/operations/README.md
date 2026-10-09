---
id: 'operations-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'operations'
owner: 'operations 维护者'
parent: 'packages/README.md'
related:
  - 'packages/README.md'
  - 'packages/operations/docs/explanation/design.md'
---

# Operations

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

Operations 提供部署后的只读健康检查及服务器恢复资料。调用者只需执行 `runHealthChecks()`；模块使用受控的默认探针并返回逐项结果与总体状态。不构建网站、不发布文章、不重启服务。

## 能力与限制

默认七项检查顺序执行。普通失败保留最后一次错误并继续；执行器或校验函数抛异常会中止。它不能证明 GitHub PAT 有效、POST 发布成功、页面内容正确或服务器正在提供目标提交。必须另行核对部署版本和内容，不能用一行 PASS 代替发布验收。

## 内部结构

```text
packages/operations/
+-- src/
|   +-- api/index.cjs         默认健康检查任务
|   +-- api/index.d.cts       健康报告类型
|   +-- internal/probes.cjs   固定探针与判据
|   +-- internal/execution.cjs  shell、重试与汇总
|   +-- internal/report.cjs   报告格式
|   +-- assets/blog-webhook.service  systemd 资产
|   +-- cli/health.cjs        输出与退出码
+-- tests/                    替身探针与 CLI
+-- docs/                     验证与恢复资料
```

`packages/operations/src/cli/health.cjs` 调用公开 API 并管理退出码；`packages/operations/src/assets/blog-webhook.service` 启动 Publishing CLI。服务资产通过操作系统连接模块。

## 依赖与数据流

```text
CLI -> 探针定义 -> 顺序执行 -> 系统/HTTP
                    |              |
                    +-- 重试 <-----+
                    |
                    v
              逐项结果 -> 报告 -> 退出码
```

没有业务模块源码依赖。默认 runner 依赖目标 Linux 的 shell、systemctl、sudo、curl、网络及相应文件权限。部署工作流调用健康检查；开发测试注入 runner，避免把本机当作生产服务器。

## 主要接口

| 入口                    | 输入                     | 输出                    |
| ----------------------- | ------------------------ | ----------------------- |
| `runHealthChecks()`     | 无参数；执行默认 profile | `Promise<HealthReport>` |
| `npm run server:health` | 默认服务器环境           | 全部通过退出 0，否则 1  |

完整字段和默认探针见 [接口参考](docs/reference/api.md)。不要把用户输入拼入 command：默认 runner 使用 shell exec。

## 最小使用示例

本地只检查入口，不执行探针：

```sh
node -e "const assert=require('node:assert/strict'); const api=require('@myblog/operations'); assert.equal(typeof api.runHealthChecks,'function'); console.log('runHealthChecks available; probes not executed');"
node --test packages/operations/tests/server-health-check.test.mjs
```

第一条命令预期输出 `runHealthChecks available; probes not executed`，只验证导入与函数存在。第二条命令通过测试内 runner 替身核对成功、普通失败、重试和异常；不会调用公开任务的默认生产探针。它们不证明目标服务器健康，也不是公开 API 的端到端验收。

真实任务会访问目标系统，仅在已授权服务器执行：

```sh
node --input-type=module <<'JS'
import operations from '@myblog/operations';
const report = await operations.runHealthChecks();
console.log(JSON.stringify(report));
if (!report.ok) process.exitCode = 1;
JS
```

普通维护者应运行 `npm run server:health`，由 CLI 输出报告并设置退出码。单元测试通过包内部替身测试，不直接调用默认入口。

## 配置

- 检查器没有 CLI 参数或环境覆盖协议；
- 域名、9000 端口、`/etc/blog-webhook.env` 属于默认探针配置。修改时同步测试、API 参考和恢复说明；包根不接受任意命令或自定义 runner。

systemd 配置和环境模板见 [服务器资料](docs/guides/server-runtime/README.md)。模板不是机密备份；真实 token 不进入仓库、终端记录或文档。

## 测试与验证

```sh
node --test packages/operations/tests/server-health-check.test.mjs
npm run check:docs
```

Node 测试使用模拟执行器，覆盖定义、重试、聚合和错误，不证明实际服务器可用。模块改动再运行 `npm run verify`。

真实部署另外验证版本、HTTPS、GET 路由及授权后的端到端发布；见 [全局部署指南](../../docs/operations/deployment.md)。

## 文档导航

- [六包协作总览](../README.md)：Operations 与应用包、部署工作流之间的关系。

- [设计](docs/explanation/design.md)：责任、取舍和失败证据。
- [重试算法](docs/algorithms/health-check.md)：步骤、复杂度和测试矩阵。
- [接口](docs/reference/api.md)、[测试方案](docs/testing/strategy.md)。
- [离线练习](docs/tutorials/getting-started.md)、[修改指南](docs/guides/change.md)。
- [恢复手册](docs/guides/server-runtime/rebuild-server.md)、[文档索引](docs/README.md)。
