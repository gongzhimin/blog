---
id: 'src-book-docs-testing-strategy'
type: 'testing'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-build'
owner: 'Book Build 维护者'
parent: 'packages/book-build/README.md'
related:
  - 'packages/book-build/docs/explanation/design.md'
  - 'packages/book-build/docs/reference/api.md'
---

# book-build 测试方案

目录：

- [目标与范围](#目标与范围)
- [测试分层](#测试分层)
- [环境与数据](#环境与数据)
- [用例与断言](#用例与断言)
- [执行步骤](#执行步骤)
- [通过与退出条件](#通过与退出条件)
- [证据与限制](#证据与限制)

## 目标与范围

验证 buildBook 将独立 BookDocument 和调用方配置转换为运行时载荷；renderArticle 和 createBookTheme 为根入口保留的构造能力。重点阻断正文损坏、输出字段不一致、非法主题逃过校验及隐含 Site 依赖。

本方案的矩阵是最低验收要求；“已有案例”只表示存在断言，实际执行结果另记。规则遵循 [测试规范](../../../../docs/standards/testing.md)，跨包关系见 [全局策略](../../../../docs/testing/strategy.md)。

## 测试分层

本包 public-api 和 book-theme 验证局部转换；JSON 来源测试归 Site，验证页面实际消费的实现。使用 Site 实例配置的任务在 tests/integration/book-build-task.test.mjs；跨包 Schema、独立书籍和载荷在 integration/public-api、book-runtime、book-architecture。Build 不负责真实浏览器测量。

模块测试使用本包夹具；读取其他包的实例配置、私有实现或构建产物时归集成层。测试清单在 `packages/tooling/src/modules.json`，新增文件必须登记并通过递归盘点。

## 环境与数据

- 所有命令在 blog 根执行，Node 与依赖满足 engines 和锁文件。
- 使用合成内容、固定输入、请求/runner 替身；不读取 SSH 密钥或生产 token。
- 有效对照与故障注入使用相同边界，预期由契约独立定义。
- 临时目录、server、DOM、全局配置和计时器在 teardown 恢复。
- 浏览器使用本轮 dist 与独立 preview；同源加载错误和未处理异常阻断验收。

## 用例与断言

| 场景             | 环境与输入                                                        | 具体判据                                                 | 覆盖状态与限制                     |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------- |
| 独立来源         | integration/public-api：无需 Astro/Vite 的 BookDocument           | 文章字段、markdown 渲染和输入顺序正确；配置不修改        | 已有自动案例                       |
| 任务成功         | integration/book-build-task：单篇文档与 Site 配置                 | ok=true、文章数1、正文与起始配置字段正确                 | 已有自动案例；属于跨包集成         |
| 错误诊断         | book-build-task：null document 与非法 config                      | ok=false；BOOK_CONFIG_INVALID、phase=validate            | 已有自动案例                       |
| 主题默认值       | public-api：省略 katexCSS                                         | CSS 中没有 undefined，可选样式默认为空字符串             | 新增自动回归                       |
| 非法主题         | public-api：`__proto__`/constructor/toString/不存在 ID            | Unknown theme；不能通过原型继承选择主题                  | 新增自动回归与合法对照             |
| CSS 输入         | public-api：null/数组/字符串 sources、数字 katexCSS、缺失 surface | TypeError 指明非法来源或必需字段                         | 新增自动回归                       |
| 空/重复/非法条目 | renderArticle、book-runtime 和来源转换                            | 按契约拒绝或保留；完整字段、错误路径、输入副作用独立检查 | 完整组合矩阵仍需按接口变化补齐     |
| 代码/数学/链接   | book-theme 与渲染案例                                             | 声明的 HTML 标记和主题段落保留                           | 不是浏览器语义或所有恶意 HTML 证明 |

新增接口字段、配置分支、错误或状态转移时，补充对应的正常、边界和失败断言。仅断言 `ok`、非空数组或文件存在不合格；外部副作用必须检查次数、顺序以及失败后禁止的调用。

## 执行步骤

```sh
npm run check:tests
node --test packages/book-build/tests/*.test.*
npm run verify
```

局部命令仅供调试，完整递归发现由 test:node 的执行器负责。读取 dist 的集成先 build。页面、主题、分页和交互变更还必须执行 `npm run test:e2e`。

交付候选执行 `npm run verify:release`。失败时保留首个诊断，确认是实现、判据还是环境错误；行为修复保留失败到通过和合法对照证据。

## 通过与退出条件

- 受影响的矩阵项有具体断言或独立人工记录；没有执行的项明确标注。
- 完整门禁退出零；测试集非空，失败、取消、跳过、TODO、重试均为零。
- 异常和副作用符合公开接口；资源在成功及失败路径均清理。
- P0/P1 契约违例、漏跑或关键判据缺失阻断交付。
- 不通过删测试、扩大容差、放宽鉴权或复用历史绿灯验收。
- 模块 API、设计和方案同步；[接口参考](../reference/api.md) 不降低源码缺陷的原定要求。

## 证据与限制

JSON adapter 只保留 Site 实际使用的实现；对应测试与类型检查同属 Site，真正来源替换由集成任务验收。输入完整语义验证、导航 key 碰撞和 HTML 安全不能由装配成功推断。主题函数无文件 IO，但调用方 CSS 的正确性与真实字体布局另验。

记录 Node/浏览器版本、命令、退出码、构建来源、首个失败及未执行项；不在方案中维护永久通过数。阅读全文任务另记输入、实际查找路径和卡点；源码熟悉者自查不等于新读者验收。

设计见 [模块设计](../explanation/design.md)，修改流程见 [变更指南](../guides/change.md)。
