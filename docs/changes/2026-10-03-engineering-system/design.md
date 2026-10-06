---
id: 'docs-changes-2026-10-03-engineering-system-design'
type: 'record'
status: 'historical'
created: '2026-10-04'
modified: '2026-10-04'
scope: '项目工程资料'
owner: '项目维护者'
parent: 'docs/README.md'
related: ['docs/standards/documentation.md']
---

# 模块与工程文档系统设计

## 范围

用户已授权的 P0–P2、模块解耦和模块文档系统改造。统一代码、契约、注释、设计、测试与运维资料；保持现有 URL、文章路径、浏览器资源地址和服务器启动命令兼容。验收结果见 [交付记录](completion.md)。

## 实施记录

### 方案与取舍

比较三种方案：只整理文档无法约束实际依赖；立即迁成 npm workspaces 会同时改变 Astro 根目录、发布路径和服务器依赖安装；本次选择单仓库的显式模块，统一锁文件与构建，在模块入口和自动边界检查处实施隔离。

划分六个模块：site（src/site，加 Astro 框架目录）、book-build（src/book）、book-runtime（src/book-runtime）、publishing（src/publishing）、operations（src/operations）、tooling（scripts）。模型和通用 JSON 源留在 book-build；Astro 内容适配与首页样式归 site。服务器脚本保留旧路径薄入口，部署同步实现目录。

### 文档与契约设计

根 docs 分 architecture、reference、guides、testing、operations、decisions、changes、archive。模块 docs 统一提供 tutorials、guides、reference、explanation、testing，内容按实际职责裁剪。公共约定链接 CONTRIBUTING，历史方案不代表当前事实。旧文档路径继续有效，增加状态和当前入口；外层历史资料复制进入仓库归档，不删除原件。

配置 JSON Schema 负责结构规则，业务校验负责跨字段规则；配置参考自动生成并检查漂移。BookDocument 的 JSDoc 类型通过显式类型导入和限定检查范围生效。工程清单记录模块根、拥有的代码路径、允许依赖、接口和测试命令。

## 验证证据

新增工具先以失败测试证明缺口，再实现。运行文档链接检查、配置参考检查、模块依赖检查、类型检查、Astro check、build、Node 测试和 Playwright。部署只消费同一工作流内验证通过的构建产物；webhook 同步薄入口与实现后重启并执行健康检查。

参考与调研依据：

- [arc42 Building Block View](https://docs.arc42.org/section-5/)：模块责任、接口、依赖和代码位置。
- [Diátaxis](https://diataxis.fr/)：教程、操作、参考、解释的读者需求。
- [Node packages](https://nodejs.org/api/packages.html)：入口与封装；独立包是可选演进步骤。
- [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)：按职责与模型划分边界。
- [Google code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)：代码、测试、注释、文档一起审查。
- [TypeScript JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) 与 [Playwright](https://playwright.dev/docs/best-practices)：渐进类型检查与可观察行为验证。

## 剩余限制

本次只改本地及仓库内部署定义，不实际发布服务器或推送。恢复代码可通过还原本次变更实现；运行态恢复步骤另见运维指南。不宣称通过 ISO/IEC/IEEE 认证。
