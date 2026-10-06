---
id: 'tooling-docs-index'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: 'tooling'
owner: 'tooling 维护者'
parent: 'packages/tooling/README.md'
related:
  - 'packages/tooling/docs/explanation/design.md'
---

# Tooling 文档索引

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

## 阅读路径

- 先读 [模块 README](../README.md) 了解职责；
- 首次使用跟随 [离线指南](tutorials/getting-started.md)；
- 设计和变更时先读 [设计](explanation/design.md) 与 [接口](reference/api.md)。

## 资料清单

| 文档                                          | 用途                           |
| --------------------------------------------- | ------------------------------ |
| [模块设计](explanation/design.md)             | 模型、取舍、边界与流程         |
| [算法设计](algorithms/module-dependencies.md) | 具体步骤、复杂度、正确性与用例 |
| [接口](reference/api.md)                      | 输入、输出、副作用和兼容       |
| [测试](testing/strategy.md)                   | 风险与证据                     |
| [修改指南](guides/change.md)                  | 实施顺序、验收与恢复           |
| [离线练习](tutorials/getting-started.md)      | 可执行的首次使用任务           |

## 维护规则

本文只维护导航，事实来源归对应设计、接口或算法。变更后同步关联链接、元数据与测试；历史原件不作为当前契约。遵守 [文档规范](../../../docs/standards/documentation.md)。
