---
id: 'docs-reference-readme'
type: 'index'
status: 'active'
created: '2026-10-04'
modified: '2026-10-04'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'docs/README.md'
related: ['docs/standards/documentation.md']
---

# 契约与配置参考

目录：

- [阅读路径](#阅读路径)
- [资料清单](#资料清单)
- [维护规则](#维护规则)

读者：集成者和维护者。参考资料回答“精确是什么”，不承担架构论证或教程步骤。

## 阅读路径

跨模块集成先读 [构建与浏览器契约](book-runtime-contract.md)；修改字段直接进入拥有该配置的模块参考。根 reference 不维护模块参数的完整副本。

## 资料清单

### 跨模块协议

[构建与浏览器契约](book-runtime-contract.md) 定义统一模型、HTML/JSON 载荷及全局脚本协作，责任同时涉及 Book Build 与 Book Runtime，保留在本目录。函数详细参考仍由模块拥有。

### 配置事实来源

| 资料                                                                              | 权威来源                                                                                       | 应怎样使用                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [书籍配置参考](../../packages/book-build/docs/reference/book-config.generated.md) | packages/book-build/src/api/book-config.schema.json 与 packages/site/src/data/book-config.json | 查结构约束和当前值；不是所有浏览器行为保证 |
| [首页配置参考](../../packages/site/docs/reference/homepage-config.generated.md)   | Site 字段定义、描述及 packages/site/src/data/homepage-config.json                              | 查传统视图组件配置；跨字段语义还需校验     |

书籍编辑器入口 packages/site/src/data/book-config.schema.json 引用核心定义；首页编辑器 Schema 与参考由字段定义生成。Schema 能表达的结构与业务跨字段规则有所不同，不能只看编辑器无红线就认为值合理。

### 修改生成资料

修改权威定义/配置后，在仓库根执行：

```sh
npm run docs:generate
npm run check:docs
```

提交的生成输出须与来源一致；不得手工更正生成表格以掩盖来源错误。生成文件保留“当前值”语义，不称其为 API 默认或历史常量。

### 模块契约

运行入口、参数、前后条件、错误和副作用分别记录在 Site、Book Build、Runtime、Publishing、Operations、Tooling 的 reference/api.md，索引见 [模块文档](../README.md)。

公共边界包括 HTML/JSON/HTTP/命令和脚本顺序，不只包括函数签名。

查询参数后回到对应设计检查意义和风险；数字合法不等于质量合理。未知项应核对来源，不从旧设计表格推断生产值。

## 维护规则

新资料按 [文档规范](../standards/documentation.md)登记类型、关系和责任；迁移更新全部当前引用并删除旧文件，不保留重定向占位。生成资料更新来源，历史原件不覆盖。
