---
id: 'scripts-publishing-docs-readme'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: 'publishing'
owner: 'Publishing 模块维护者'
parent: 'packages/publishing/README.md'
related: ['docs/standards/documentation.md']
---

# Publishing 文档导航

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

## 阅读路径

第一次使用先读 [模块 README](../README.md)，再执行 [入门练习](tutorials/getting-started.md)。改变行为前核对设计、算法、接口和测试。

## 资料清单

| 任务               | 文档                                 | 阅读结果                     |
| ------------------ | ------------------------------------ | ---------------------------- |
| 不用凭据体验发布   | [教程](tutorials/getting-started.md) | 可审阅的正文、图片与删除计划 |
| 评估提交策略       | [设计](explanation/design.md)        | 提交完整性、并发与上线边界   |
| 接入客户端或替身   | [接口](reference/api.md)             | 协议字段、函数与失败含义     |
| 修改覆盖或图片规则 | [指南](guides/change.md)             | 风险、兼容和验证步骤         |
| 判断证据是否足够   | [测试](testing/strategy.md)          | 离线测试覆盖及线上缺口       |

- [模块首页](../README.md) 定义使命；
- [运行及部署](../../../docs/architecture/runtime-and-deployment.md) 解释后续上线流程；
- [贡献指南](../../../docs/guides/contributing.md) 定义共同流程。

新增：[算法设计](algorithms/publication.md)。客户端操作：[iOS 快捷指令](guides/ios-shortcuts-image-publishing.md)。

## 维护规则

本目录是模块专项资料的当前来源；根 docs 保存跨模块协议与交付协调。实现、接口或算法变化时同步当前资料与测试，不复制第二份正文。历史记录不代替当前契约。
