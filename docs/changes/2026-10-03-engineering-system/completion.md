---
id: 'docs-changes-2026-10-03-engineering-system-completion'
type: 'record'
status: 'historical'
created: '2026-10-04'
modified: '2026-10-04'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'docs/README.md'
related: ['docs/standards/documentation.md']
---

# 工程体系交付记录

## 范围

完成日期：2026-10-04。范围涵盖本地代码、文档、测试和 CI 定义；未提交、推送或操作生产服务器。

## 实施记录

- **P0 阶段**：根 README/docs 导航，代码及注释、测试、文档、变更及代理规范；CONTRIBUTING、AGENT.md 与 AGENTS.md；六个模块均提供 README、教程、操作、接口、设计与测试资料。旧 README 和外层设计资料归档，历史尺寸与方案标明状态。
- **解耦阶段**：Astro 内容源及首页展示从 book-build 移到 site；首页配置、内容目录、每日引言集中到 site；发布与运维实现独立模块化。保留旧服务器脚本薄入口及站点 URL，不引入多包安装或改变 Astro 固定目录。选择显式单仓库模块而非 npm workspaces 的原因见 [ADR](../../decisions/0001-explicit-modules.md)。
- **P1 阶段**：配置校验与 Schema 对齐；首页编辑器 Schema 从运行时字段定义生成；核心 BookDocument 流使用 JSDoc/TypeScript 检查；新增非法输入测试；统一格式并修复既有 Astro 类型错误。第三方 vendor 不改写。
- **P2 阶段**：生成两份配置参考并检查漂移；验证相对文档链接、模块资料、接口路径、模块依赖方向、私有入口和循环依赖；CI 在测试后部署同一次验证产物；记录部署与恢复流程。
- **排版缺陷修复**：真实浏览器测试发现并修复长段落分页的两个问题：续页丢失原段落属性，以及新页未继续拆分长段落造成溢出。回归验证文本完整性与实际高度。独立审查还促成部署失败即停止、Astro 客户端导入检查和未归属脚本导入检查。

## 验证证据

项目根使用 Node 22 LTS >=22.13 或 24+。验收命令：

```sh
npm run verify
npm run test:e2e
git diff --check
```

统一验证包含格式、lint、限定契约类型、文档、模块边界、Astro check、生产构建和 Node 测试。Node 测试通过；Chromium 浏览器测试 10 项通过。Astro 无错误、无警告计数。

## 剩余限制

- CI 定义已改但未在 GitHub 或真实服务器执行；服务器 Node 版本、凭据、依赖安装及服务恢复须在正式发布时验证。
- 浏览器验收覆盖 Chromium，不等于 Safari/iOS 真机验收。JSDOM 不证明排版结果。
- 类型检查是核心数据流的渐进覆盖，动态样式配置尚不是全仓库严格类型；Schema 不替代跨字段业务校验。
- 文档门禁检查相对文件链接及生成漂移，不检查所有锚点、外链可用性或自然语言语义。模块门禁不证明 URL、全局变量及 DOM 注入形成的运行时依赖。
- 发布仍是 rsync 覆盖，非原子切换；webhook 请求大小、速率限制及独立包化是后续演进，不宣称本次已解决。

规范的后续使用方式：修改前读取所属模块入口和 [贡献指南](../../guides/contributing.md)，需求与设计明确后添加回归测试，改实现及相关文档，运行对应测试和统一门禁；部署另行授权。
