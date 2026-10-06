---
id: 'agents'
type: 'agent'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'README.md'
related: ['docs/standards/documentation.md', 'docs/standards/agents.md']
---

# 项目代理执行约定

目录：

- [开始任务](#开始任务)
- [设计和实施边界](#设计和实施边界)
- [验证和交付](#验证和交付)

作用域：整个 blog 仓库。共享详细制度以 [规范中心](docs/standards/README.md) 为准，代理行为与授权规范见 [代理规范](docs/standards/agents.md)。

## 开始任务

- **工作区定位**：受版本控制的项目根是 `blog`，所有 npm 验证与构建命令必须在此执行。外层目录存放历史原件与工程环境配置，非 npm 根。
- **前置阅读**：先读 [README](README.md)、[贡献指南](docs/guides/contributing.md) 和目标模块的 README、设计（`explanation/design.md`）、接口参考（`reference/api.md`）和测试策略（`testing/strategy.md`）。
- **尊重既有工作区**：开始前执行 `git status -s`，必须保留其他人的未提交内容，严禁使用 `git reset --hard` 或 `git clean -fd` 重置工作树。历史设计不代替当前契约。

## 设计和实施边界

- **遵守模块边界**：严格遵守 [模块清单](packages/tooling/src/modules.json)。Book Build 不依赖 Site，浏览器不读 Astro 集合，发布和观测不导入站点实现。跨模块交互必须走显式登记的 `api/` 入口；HTML、JSON 数据岛、HTTP 与全局脚本协议均须精确核对。
- **变更与事实闭环**：行为修改前先明确验收断言及失败证据；同步更新接口契约、代码注释、当前设计和生成参考。文档资料必须从问题、数据结构、取舍、失败和验收出发，不只简单罗列源码。
- **安全防护红线**：绝不触碰或修改根目录下两个 AWS Lightsail 私钥（`LightsailDefaultKey-*.pem`）；绝不读取、输出或提交真实 Token / 密码；绝不修改 `public/vendor/` 只读库；绝不通过删除测试、放宽断言或大范围关闭 Linter 来伪造门禁通过。
- **纯文档任务纪律**：文档任务如发现底层代码缺口，必须先如实记录并提出改进方案，未经授权不擅自扩展业务实现。

## 验证和交付

- **全量工程门禁**：任务结束前执行 `npm run verify`，具体阶段以 package.json 为准；记录本轮退出码和测试结果，不维护永久测试总数。涉及浏览器真实翻页手势或移动端布局变更，须运行 `npm run test:e2e`。失败后的未执行阶段不得标为通过。
- **生成参考同步**：若修改了配置 Schema 或数据源，必须运行 `npm run docs:generate` 同步派生最新参考文档。
- **交付内容**：清晰交代修改范围、实际行为、验证命令的真实输出、向后兼容性、回滚恢复手段与剩余限制。本地实施不自动授权未经用户许可的外部 commit、push、生产部署或外部服务操作。
