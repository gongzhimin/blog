---
id: 'special-pages-extraction'
type: 'record'
status: 'active'
created: '2026-10-09'
modified: '2026-10-09'
scope: 'Site 与 Book Runtime 特殊页交接'
owner: 'Site 维护者'
parent: 'docs/changes/README.md'
related:
  [
    'packages/site/docs/explanation/design.md',
    'packages/book-runtime/docs/reference/api.md',
  ]
---

# 六种特殊页抽取计划与记录

目录：

- [范围](#范围)
- [实施记录](#实施记录)
- [验证证据](#验证证据)
- [剩余限制](#剩余限制)

## 范围

保留当前精灵图、内容与排版，将封面、封二、扉页、出版说明、封三、封底分别抽成 Site 私有页面定义。BookShell 与 Runtime 消费同一份 HTML；Runtime 决定封三、封底的实际页号。不增加公开函数、包或 vendor 修改。

## 实施记录

按顺序实施，直接保留当前工作区已有改动，不自动提交：

- [x] 在 Site public-api 与 Runtime runtime-lifecycle 中建立六角色缺失、动态页内容丢失、不完整输入未拒绝的失败证据；补充文本转义与单源初始 HTML 的保护测试。
- [x] 创建 `packages/site/src/internal/presentation/special-pages/` 六文件与内部组合器；`src/data/book-edition.json` 保存现有文案。角色定义输出 HTML、挂载类与资源定位。
- [x] `BookShell.astro` 只挂载六个角色；首页模型和其他书路由使用同一组合器，JSON 数据岛携带 `specialPages`。
- [x] Runtime 将 `specialPages` 对应到 1、2、3、4、N−1、N，拒绝不完整输入；未提供时使用无站点文案的通用页面。保留既有分页、对齐、导航规则。
- [x] 将特殊页布局 CSS 从正文主题中移入相邻主题文件；封底背景用角色类定位。更新类型、API、设计和测试方案。
- [x] 运行局部测试、完整 `verify:release`，核对 Chromium/WebKit 的六页与开合动画。记录本次结果，不引用此前绿灯。

核心断言：`result.pageCache[3] === specialPages.titlePage.html`，`result.pageCache[result.backPage] === specialPages.backInside.html`；输入经过 JSON 序列化后不丢字段；文本包含 `<` 时不能变成元素。初始书壳通过相同角色定义生成，不存在第二套文案模板。

## 验证证据

环境：2026-10-09，macOS arm64，Node v24.14.1，锁文件依赖；所有命令在 blog 执行。未执行发布、生产写入或私钥读取。

| 阶段           | 命令与结果                                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 最初失败       | `node --test packages/site/tests/public-api.test.mjs packages/book-runtime/tests/runtime-lifecycle.test.mjs`：退出 1，三项新增场景失败；分别是 specialPages 缺失、物理页 1 未缓存、缺角色输入未被拒绝 |
| 样式归属失败   | `node --test --test-name-pattern='generic pagination' packages/book-runtime/tests/runtime-lifecycle.test.mjs`：退出 1，head 多出一份封底 style；移除 Runtime 插画注入后通过                           |
| 类型检查失败   | 第一轮 verify 在 Astro check 停止，BookShell 的 Object.entries 类型产生 4 项错误；补充角色定义类型和页号映射类型后 check 为 0 错误、0 警告、0 hints                                                   |
| 第一轮完整验收 | `npm run verify:release`：退出 0；218 Node、六 tarball 消费及声明编译、54 Chromium/WebKit 案例通过                                                                                                    |
| 审查后最终验收 | `npm run verify:release`：退出 0；218 Node、六 tarball 消费及声明编译、56 Chromium/WebKit 案例通过；失败、取消、跳过、TODO、浏览器重试均为 0                                                          |

最终完整验收包括格式、lint、公开契约类型、文档、模块边界、测试盘点、Astro 和 23 路由构建。实际浏览器报告来自本次 test-results/browser-results.json，不作为版本控制资料保存。

只读独立审查未发现 Critical/Important；Minor 指出演示主题原有纸张规则覆盖扉页插画。保留该视觉，并增加三路由 computed backgroundImage 断言及主题限制说明；不是修改主题以满足通用插画假设。

新增 changeset：Site patch、Runtime minor，尚未应用版本。Runtime 默认路径不再含个人版权与隐式插画，独立消费者需要自行提供特殊页和 CSS；当前三个书籍路由已全部接入 Site 六角色定义。

## 剩余限制

本轮不替换图片，不拆除图片中烘焙的文字，不开放在线编辑器。现有翻页机械装饰继续由书壳及适配器管理，不属于六页的内容定义。

自动浏览器覆盖 Chromium/WebKit，不证明 Safari/iOS 真机或任意新素材的版面质量。已有未提交改动均保留，本轮没有 commit、push 或部署。
