---
id: 'src-site-docs-testing-strategy'
type: 'testing'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/site/README.md'
related:
  - 'packages/site/docs/explanation/design.md'
  - 'packages/site/docs/reference/api.md'
---

# site 测试方案

目录：

- [目标与范围](#目标与范围)
- [测试分层](#测试分层)
- [环境与数据](#环境与数据)
- [用例与断言](#用例与断言)
- [执行步骤](#执行步骤)
- [通过与退出条件](#通过与退出条件)
- [证据与限制](#证据与限制)

## 目标与范围

验证 buildHomepageModel 与 inspectHomepageConfig 的公开契约，以及 Site 对 BookBuild、BookRuntime 和页面资源的组合。重点阻断草稿泄露、内容顺序错误、非法日期漏检、载荷失配和页面无法初始化。

本方案的矩阵是最低验收要求；“已有案例”只表示存在断言，实际执行结果另记。规则遵循 [测试规范](../../../../docs/standards/testing.md)，跨包关系见 [全局策略](../../../../docs/testing/strategy.md)。

## 测试分层

本包 public-api、homepage-data、homepage-config 验证输入转换和配置；json-book-source 验证实际 JSON 来源，daily-quote 验证文本处理；book-theme-styles、cursor-dot 和 owned-tools 保护本包资源。真实构建 HTML、页面与运行时组合在 tests/integration；可见布局和触摸在 tests/e2e/homepage-layout.spec.mjs。JSDOM 或源码匹配不证明布局。

模块测试使用本包夹具；读取其他包的实例配置、私有实现或构建产物时归集成层。测试清单在 `packages/tooling/src/modules.json`，新增文件必须登记并通过递归盘点。

## 环境与数据

- 所有命令在 blog 根执行，Node 与依赖满足 engines 和锁文件。
- 使用合成内容、固定输入、请求/runner 替身；不读取 SSH 密钥或生产 token。
- 有效对照与故障注入使用相同边界，预期由契约独立定义。
- 临时目录、server、DOM、全局配置和计时器在 teardown 恢复。
- 浏览器使用本轮 dist 与独立 preview；同源加载错误和未处理异常阻断验收。

## 用例与断言

| 场景           | 环境与输入                                     | 具体判据                                         | 覆盖状态与限制                                               |
| -------------- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| 合法内容与引语 | public-api：合成 blog/life 内容、配置和引语    | ok=true；书籍载荷、样式和展示字段逐项核对        | 已有自动案例                                                 |
| 非法输入       | public-api：null、非法 collection 数据         | ok=false；诊断 code/phase，不泄露预期输入异常    | 已有自动案例                                                 |
| 草稿与日期     | integration/public-api：草稿非法日期、同日条目 | 草稿先过滤；有效内容稳定排序；源数组顺序不变     | 已有自动案例                                                 |
| 配置与默认值   | homepage-config：配置合法/缺失/非法字段        | 声明默认值正确；非法字段返回具体问题             | 已有自动案例，新增字段必须补负例                             |
| 空与单项       | homepage-data 与公开入口                       | 空结果与单项结果符合字段契约；不凭空生成文章     | 新增 public-api 回归；断言文章数、身份、引语默认值与输入不变 |
| 资源与主题     | book-theme-styles、site-runtime-composition    | 测量与展示 CSS 同源，bootstrap 归 Site，顺序正确 | 已有自动案例；不证明远程字体加载                             |
| 真实页面       | homepage-layout：桌面/390 px、触摸与翻页       | 书壳可用、无横向溢出、垂直滑动不被错误截获       | 已有 Chromium 案例                                           |
| 失败与责任     | Q8 从 README 找 API、配置错误、测试命令        | 无需阅读私有源码定位责任与处理方式               | 人工独立任务，未执行不得标为通过                             |

新增接口字段、配置分支、错误或状态转移时，补充对应的正常、边界和失败断言。仅断言 `ok`、非空数组或文件存在不合格；外部副作用必须检查次数、顺序以及失败后禁止的调用。

## 执行步骤

```sh
npm run check:tests
node --test packages/site/tests/*.test.*
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

当前 Chromium 不证明 Safari / 真机触摸。远程引语更新工具的脱机案例不证明上游可用性。配置共享引用按接口约束处理，不能声称深不可变。空/单项与引语默认值已有公开任务回归；全部配置字段的覆盖仍以具体断言为准；接口变化时补齐，不由文件名推断。

记录 Node/浏览器版本、命令、退出码、构建来源、首个失败及未执行项；不在方案中维护永久通过数。阅读全文任务另记输入、实际查找路径和卡点；源码熟悉者自查不等于新读者验收。

设计见 [模块设计](../explanation/design.md)，修改流程见 [变更指南](../guides/change.md)。
