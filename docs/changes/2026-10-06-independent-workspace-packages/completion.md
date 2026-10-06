---
id: 'workspace-remaining-plan'
type: 'record'
status: 'historical'
created: '2026-10-06'
modified: '2026-10-06'
scope: '六包剩余重构'
owner: '项目维护者'
parent: 'docs/changes/README.md'
related: ['docs/changes/2026-10-06-independent-workspace-packages/plan.md']
---

# 剩余重构实施与验收

## 范围

按用户确认的方案，Site 拥有 Turn.js 适配器，Runtime 仅分页。保留受信内容和现有页面行为；不访问生产、不发布 registry。

## 实施记录

- [x] CSS：内部 configure 接受空字符串；公开分页用 nullish 回退，显式空 CSS 覆盖宿主样式。两层测试均先失败后通过。
- [x] 边界：适配器和移动手势测试从 Runtime 迁至 Site；删除原实现，无转发文件。SiteReader 为 Site 私有宿主协议，Runtime 只导出 paginateBook。
- [x] 门禁：AST 检查点属性、字符串下标、整体命名空间别名和解构；保留 API 合法对照。未分析所有动态表达式。
- [x] 契约：四包补公开声明；Build 的 BookRuntimeConfig 与 Site 的 runConfig 类型明确。编译夹具直接验证 Build→Runtime、Site→Runtime，不用独立声明的 payload 掩盖交接。
- [x] 版本：Changesets 启用 private version、禁 tag、无 fixed/linked；本轮六包均为 0.1.1，精确消费者依赖与锁文件一起更新。临时 workspace 实测生产者 minor、消费者 patch 及依赖更新。
- [x] 隔离：实际 tarball 集成安装与编译通过；每包再仅安装其声明的 workspace 依赖闭包，拒绝符号链接。Runtime 宿主测试显式装 JSDOM；服务只导入，不执行生产探针/发布。
- [x] 文档：同步六包 README、设计/API/测试、协作图和 ADR；原计划改为历史，未采用的 V1/句柄/子路径不再是现行目标。Site 直接使用的 ajv/KaTeX 改为显式依赖。

独立只读代理审查发现并推动修复了命名空间别名漏洞与 Build→Runtime 类型错位；复核类型和边界通过。它不是新贡献者真人验收。

## 验证证据

环境：Node v24.14.1、Playwright 1.61.0、Chromium、Changesets 3.0.3。命令在 blog 执行，不调用生产环境。首次沙箱内 Node 的 6 个 HTTP 用例因 EPERM 未执行；获准本机回环后完整重跑，未放宽测试。

| 命令/检查              | 本轮结果                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| CSS 回归               | 旧样式残留和宿主覆盖反例均确认失败，修复后 4 个配置用例通过                    |
| 边界反例               | 直接私有访问、整体别名及解构确认失败，修复后 9 个边界用例通过                  |
| 类型交接               | Build/Site 的 config 传给 paginateBook 原先编译失败，修复后正反夹具通过        |
| npm run verify:release | 退出 0；Node 201 通过，失败/取消/跳过/TODO 为 0；Astro error/warning/hint 为 0 |
| 包消费阶段             | 六 tarball 集成运行与声明编译通过；六个单包依赖闭包 consumer 均通过            |
| Chromium               | 19 通过，skipped/unexpected/flaky 为 0，retries=0；错误列表为空                |
| npm run version:status | 退出 0，本轮版本已应用，无待 bump 包                                           |
| git diff --check       | 退出 0                                                                         |

### 六包阅读路径与安全示例

独立代理只读核对 README→API 的错误说明→测试策略/命令；主代理另执行示例。二者分开记录，不能写成真人首次阅读通过。

| 包           | 默认输入/失败入口                                                                                       | 主代理实际本地结果                                                |
| ------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Site         | README 示例集合/config/theme；API 错误与边界的 SITE_INPUT_INVALID/BOOK_CONFIG_INVALID/SITE_MODEL_FAILED | 示例退出 0，输出 zhimin-blog 1；公开及集成测试通过                |
| Book Build   | README BookDocument/config；API 错误与边界的 BOOK_CONFIG_INVALID/BOOK_BUILD_FAILED                      | 示例退出 0，输出 1 12；与 Runtime 的类型交接通过                  |
| Book Runtime | README JSDOM/payload；API 错误与边界的 BOOK_RUNTIME_PAGINATION_FAILED                                   | 示例退出 0，输出 6 true；只说明该合成输入和清理，不证明几何       |
| Publishing   | README 仅导入；API body.token、HTTP 400/403/404 与结果不确定性                                          | 导入只输出 startServer；回环 HTTP 和提交替身通过，不写真实 GitHub |
| Operations   | README 本地仅导入/替身测试；API 报告失败与 Promise 拒绝                                                 | 导入有 runHealthChecks；默认探针未执行；替身重试/异常用例通过     |
| Tooling      | README inspectRepository({mode:'docs'})；API invalid root/mode 和诊断                                   | 示例退出 0，输出 Engineering docs checks passed；违规注入通过     |

审查卡点是类型交接不成立，已补贯通编译；README 中误混的表格、源码/测试目录图和过时适配器归属已修正。浏览器报告位于 test-results/browser-results.json，CI 配置保留浏览器证据；本机结果不代表远程 CI 已运行。

## 剩余限制

- Q8 真人首次阅读：仍需未参与实现的实际贡献者按六包任务走查，记录时间、实际路径和卡点。项目维护者负责安排；本轮代理审查/示例执行不替代此验收。
- 六包 API tarball 验证不等于脱离根宿主配置的独立 Astro 应用构建。当前是私有 workspace，共享根构建和静态资源。
- 生产、Safari 真机、真实 GitHub 与 registry 发布未执行。短键碰撞、并发分页会话与迟到资源重排仍为明确演进限制，不是本轮修复的保证。
- 安装输出报告 48 个依赖漏洞（3 low、14 moderate、29 high、2 critical）；未执行 audit fix --force。该输出不是可利用性分析，需另行检查受影响路径和升级兼容性。
