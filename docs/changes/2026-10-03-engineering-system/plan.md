---
id: 'docs-changes-2026-10-03-engineering-system-plan'
type: 'record'
status: 'historical'
created: '2026-10-04'
modified: '2026-10-04'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'docs/README.md'
related: ['docs/standards/documentation.md']
---

# 工程体系实施计划

## 范围

完成 P0–P2 与六模块边界整理。用户已授权当前会话实施；按阶段记录验证。修改范围包括 src/site、src/book、src/publishing、src/operations、scripts/engineering、test、docs、README、package.json、Playwright 配置、GitHub workflows。历史资料保留，公开 URL 与服务器启动脚本兼容。

## 实施记录

- [x] 基线：执行 `npm run check`、`npm test`；原 91 项 Node 测试通过，Astro 存在 7 个类型错误。
- [x] P0：新增根文档入口、CONTRIBUTING、AGENTS、模块清单及各模块 README/docs；归档外层历史设计；校正分页文档。
- [x] 解耦：移动 Astro source 和首页样式到 src/site；发布、健康检查移入独立目录，旧脚本作为兼容入口；更新页面、测试及部署路径。
- [x] P1：为工程检查和非法配置编写失败测试；配置结构统一到 Schema；BookDocument 参数显式类型化；补充模块依赖检查。
- [x] P2：生成配置参考；检查文档链接、代码入口、模块 docs 和生成漂移；统一 `npm run verify`；CI 验证后部署；增加恢复指南、ADR 与需求测试映射。

## 验证证据

- 执行 `npm run verify` 全套门禁（包括 Prettier、ESLint、TypeScript、Astro check、Astro build 与 Node 测试）。
- 执行 Playwright 浏览器端测试，断言长段落不断字、双页/单页布局。
- 交付结果及具体证据见 [交付记录](completion.md)。

## 剩余限制

- 本轮属于代码与架构解耦改造，不直接操作真实生产服务器。
- 依赖于既有锁定文件，未将单体工程物理拆分为多包。
