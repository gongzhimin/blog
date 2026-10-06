---
id: 'docs-changes-2026-10-04-design-documentation-plan'
type: 'record'
status: 'historical'
created: '2026-10-04'
modified: '2026-10-04'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'docs/README.md'
related: ['docs/standards/documentation.md']
---

# 设计文档重写实施计划

## 范围

将当前工程文档从代码说明提升为能指导设计、变更、验证和治理的知识体系。保持现有代码行为、URL 和自动检查不变。原工作区包含上一轮未提交改动，本轮在原处增量编辑，不建遗漏改动的 worktree。

## 实施记录

### 任务 1：全局设计与阅读路径

文件：README.md、CONTRIBUTING.md、docs/README.md、docs/architecture/{overview,context-and-quality,runtime-and-deployment,evolution}.md、docs/reference/README.md、docs/guides/getting-started.md。

- [x] 读取现有代码及模块清单，区分设计要求与已有实现。
- [x] 写系统使命、参与者、范围、质量场景、概念模型、模块理由、运行流程、信任边界和演进条件。
- [x] 将索引按读者任务组织，保留既有专题路径。

### 任务 2：规范和验收制度

文件：`docs/standards/*.md`、docs/testing/strategy.md、docs/operations/deployment.md、`docs/decisions/*.md`、AGENT.md、AGENTS.md。

- [x] 明确 MUST/SHOULD/MAY 的项目语义和规则裁剪。
- [x] 重写代码及注释、测试、文档、变更、代理规范，加入理由、适用范围、正反例、例外和审查证据。
- [x] 写风险到测试的映射、故障决策、发布/回滚流程，明确生产实测限制。

### 任务 3：六模块设计资料

文件：src/site、src/book、src/book-runtime、src/publishing、src/operations、scripts/engineering 各自 README.md 与 docs 的六个现有文件；不修改源码。

- [x] Site 与 Book Build：问题域、模型、序列化边界、接口前后条件、设计取舍及变更练习。
- [x] Runtime 与 Publishing：DOM/页码生命周期、内容提交语义、失败、信任边界、测试矩阵和可观察结果。
- [x] Operations 与 Tooling：观测模型、证据等级、门禁能力限制、恢复与工程治理。
- [x] 每组完成后独立审查规格，再审查事实准确性和重复内容。

### 任务 4：验收与交付

- [x] 记录设计问题到文档位置的验收矩阵，扫描占位符和现状/目标混淆。
- [x] 项目根执行 npm run format:check、npm run check:docs、npm run check:boundaries、npm run verify 和 git diff --check；失败定位而非放松检查。
- [x] 写 completion.md，列出交付、验证和人工审查边界；更新本计划状态。

## 验证证据

- 项目根执行 `npm run verify`，全部检查项均通过。
- 浏览器测试独立运行，验证排版与交互体验。
- 交付与闭环复核记录见 [交付记录](completion.md)。

## 剩余限制

- 本轮属于文档系统重构，未改变运行代码逻辑与部署环境。
- 针对真实服务器的线上演练需在部署授权后执行。
