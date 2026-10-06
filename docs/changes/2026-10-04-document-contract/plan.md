---
id: 'change-document-contract-plan'
type: 'record'
status: 'historical'
created: '2026-10-04'
modified: '2026-10-04'
scope: '六项文档系统改造'
owner: '项目维护者'
parent: 'docs/changes/README.md'
related:
  [
    'docs/decisions/0003-document-contract-and-ownership.md',
    'docs/standards/documentation.md',
  ]
---

# 文档系统实施计划

## 范围

实施用户批准的六项要求：技术语言、按类型固定章节、结构化元数据、项目与模块图及算法细节、独立模块 README、专项归属及迁移引用。保持应用行为、公开 URL 和服务兼容入口，不提交、推送或上线。

## 实施记录

1. 对照 DCMI、RFC 3339、arc42、C4 与 Diátaxis，形成项目元数据应用字段和章节规范。
2. 分三组重写 Site/Book Build、Runtime/Publishing、Operations/Tooling；主线负责共享规范、系统设计、生成参考和迁移。
3. 每个模块补算法，明确数据结构、边界、复杂度变量、条件性正确性和独立案例。
4. 新增文档检查器；字段、章节、父关系回归先运行失败再实现，不只添加纸面要求。
5. 专项迁移到模块，旧路径只导航；同步当前链接、生成目标和保留原契约断言的测试。
6. 交叉审查技术事实、章节实质、图层次和可执行示例；集成后全量验证。

## 验证证据

最终结果另记 completion.md。验收需本轮 npm run verify、npm run test:e2e、README 示例运行、文档图/关系与源码核对。旧记录的通过数不能充当本轮证据。

## 剩余限制

本轮不扩大真实服务写入或安全审计范围，不自动包化六模块。浏览器分页状态解耦、Publishing 内部 transport 分离及依赖安全升级需各自独立设计与行为验证。自动文档检查不保证自然语言语义、外链可达和图的视觉渲染。
