---
id: 'docs-changes-readme'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'docs/README.md'
related: ['docs/standards/documentation.md']
---

# 变更记录

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

## 阅读路径

本目录保存限范围方案、实施步骤与时点证据。阅读当前改造先看本轮计划和完成记录；理解长期责任请读架构与模块设计，不能把旧验收日志当作本次验证。

## 资料清单

封面开合、内封页遮挡、扉页切片及特殊页验收见 [封面预览整改](2026-10-08-cover-preview/record.md)。

本轮阅读缺陷修正和完整公告命中清单见 [阅读任务与依赖公告核对](2026-10-06-reading-advisory-review/record.md)。版本命中不等于已确认可利用。

本轮测试门禁和源码回归见 [严格测试整改记录](2026-10-06-strict-testing/record.md)。

| 轮次                   | 方案 / 步骤                                                                                        | 时点结果                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 工程模块与门禁         | [设计](2026-10-03-engineering-system/design.md)、[计划](2026-10-03-engineering-system/plan.md)     | [原验收](2026-10-03-engineering-system/completion.md)                               |
| 设计导向文档           | [设计](2026-10-04-design-documentation/design.md)、[计划](2026-10-04-design-documentation/plan.md) | [原验收](2026-10-04-design-documentation/completion.md)                             |
| 源码物理模块与公开API  | [计划](2026-10-04-module-boundaries/plan.md)                                                       | [本轮验收](2026-10-04-module-boundaries/completion.md)                              |
| 六项文档契约与归属     | [计划](2026-10-04-document-contract/plan.md)                                                       | [本轮验收](2026-10-04-document-contract/completion.md)                              |
| 六包独立版本 workspace | [历史计划](2026-10-06-independent-workspace-packages/plan.md)                                      | [源码、类型与隔离消费验收](2026-10-06-independent-workspace-packages/completion.md) |

最新目录整理见 [根目录收拢记录](2026-10-05-root-layout/record.md)；此前整改见 [文档质量与源码缺陷记录](2026-10-05-documentation-quality/record.md)。

已完成资料标 historical，保留当时问题和结果；当前事实维护在 [文档规范](../standards/documentation.md)、架构和模块接口，不把时点证据当作持续保障。

[六页抽取计划与证据](2026-10-09-special-pages/record.md) 记录页面角色、单源 HTML、资源归属和本轮验收。

## 维护规则

新建日期目录，使用 record 类型及“范围、实施记录、验证证据、剩余限制”四章。实施结束后记录真实命令、退出码、失败与跳过；持久选择写 ADR，当前接口放所属模块。历史记录只用于追溯，不追溯改写验证结果。
