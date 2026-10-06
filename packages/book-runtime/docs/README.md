---
id: 'book-runtime-docs-readme'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: 'book-runtime'
owner: 'Book Runtime 模块维护者'
parent: 'packages/book-runtime/README.md'
related: ['docs/standards/documentation.md']
---

# Book Runtime 文档导航

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

## 阅读路径

第一次使用先读 [模块 README](../README.md)，再执行 [入门练习](tutorials/getting-started.md)。改变行为前核对设计、算法、接口和测试。

## 资料清单

| 任务                 | 先读                                 | 要得到的判断                     |
| -------------------- | ------------------------------------ | -------------------------------- |
| 首次理解页码         | [教程](tutorials/getting-started.md) | 为什么正文 1 不是物理页 1        |
| 评估新分页方案       | [设计](explanation/design.md)        | 内容连续性、测量和所有权是否成立 |
| 调用运行时           | [接口](reference/api.md)             | 输入、加载顺序、副作用和失败     |
| 修改字体、布局或交互 | [指南](guides/change.md)             | 改动应放哪里、需要哪些验收       |
| 判断验证可信度       | [测试](testing/strategy.md)          | Node 与真实浏览器各能证明什么    |

- [模块首页](../README.md) 定义使命；
- [全局架构](../../../docs/architecture/overview.md) 定义跨模块关系；
- [贡献指南](../../../docs/guides/contributing.md) 定义共同流程。接口记录现状，设计明确区分目标与已知局限。

新增：[算法设计](algorithms/pagination.md)。

## 维护规则

本目录是模块专项资料的当前来源；根 docs 保存跨模块协议与交付协调。实现、接口或算法变化时同步当前资料与测试，不复制第二份正文。历史记录不代替当前契约。
