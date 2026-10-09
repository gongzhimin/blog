---
id: 'src-site-docs-testing-strategy'
type: 'testing'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
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

封面回归 `closed cover previews keep underlays hidden and rapid leave permits another turn` 在真实前后封面触发折角，预览扩张完成前移开鼠标，断言底衬始终隐藏、五秒内恢复插件空闲、闭合类保留，并可再次翻到出版说明。它不通过固定等待掩盖快速取消路径。

动画回归 `front/back opening/closing has no stationary phantom cover during animation` 覆盖四条封面开合路径，各执行键盘和鼠标操作。鼠标路径从预览进入提交，并在动画中离开画板。通过 `requestAnimationFrame` 逐帧采集实际运动状态，要求：

- 至少观察到三个运动帧，不能只检查开始和结束；每个运动帧的运动侧底衬与厚度装饰均不绘制。
- 提交后另一侧底衬继续绘制，不能通过隐藏整个书壳或所有装饰规避缺陷。
- 一次操作只有一次 `turning` 目标与一次 `turned` 结果，且最终物理页正确。
- 动画结束后运动标记清除；闭合时底衬隐藏，展开时恢复。末页从实际 `turn('pages')` 读取。

测试附带逐帧 JSON；视觉核对另检查前后封面的开、合中间帧。正确页号和最终截图不能单独证明动画没有虚封页。

`front/back inner cover remains painted during adjacent-page preview and drag` 分别定位封二和实际末页的内侧。仅在测试页面把内封页背景换为已知不透明颜色；在外侧列的三个高度采样，每阶段连续截图四次，要求每个像素均为 `[23,187,83]`，不放宽颜色容差。先用局部紫色蒙版证明非中心采样点可检测遮挡，再移除蒙版执行预览、拖拽和键盘翻页。

拖拽释放可能提交翻页，因此键盘阶段先恢复原内封 spread，等待空闲后再提交一次。测试将翻页时长设为 2000 ms，让连续截图落在内封页仍应可见的早期窗口；后半段正文合法覆盖内封页，不要求其始终呈现测试色。此采样不等于每帧全页视觉证明。测试不重设插件层级，结束后释放鼠标并等待空闲；真实素材另做截图核对。

适配器行为回归 `fixed cover registration is scoped to the configured book container` 使用自定义宿主，检查前后固定页操作只查询该宿主。它不宣称全局 Hash、键盘、分页配置已支持多实例。扉页 E2E 按当前配置核对样式；固定母版坐标在 owned-tools 中核对，不约束合法换图配置。

封面收敛回归 `cover endpoint settles when plugin motion outlives the end callback` 在 end 处理器运行时保留 motion，再释放状态，要求封底类和底衬按实际空闲状态复原。它与四条封面开合逐帧回归共同保护装饰显隐，而不是靠固定延时解除隐藏。

扉页回归 `title artwork uses its configured sprite scale without a paper overlay` 检查独立切片、图片 URL、实际 background-size/position、纸纹伪元素及标题可见。特殊页往返测试在返回 `[4,5]` 后核对出版说明文字、非零尺寸，并通过标题区域的 `elementFromPoint` 排除覆盖；仅有 spread 正确不算通过。

RSS 依赖回归位于 `tests/public-api.test.mjs`，使用真实 `getRssString`，再以 XML 模式解析结果。分别向 `source.title` 和 `enclosure.type` 传入合成标签或属性片段；断言不存在注入元素或属性、输入值完整往返、文章标题及条目数不变。当前站点 RSS 路由不传这两个字段；该测试保护依赖行为，不表示现有路由已可被远程利用，也不证明 `customData` 等显式 XML 输入安全。

| 场景           | 环境与输入                                     | 具体判据                                         | 覆盖状态与限制                                               |
| -------------- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| 合法内容与引语 | public-api：合成 blog/life 内容、配置和引语    | ok=true；书籍载荷、样式和展示字段逐项核对        | 已有自动案例                                                 |
| 非法输入       | public-api：null、非法 collection 数据         | ok=false；诊断 code/phase，不泄露预期输入异常    | 已有自动案例                                                 |
| 草稿与日期     | integration/public-api：草稿非法日期、同日条目 | 草稿先过滤；有效内容稳定排序；源数组顺序不变     | 已有自动案例                                                 |
| 配置与默认值   | homepage-config：配置合法/缺失/非法字段        | 声明默认值正确；非法字段返回具体问题             | 已有自动案例，新增字段必须补负例                             |
| 空与单项       | homepage-data 与公开入口                       | 空结果与单项结果符合字段契约；不凭空生成文章     | 新增 public-api 回归；断言文章数、身份、引语默认值与输入不变 |
| 资源与主题     | book-theme-styles、site-runtime-composition    | 测量与展示 CSS 同源，bootstrap 归 Site，顺序正确 | 已有自动案例；不证明远程字体加载                             |
| 真实页面       | homepage-layout：桌面/390 px、触摸与翻页       | 书壳可用、无横向溢出、垂直滑动不被错误截获       | Chromium/WebKit 同一案例矩阵                                 |
| 失败与责任     | Q8 从 README 找 API、配置错误、测试命令        | 无需阅读私有源码定位责任与处理方式               | 人工独立任务，未执行不得标为通过                             |

新增接口字段、配置分支、错误或状态转移时，补充对应的正常、边界和失败断言。仅断言 `ok`、非空数组或文件存在不合格；外部副作用必须检查次数、顺序以及失败后禁止的调用。

六页抽取用例：Site public-api 验证六角色完整、文本转义、构建年份、JSON 序列化和书籍作者不受引语署名影响；全局 turnjs-integration 在首页、独立书及演示书产物中比较六个初始节点与数据岛 HTML。Runtime runtime-lifecycle 校验动态尾页对应内容、拒绝不完整载荷及不注入宿主样式。真实动画、遮挡和素材仍按上述浏览器判据验收。

`special page extraction preserves the artwork policy of every book route` 在 Chromium/WebKit 检查实际 backgroundImage：首页与独立书使用配置插画，plain-manuscript 演示书保持纸张渐变覆盖。此断言保护现有主题行为，不表示新素材无需视觉验收。

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

浏览器矩阵为 Chromium/WebKit，不证明实际 Safari / 真机触摸。合成触摸事件验证方向判定和默认行为，不证明系统手势；测试兼容暴露但不可构造的 Touch/TouchEvent。远程引语更新工具的脱机案例不证明上游可用性。配置共享引用按接口约束处理，不能声称深不可变。空/单项与引语默认值已有公开任务回归；全部配置字段的覆盖仍以具体断言为准；接口变化时补齐，不由文件名推断。

记录 Node/浏览器版本、命令、退出码、构建来源、首个失败及未执行项；不在方案中维护永久通过数。阅读全文任务另记输入、实际查找路径和卡点；源码熟悉者自查不等于新读者验收。

设计见 [模块设计](../explanation/design.md)，修改流程见 [变更指南](../guides/change.md)。
