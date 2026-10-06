---
id: 'book-runtime-docs-guides-change'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-runtime'
owner: 'Book Runtime 模块维护者'
parent: 'packages/book-runtime/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/book-runtime/docs/reference/api.md'
---

# 修改 Book Runtime 的风险与流程

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

本指南用于规范修改书本客户端运行时模块（`packages/book-runtime`）时的工程步骤、跨模块联动风险评估及紧急恢复方案。
适用修改场景包括：

1. 优化或修复文本、表格、代码块或富文本列表的分页拆分算法（`Splitters`）；
2. 调整全书物理页轴编排、目录罗马数字页码生成或封底定位逻辑（`Orchestrator`）；
3. 与 Site 联调目录和深链接；触摸、动画、滑条与窗口断点的实现修改归 Site，不在 Runtime 新增交互入口。

**非适用范围**：

- 修改静态构建期 Markdown 编译逻辑（应移步至 `packages/book-build` 模块）；
- 调整生产发布流程或服务器 Nginx 配置（应移步至 `packages/operations` 模块）。

## 前置条件

实施修改前必须核对并满足以下前置要求：

1. **工作目录**：所有命令必须在项目根目录（`blog/`）下执行；
2. **环境与依赖**：Node.js 版本满足 22 LTS（>=22.13.0）或 24+，且已运行 `npm ci` 确保本地依赖与 lockfile 严格一致；
3. **工作树基线与备份点**：
   - 执行 `git status -s` 并记录原有暂存、未暂存及未跟踪文件；工作区不必干净，原有修改必须保留；
   - 记录当前分支的提交哈希：`git rev-parse HEAD` 作为安全回滚标记；
4. **测试资源就绪**：由于运行时高度依赖无头浏览器排版，必须确保 Playwright 的 Chromium 浏览器内核已安装（可运行 `npx playwright install chromium`）。

## 输入与配置

实施变更时，开发人员必须严格对照各核心组件的修改风险矩阵与契约约束：

| 修改范畴                | 核心实现路径                                   | 联动风险与向下游传播影响                                 | 验证与防范策略                                       |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| 拆分算法 (Splitters)    | `internal/paginator-splitters.js`              | 文本切分丢失余量、富文本标签断裂导致全书排版崩溃         | 必须在桌面与移动两种视口下对比全文连续性与标签闭合性 |
| 页轴编排 (Orchestrator) | `internal/orchestrator.js`                     | 目录页数计算偏差导致正文物理起页错位、封底未在偶数页末尾 | 必须核对包含单页与多页目录时的物理页到文章映射表     |
| Site 交互（包外）       | `packages/site/src/internal/turnjs-adapter.js` | 错误物理页输入传播到翻页                                 | 真实浏览器验证目录与深链接                           |
| Site 启动（包外）       | `packages/site/src/internal/book-app.js`       | 分页失败的降级结果不可误用                               | 检查诊断与失败呈现                                   |

## 操作步骤

### 步骤 1：确立基线与缺陷复现（只读分析）

在修改代码前，先通过自动化测试或精简文章样本复现当前缺陷：

```sh
# 运行离线切分与自适应单元测试
node --test packages/book-runtime/tests/paginator-config.test.mjs packages/site/tests/book-app-mobile.test.mjs

# 运行端到端分页与排版测试
npm run test:e2e
```

### 步骤 2：实施代码改动（写入修改）

1. **核心逻辑编写**：在 `packages/book-runtime/src/internal/` 对应文件中实施改动，严禁在 `vendor/` 第三方原件目录内直接修改代码；
2. **公共入口维护**：分页结果变化同步 index.mjs、index.d.ts 和 Site；重置属于内部缓存，不另导出；
3. **样式与配置联动**：若修改了测量容器尺寸或样式类名，需同步检查 `packages/site/src/components/BookShell.astro` 注入的 `MEASURE_CSS` 是否匹配。

### 步骤 3：离线单测与全站构建验证

实施修改后，依次执行离线测试与构建验证：

```sh
# 1. 运行模块轻量单元测试
node --test packages/book-runtime/tests/paginator-config.test.mjs packages/site/tests/book-app-mobile.test.mjs

# 2. 执行静态编译，确保产物组装未报错
npm run build

# 3. 运行适配器源码契约测试
node --test packages/site/tests/turnjs-adapter.test.mjs
```

### 步骤 4：真实浏览器端排版验证

启动无头浏览器，执行完整的端到端排版与交互回归：

```sh
# 运行 Playwright 端到端分页与布局测试
npm run test:e2e

# 运行全工程自动化门禁（Prettier、ESLint、类型、边界及文档检查）
npm run verify
```

## 结果核对

完成操作后，按照以下验收清单逐项检查：

1. **全文连续性**：验证长文章跨页切分后，上一页末尾文本与下一页起始文本无遗漏或重复，嵌套 `<strong>`/`<em>` 标签在跨页处均正常闭合；
2. **目录与起页对齐**：核对目录点击跳转的目标物理页是否精确对应目标文章的首个正文页；
3. **封底位置合规**：确认整书总物理页数为偶数，封底始终准确固定在最后一页；
4. **清理机制健全**：确认离屏测量结束后，`document.body` 下的临时测量容器 `#__bap_inner` 已被彻底移除。

## 失败与恢复

若在任何验证步骤出现断言失败或排版异常，按以下指导实施定位与回退：

1. **正文内容丢失**：检查 `paginator-splitters.js` 中是否在计算高度时丢失了剩余节点的余量（margin / padding）补偿；
2. **页面死循环卡死**：检查正文主循环的 3000 次上限、分割余量进展及同步布局耗时；3000步后仍有待处理元素会抛预算 Error，不返回部分成功，应保留首个错误与原文输入；
3. **深链接锚点失效**：检查 `orchestrator.js` 的映射字典，确认传入的 `post` 参数与文章 `key` 完全相同；它是映射查找，不执行 CRC32 解码；
4. **局部恢复本次修改**：
   - 开始修改前记录 `git status -s` 和本次目标文件的 `git diff -- <文件>`；对未跟踪目标文件另存一份内容快照。HEAD 不能代表原有脏工作区。
   - 失败后对照该快照，只手工撤销本次修改的行；同一 hunk 含原有修改时逐段编辑，不整文件恢复。
   - 本次新建且未被他人继续编辑的文件可移到临时目录保留；不能按模块清理未跟踪文件。
   - 再次核对目标文件的差异、原有暂存状态与未跟踪清单，确认恢复到任务开始时的内容；不删除测试或放宽断言。

## 关联资料

- [模块设计说明](../explanation/design.md)：系统组件架构与分页算法原理；
- [公共接口参考](../reference/api.md)：查看运行时导出函数与配置属性；
- [模块测试方案](../testing/strategy.md)：查阅端到端测试覆盖矩阵；
- [全局贡献指南](../../../../docs/guides/contributing.md)：了解代码提交规范与代码风格要求。
