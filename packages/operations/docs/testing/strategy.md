---
id: 'operations-docs-testing-strategy'
type: 'testing'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'operations'
owner: 'operations 维护者'
parent: 'packages/operations/README.md'
related:
  - 'packages/operations/docs/explanation/design.md'
  - 'packages/operations/docs/reference/api.md'
---

# operations 测试方案

目录：

- [目标与范围](#目标与范围)
- [测试分层](#测试分层)
- [环境与数据](#环境与数据)
- [用例与断言](#用例与断言)
- [执行步骤](#执行步骤)
- [通过与退出条件](#通过与退出条件)
- [证据与限制](#证据与限制)

## 目标与范围

验证 runHealthChecks 的探针定义、执行顺序、有限重试、报告和 CLI 退出语义。普通探针失败汇总继续；runner 或 validator 抛出异常按现有契约拒绝，不产生假成功报告。生产健康状态不是脱机测试目标。

本方案的矩阵是最低验收要求；“已有案例”只表示存在断言，实际执行结果另记。规则遵循 [测试规范](../../../../docs/standards/testing.md)，跨包关系见 [全局策略](../../../../docs/testing/strategy.md)。

## 测试分层

server-health-check 使用注入 runner，不执行真实 shell；cli 用 API 替身验证报告输出及退出码。服务资产与工作流路径在 tests/integration/service-api 和 module-layout。生产权限、systemd、DNS 和 TLS 必须另获授权后验收。

模块测试使用本包夹具；读取其他包的实例配置、私有实现或构建产物时归集成层。测试清单在 `packages/tooling/src/modules.json`，新增文件必须登记并通过递归盘点。

## 环境与数据

- 所有命令在 blog 根执行，Node 与依赖满足 engines 和锁文件。
- 使用合成内容、固定输入、请求/runner 替身；不读取 SSH 密钥或生产 token。
- 有效对照与故障注入使用相同边界，预期由契约独立定义。
- 临时目录、server、DOM、全局配置和计时器在 teardown 恢复。
- 浏览器使用本轮 dist 与独立 preview；同源加载错误和未处理异常阻断验收。

## 用例与断言

| 场景           | 环境与输入                           | 具体判据                                              | 覆盖状态与限制                     |
| -------------- | ------------------------------------ | ----------------------------------------------------- | ---------------------------------- |
| 默认清单       | 默认探针定义                         | 七项 ID 及顺序正确，命令不读取全量 env                | 已有自动案例；不等于所有命令均安全 |
| 普通失败       | 三项 runner 输出 true/404/failed     | 继续执行所有项；结果 [true,true,false]；报告 ok=false | 已有自动案例                       |
| 暂态恢复       | 首次失败、第二次成功；延迟设0        | 正好2次，最终探针和报告通过                           | 已有自动案例                       |
| 默认预算耗尽   | 默认 webhook 探针连续失败，注入延迟0 | retries=8，正好9次；最终错误保留 attempt9，ok=false   | 新增自动回归                       |
| 空计划         | checks=[]                            | ok=true，结果为空，runner 零调用                      | 新增自动回归                       |
| runner 异常    | 首项抛错                             | Promise 拒绝；不重试、不执行下一项                    | 新增自动回归                       |
| validator 异常 | code=0后 validator 抛错              | Promise 拒绝；不执行下一项                            | 新增自动回归                       |
| CLI状态        | 成功、普通失败、API异常替身          | 输出完整报告；退出0/1；异常打印错误而非部分报告       | 已有自动案例                       |
| 生产失败       | 权限拒绝、DNS/TLS/进程挂起           | 现场按探针输出诊断，核对目标环境                      | 未自动演练；需授权                 |

新增接口字段、配置分支、错误或状态转移时，补充对应的正常、边界和失败断言。仅断言 `ok`、非空数组或文件存在不合格；外部副作用必须检查次数、顺序以及失败后禁止的调用。

## 执行步骤

```sh
npm run check:tests
node --test packages/operations/tests/*.test.*
npm run verify
```

局部命令仅供调试，完整递归发现由 test:node 的执行器负责。读取 dist 的集成先 build。生产命令不属于默认自动验收，未经授权不得执行。

交付候选执行 `npm run verify:release`。失败时保留首个诊断，确认是实现、判据还是环境错误；行为修复保留失败到通过和合法对照证据。

## 通过与退出条件

- 受影响的矩阵项有具体断言或独立人工记录；没有执行的项明确标注。
- 完整门禁退出零；测试集非空，失败、取消、跳过、TODO、重试均为零。
- 异常和副作用符合公开接口；资源在成功及失败路径均清理。
- P0/P1 契约违例、漏跑或关键判据缺失阻断交付。
- 不通过删测试、扩大容差、放宽鉴权或复用历史绿灯验收。
- 模块 API、设计和方案同步；[接口参考](../reference/api.md) 不降低源码缺陷的原定要求。

## 证据与限制

测试延迟0证明尝试次数，不证明真实时间间隔。Node测试超时不保证 systemctl 等产品命令有超时。无生产网络、内核、权限、进程表耗尽或恢复演练证据。报告不证明部署为目标 commit。

记录 Node/浏览器版本、命令、退出码、构建来源、首个失败及未执行项；不在方案中维护永久通过数。阅读全文任务另记输入、实际查找路径和卡点；源码熟悉者自查不等于新读者验收。

设计见 [模块设计](../explanation/design.md)，修改流程见 [变更指南](../guides/change.md)。
