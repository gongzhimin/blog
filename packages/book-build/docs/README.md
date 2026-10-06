---
id: 'src-book-docs-readme'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-04'
scope: 'book-build'
owner: 'Book Build 维护者'
parent: 'packages/book-build/README.md'
related:
  - 'packages/book-build/docs/explanation/design.md'
  - 'packages/book-build/docs/reference/api.md'
---

# Book Build 文档中心

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

## 阅读路径

首次修改先读设计，再查接口；算法调整先读算法，实施前按变更指南建立测试证据。跨模块背景由根架构负责，不把模块细节再复制到根 docs。

## 资料清单

| 任务               | 起点                                       | 阅读后应能回答                          |
| ------------------ | ------------------------------------------ | --------------------------------------- |
| 判断能力归属与影响 | [设计](explanation/design.md)              | 谁决定政策，谁消费结果？                |
| 集成调用或内容源   | [接口](reference/api.md)                   | 输入、返回、错误与副作用是什么？        |
| 首次离线体验       | [教程](tutorials/getting-started.md)       | 如何观察输入变化带来的结果？            |
| 实施真实变更       | [指南](guides/change.md)                   | 哪些兼容和风险必须同步验证？            |
| 审查验收证据       | [测试策略](testing/strategy.md)            | 已有测试证明什么，遗漏什么？            |
| 推导载荷与 key     | [组装算法](algorithms/runtime-assembly.md) | 占位页码、CRC32、边界和复杂度如何确定？ |

设计解释长期选择；接口描述当前契约；教程提供可重复练习；指南处理变更流程；测试策略记录证据和缺口。代码入口不替代这些读者任务。

站点集合政策见 [Site](../../site/README.md)。实际分页、缓存与交互见 [Book Runtime](../../book-runtime/README.md)。

回到 [模块入口](../README.md) 或 [系统文档](../../../docs/README.md)。

## 维护规则

新增资料先选择文档类型，按固定章节编写并更新此索引。源码、配置或协议变化时同步关联资料；生成参考只修改来源后生成。历史结论不得直接覆盖当前契约。运行 `npm run check:docs` 后，还要人工核对输入、输出、失败与示例。
