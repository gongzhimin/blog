---
id: 'book-runtime-docs-testing-strategy'
type: 'testing'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-runtime'
owner: 'Book Runtime 模块维护者'
parent: 'packages/book-runtime/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/book-runtime/docs/reference/api.md'
---

# book-runtime 测试方案

目录：

- [目标与范围](#目标与范围)
- [测试分层](#测试分层)
- [环境与数据](#环境与数据)
- [用例与断言](#用例与断言)
- [执行步骤](#执行步骤)
- [通过与退出条件](#通过与退出条件)
- [证据与限制](#证据与限制)

## 目标与范围

验证 paginateBook 的页面、导航、诊断和生命周期。正文丢失、错误导航或失败后提交部分状态属于 P1，必须修复实现。真实显示采用 Turn.js 的单页/双页契约：目标页应进入可见 spread，不要求双页模式 currentPage 总等于目标。

本方案的矩阵是最低验收要求；“已有案例”只表示存在断言，实际执行结果另记。规则遵循 [测试规范](../../../../docs/standards/testing.md)，跨包关系见 [全局策略](../../../../docs/testing/strategy.md)。

## 测试分层

paginator-config、runtime-lifecycle 和 turnjs-adapter 使用 JSDOM/受控替身验证规则、状态和清理；book-app-mobile 验证局部事件。产物边界在 tests/integration。真实几何、富文本属性、多页目录、可见导航和特殊页在 tests/e2e/pagination-behavior.spec.mjs 与 test-pages-debug.spec.mjs。

模块测试使用本包夹具；读取其他包的实例配置、私有实现或构建产物时归集成层。测试清单在 `packages/tooling/src/modules.json`，新增文件必须登记并通过递归盘点。

## 环境与数据

- 所有命令在 blog 根执行，Node 与依赖满足 engines 和锁文件。
- 使用合成内容、固定输入、请求/runner 替身；不读取 SSH 密钥或生产 token。
- 有效对照与故障注入使用相同边界，预期由契约独立定义。
- 临时目录、server、DOM、全局配置和计时器在 teardown 恢复。
- 浏览器使用本轮 dist 与独立 preview；同源加载错误和未处理异常阻断验收。

## 用例与断言

| 场景           | 环境与输入                                             | 具体判据                                                   | 覆盖状态与限制                   |
| -------------- | ------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------- |
| 文本完整与高度 | Chromium：180 strong/em 片段；宽260/380、高220 px      | 文本与分片标识顺序保持；独立 DOM 测量每页<=221 px          | 已有自动案例；只覆盖声明 CSS     |
| 实体与 Unicode | runtime-lifecycle：嵌套链接、&amp;、emoji、含 > 的属性 | 前后文本严格等于源文本，href/class/data 保留，无半个代理对 | 新增自动回归；JSDOM 不证明高度   |
| 目录增长/缩短  | 受控测量 [1,2,2]/[2,1,1]/[1,2,3,3]                     | 正文起页=5+T；data-page、显示页码、双向映射和缓存一致      | 已有自动案例                     |
| 校准不收敛     | 循环或8轮预算耗尽                                      | 明确异常；不提交缓存/映射/封底修改；稳定后可重试           | 已有自动案例                     |
| 真实多页目录   | Chromium：24篇、较小目录高度                           | T>1；目录目标=实际正文页；映射逐项一致                     | 新增自动案例                     |
| 点击与深链接   | Chromium：1200/390 px，目录点击与 ?post=key            | 同一目标物理页进入 spread，正确标题可见                    | 新增自动案例                     |
| 缓存与清理     | runtime-lifecycle：重复/reset/异常/同 ID 节点          | 缓存七字段一致、无重测；只清自己的状态和测量容器           | 已有自动案例                     |
| 工作预算       | 3000/3001个简单段落                                    | 3000合法对照完整；未处理余量时明确失败，不返回截断成功     | 已有自动案例，非原始段落数量保证 |
| 特殊页与翻页   | 真实 covers、title、imprint、往返物理页                | 偶数总页数、封面类型、扉页/说明内容及正确 spread           | 原调试输出已改为行为断言         |

新增接口字段、配置分支、错误或状态转移时，补充对应的正常、边界和失败断言。仅断言 `ok`、非空数组或文件存在不合格；外部副作用必须检查次数、顺序以及失败后禁止的调用。

代码块补充：runtime-lifecycle 的 `code splitting preserves newlines and syntax attributes across pages` 检查分片文本拼接、换行、class/data 属性与测量容器清理；浏览器同名任务使用 80 行代码、实体和 emoji，核对文本、token 属性及每页高度 <=221 px。

## 执行步骤

封面收敛补充：`cover endpoint settles when plugin motion outlives the end callback` 在真实适配器 end 处理器运行时注入未完成 motion，先执行旧式延迟检查，再释放状态。预期封底 class 与 underlay 按实际空闲状态恢复；修复前稳定失败，修复后通过。完整预览案例等待翻页 motion 与预览 effect，不依赖固定毫秒数；不证明快速离开角点的所有第三方路径。

```sh
npm run check:tests
node --test packages/book-runtime/tests/*.test.*
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

尚无导航键碰撞检测、共享分页配置并发会话隔离或字体/图片变化后重排。代码块已有换行、嵌套 token 属性和独立高度回归；列表、表格和超大不可分割元素仍需要独立语义及溢出矩阵；段落案例不证明它们。Chromium 不证明 Safari。已确认契约违例不能当作限制交付。

记录 Node/浏览器版本、命令、退出码、构建来源、首个失败及未执行项；不在方案中维护永久通过数。阅读全文任务另记输入、实际查找路径和卡点；源码熟悉者自查不等于新读者验收。

设计见 [模块设计](../explanation/design.md)，修改流程见 [变更指南](../guides/change.md)。
