---
id: 'docs-readme'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'README.md'
related: ['docs/standards/documentation.md']
---

# 项目知识与设计文档中心

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

读者：需要理解、修改、验收或维护系统的人及代理。文档的目标是支持正确决策，不是为每个源码文件写说明。

## 阅读路径

先读上位文档确定范围，再根据下列任务选择当前资料；历史记录只能用于追溯当时决定，不能代替现行接口。

## 资料清单

### 阅读路线

| 你的任务       | 建议路线                              | 阅读结束后应能回答                         |
| -------------- | ------------------------------------- | ------------------------------------------ |
| 理解项目       | 总体设计 → 上下文与质量 → 运行视图    | 系统解决什么问题，为什么这样拆，状态在哪里 |
| 设计新功能     | 总体设计 → 所属模块 design → 变更规范 | 哪些责任、契约、质量场景受影响             |
| 修改实现       | 模块接口 → 修改指南 → 模块测试策略    | 输入输出、兼容和证据如何维护               |
| 编写或审查资料 | 文档规范 → 设计审查清单 → ADR         | 该写什么类型，依据和权威位置是什么         |
| 发布或恢复     | 运行视图 → 部署指南 → 服务重建        | 哪个阶段失败，何种证据证明恢复             |
| 自动化协作     | AGENTS → 贡献指南 → 模块资料          | 允许做什么，怎样证明任务结束               |

新贡献者先走 [开发入门](guides/getting-started.md)，不是先读归档或全部源码。

### 项目级设计

- [系统架构](architecture/overview.md)：使命、策略、模型、责任边界和不变量。
- [上下文与质量](architecture/context-and-quality.md)：参与者、非目标、约束及可验收场景。
- [运行与部署](architecture/runtime-and-deployment.md)：构建、阅读、提交、交付与故障链路。
- [风险与演进](architecture/evolution.md)：现状局限、继续解耦理由和拆包条件。
- [决策记录](decisions/README.md)：关键备选、选择及后果，不是功能进度日志。

### 工程制度与证据

[规范中心](standards/README.md) 定义代码和注释、测试、文档、变更及代理制度。[贡献指南](guides/contributing.md) 是工作流程入口，避免在每个模块复制共享规则。

- [全局测试策略](testing/strategy.md) 将需求和风险映射到证据；
- [配置参考](reference/README.md) 展示精确配置与当前值；
- [部署指南](operations/deployment.md) 规定交付与恢复；
- [AGENTS.md](../AGENTS.md) 提供自动化代理执行约定。

### 模块级文档

先读 [六包协作总览](../packages/README.md)，确认跨包职责和数据交接，再进入具体模块的 README 与接口参考。该总览不替代系统部署架构，也不意味着六个包构成单一调用链。

| 模块         | 关注的设计问题        | 入口                                                |
| ------------ | --------------------- | --------------------------------------------------- |
| Site         | 内容政策与应用组合    | [Site](../packages/site/docs/README.md)             |
| Book Build   | 通用模型及构建协议    | [Book Build](../packages/book-build/docs/README.md) |
| Book Runtime | 终端状态与 DOM 所有权 | [Runtime](../packages/book-runtime/docs/README.md)  |
| Publishing   | 内容写入、并发和信任  | [Publishing](../packages/publishing/docs/README.md) |
| Operations   | 观测层次、诊断与恢复  | [Operations](../packages/operations/docs/README.md) |
| Tooling      | 约束、生成与门禁局限  | [Tooling](../packages/tooling/docs/README.md)       |

各模块均分为教程、操作、参考、设计解释和测试策略：教程带你完成一次练习；指南帮你完成变更；参考查精确契约；设计解释为什么；测试说明如何证明。

### 现有专题的定位

- [分页专题](../packages/book-runtime/docs/algorithms/pagination.md)：浏览器流程与算法细节，须连同 Runtime 设计阅读。
- [运行接口专题](reference/book-runtime-contract.md)：已有协议说明，与模块接口共同核对。
- [iOS 图片发布指南](../packages/publishing/docs/guides/ios-shortcuts-image-publishing.md)：客户端操作；提交不代表已上线。
- [服务运行资料](../packages/operations/docs/guides/server-runtime/README.md) 与 [完整重建](../packages/operations/docs/guides/server-runtime/rebuild-server.md)：服务器操作依据，不是本轮线上健康报告。
- [移动布局历史方案](archive/mobile-responsive-plan.md) 与 [历史路线图](archive/optimization-roadmap.md)：保留设计背景，不作为当前数值依据。

### 生命周期与事实来源

当前设计描述责任与选择，规范表达要求，接口记录实现契约，生成参考来自定义和配置，测试提供版本证据。它们发生冲突时先判断哪方错误，不能默认代码永远正确。

[变更记录](changes/README.md) 保存有限期方案和验收，[归档](archive/README.md) 与 [旧设计目录](superpowers/README.md) 保存历史。归档不参与当前路径校验，但不能随意覆盖历史结论。

资料维护遵循 [文档规范](standards/documentation.md)。自动检查可发现链接与生成漂移，不能证明设计论证完整；人工审查必须验证本文的阅读任务是否真正可完成。

## 维护规则

新资料按 [文档规范](standards/documentation.md)登记类型、关系和责任；迁移更新所有当前引用并删除旧文件，不保留重定向占位。生成资料更新来源，历史原件不覆盖。
