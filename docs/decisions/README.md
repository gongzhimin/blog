---
id: 'docs-decisions-readme'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'docs/README.md'
related: ['docs/standards/documentation.md']
---

# 架构决策记录

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

ADR 保存影响面广、代价高或值得长期解释的选择，不记录所有实现步骤。

## 阅读路径

先读上位文档确定范围，再根据下列任务选择当前资料；历史记录只能用于追溯当时决定，不能代替现行接口。

## 资料清单

### 当前决定

- [0004 物理模块、公开API与唯一资料位置](0004-physical-modules-and-public-api.md)：约束源码模块化、删除旧入口和中转文档、同步所有交付消费者；其中单根项目交付选择已由 0005 替代。

- [0005 六模块独立版本 workspace 包](0005-task-oriented-module-apis.md)：已接受。定义每包输入、输出、函数式边界、协作关系、版本、状态、诊断和逐成员 API 文档要求；实施按 [六包计划](../changes/2026-10-06-independent-workspace-packages/plan.md) 推进。

### 历史决定（部分策略已被0004替代）

- [0001 显式模块与统一构建](0001-explicit-modules.md)：为什么先划责任，不立即拆包或服务。
- [0002 契约来源与文档分层](0002-contract-and-documentation.md)：哪些能生成，哪些必须论证和审查。
- [0003 类型化文档契约与模块归属](0003-document-contract-and-ownership.md)：早期章节/元数据和重定向策略。

当前架构见 [总览](../architecture/overview.md)，当前限制见 [风险](../architecture/evolution.md)。ADR 是选择理由，不是实现全部达标证明。

### 何时写 ADR

改变依赖方向、核心模型、第三方适配、状态/权限、交付方式或事实来源时，应判断是否需要持久决策。局部 bug 修复和文案通常只需变更记录。

每条包含状态与日期、背景/质量驱动、备选、选择、正负后果、验证和再评估条件。否决方案要说明不足，不为已选方案编造不存在的比较。

### 生命周期

状态包括提出、接受、否决、被替代。新选择写新编号，旧记录标明替代关系；补充论证注明时间，不覆盖旧背景。编号便于引用，不等同于审批级别。

工作流制度见 [变更规范](../standards/change-management.md)，写作要求见 [文档规范](../standards/documentation.md)。

## 维护规则

新决定分配新编号；被替代记录使用historical状态，保留原论证并标明替代关系。

新资料按 [文档规范](../standards/documentation.md)登记类型、关系和责任；迁移更新当前引用并删除旧占位文档，不保留重定向。生成资料更新来源，历史原件不覆盖。
