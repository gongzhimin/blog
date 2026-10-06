---
id: 'tooling-docs-testing-strategy'
type: 'testing'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'tooling'
owner: 'tooling 维护者'
parent: 'packages/tooling/README.md'
related:
  - 'packages/tooling/docs/explanation/design.md'
  - 'packages/tooling/docs/reference/api.md'
---

# tooling 测试方案

目录：

- [目标与范围](#目标与范围)
- [测试分层](#测试分层)
- [环境与数据](#环境与数据)
- [用例与断言](#用例与断言)
- [执行步骤](#执行步骤)
- [通过与退出条件](#通过与退出条件)
- [证据与限制](#证据与限制)

## 目标与范围

验证 inspectRepository、文档/边界 CLI、生成漂移和测试执行门禁。最重要风险是扫描错目录或漏跑导致假绿灯。不能只验证分析函数：必须把违规样本注入真实 package 布局并运行实际检查。

本方案的矩阵是最低验收要求；“已有案例”只表示存在断言，实际执行结果另记。规则遵循 [测试规范](../../../../docs/standards/testing.md)，跨包关系见 [全局策略](../../../../docs/testing/strategy.md)。

## 测试分层

engineering-boundaries 与 document-contract 验证有限 AST/Markdown 规则；workspace-scan 在临时完整工程副本调用实际 API；test-policy 验证递归发现、标记和 Node 摘要拒绝规则。生成参考、模块布局和工作流在 tests/integration。门禁本身不证明业务正确。

模块测试使用本包夹具；读取其他包的实例配置、私有实现或构建产物时归集成层。测试清单在 `packages/tooling/src/modules.json`，新增文件必须登记并通过递归盘点。

## 环境与数据

- 所有命令在 blog 根执行，Node 与依赖满足 engines 和锁文件。
- 使用合成内容、固定输入、请求/runner 替身；不读取 SSH 密钥或生产 token。
- 有效对照与故障注入使用相同边界，预期由契约独立定义。
- 临时目录、server、DOM、全局配置和计时器在 teardown 恢复。
- 浏览器使用本轮 dist 与独立 preview；同源加载错误和未处理异常阻断验收。

## 用例与断言

| 场景       | 环境与输入                                            | 具体判据                                             | 覆盖状态与限制         |
| ---------- | ----------------------------------------------------- | ---------------------------------------------------- | ---------------------- |
| 合法工程   | workspace-scan：复制真实 packages/docs/tests          | docs 与 boundaries 均通过，存在实际扫描范围          | 新增自动对照           |
| 坏文档     | 真实 BookBuild 包 README 注入非法元数据               | docs失败，诊断指向目标文件                           | 新增自动反例           |
| 非法依赖   | 真实 BookBuild source 导入 Site                       | boundaries失败，指明禁止方向                         | 新增自动反例           |
| 命名包导入 | import/require/export/dynamic import、subpath、未知包 | 合法根导入过；禁止方向、所有子路径、未知内部包被拒绝 | 新增边界回归           |
| 递归发现   | 嵌套 Node测试、登记缺失/不存在/不支持扩展名           | 合法嵌套执行；不合法文件明确失败                     | 新增自动回归           |
| 浏览器漏跑 | 已登记 nested spec，当前 testMatch 只发现顶层         | 策略检查拒绝，不允许登记掩盖漏跑                     | 新增自动回归           |
| 禁用标记   | only/skip/todo/fixme/fail，别名、字符串和注释对照     | 实际调用拒绝；注释/示例字符串不误报                  | 新增自动回归；有限语法 |
| 运行结果   | 动态 skipped/todo/cancelled、空集、缺摘要、非零退出   | Node门禁失败，不因退出0或静态未识别而通过            | 新增自动回归           |
| 文档与生成 | 元数据/章节/链接/危险模式、未来时钟                   | 正反例区分；生成内容不随运行时钟漂移                 | 已有自动案例           |
| CLI与产物  | 模块清单、npm命令、CI路径、真实 lint范围              | 扫描 packages 源码和文档；上传/安装路径一致          | 集成与完整执行共同证明 |

新增接口字段、配置分支、错误或状态转移时，补充对应的正常、边界和失败断言。仅断言 `ok`、非空数组或文件存在不合格；外部副作用必须检查次数、顺序以及失败后禁止的调用。

公开类型的编译夹具位于 tests/fixtures/public-api-contracts.ts：正常调用必须编译，非法参数必须触发 @ts-expect-error；类型退化为 any 会因未使用的错误标记而失败。契约检查包含 Site/Build 声明文件，skipLibCheck=false，不再掩盖声明路径错误。

## 执行步骤

```sh
npm run check:tests
node --test packages/tooling/tests/*.test.*
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

AST 不识别所有动态表达式和 require 绑定；Markdown 检查不证明语义、外部链接或完整 shell 安全。Node 摘要与浏览器报告器分别提供运行兜底。test-policy 调用实际 Playwright CLI，用合法案例、动态跳过和预期失败验证退出码 0/1/1，无需启动浏览器。人工审查仍需检查测试判据及读取任务。

记录 Node/浏览器版本、命令、退出码、构建来源、首个失败及未执行项；不在方案中维护永久通过数。阅读全文任务另记输入、实际查找路径和卡点；源码熟悉者自查不等于新读者验收。

设计见 [模块设计](../explanation/design.md)，修改流程见 [变更指南](../guides/change.md)。
