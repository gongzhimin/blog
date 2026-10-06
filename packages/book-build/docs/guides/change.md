---
id: 'src-book-docs-guides-change'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-build'
owner: 'Book Build 维护者'
parent: 'packages/book-build/README.md'
related:
  - 'packages/book-build/docs/explanation/design.md'
  - 'packages/book-build/docs/reference/api.md'
---

# 修改 Book Build 的风险与流程

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

本指南规范修改 Book Build（`packages/book-build`）时的工程流程、风险边界及恢复手段。
适用任务包括：

1. 扩展或调整书籍内容源适配器（如新增不同格式的数据源提取逻辑）；
2. 升级 Markdown 语法解析、代码高亮、公式渲染或正文图片预检逻辑；
3. 修改书籍配置契约（`book-config.schema.json`）及其校验逻辑；
4. 调整书籍主题 CSS 转换规则（`classic-paper` / `plain-manuscript`）。书壳 DOM 是 Site 责任；变更需同步修改 `packages/site/src/components/BookShell.astro` 并运行 Site 集成与 E2E 验证。

跨模块影响警示：

- **上游内容**：数据模型键值变更将直接影响内容源追踪与阅读器深层锚点跳转；
- **下游站点**：书壳属性或预置 CSS 变更将直接影响 `packages/site` 的页面组装；
- **客户端运行时**：预估页码或文章对象格式变更将影响 `packages/book-runtime` 的加载与分页测量。

## 前置条件

在开展任何代码或配置修改前，必须确认以下条件：

1. **执行目录与工具链**：所有命令必须在项目根目录 `blog/` 执行；Node.js 版本满足 22 LTS（>=22.13.0）或 24+，并已执行 `npm ci`。
2. **工作区状态与回退点**：
   - 执行 `git status -s` 检查当前分支状态，记录并保留原有暂存、未暂存和未跟踪内容；
   - 记录当前提交哈希作为回退基准：`git rev-parse HEAD`。
3. **权限与授权边界**：本地开发修改仅限于 `packages/book-build/src/` 及对应测试文件；未获得用户明确指令前，严禁执行 `git push`、操作生产环境服务器或触发生产流水线。

## 输入与配置

实施修改时，应参照下表明确各层级配置与代码契约的归属：

| 修改范畴         | 涉及物理路径                                                                             | 权威契约与原则                                                                    | 下游影响与同步要求                            |
| ---------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| 内容模型与源适配 | `packages/book-build/src/internal/sources/`, `packages/book-build/src/model/`            | 以 `BookDocument` 规范模型为准，适配逻辑保留在适配器内部                          | 确保不破坏既有文章的 `id` 与 `key` 稳定性     |
| 配置契约演进     | `packages/book-build/src/api/book-config.schema.json`                                    | Schema 为单一权威源，严禁在业务代码中硬编码第二套约束                             | 必须运行 `npm run docs:generate` 同步生成文档 |
| 正文渲染管道     | `packages/book-build/src/internal/renderers/`                                            | 确保图片尺寸读取为可选且优雅降级，维持公式与代码安全                              | 检查对长文本、宽表格的渲染产物                |
| 主题样式转换     | `packages/book-build/src/internal/themes/`, `packages/book-build/src/api/book-theme.mjs` | 保持 CSS 选择器转换规则和输入校验；CSS 文件由 Site 拥有，运行时盒模型需浏览器验证 | 运行 Book Build 单测及 Site 分页 E2E          |

## 操作步骤

### 步骤 1：基线确认与失败用例复现（只读检测）

在修改实现前，先编写或运行既有单测，明确待修复缺陷或待扩充能力的基准行为：

```sh
# 运行模块基础测试套件
node --test tests/integration/book-runtime.test.mjs packages/book-build/tests/book-theme.test.mjs packages/site/tests/json-book-source.test.mjs tests/integration/book-config-schema.test.mjs
```

### 步骤 2：实施代码与配置修改（写入改动）

1. **核心逻辑调整**：在 `packages/book-build/src/internal/` 或对应子目录完成业务功能编写；
2. **公共契约导出**：若有新函数或类型对外暴露，必须在 `packages/book-build/src/api/index.mjs` 中登记；
3. **同步配置文档**：若修改了 `book-config.schema.json`，执行自动生成命令：
   ```sh
   npm run docs:generate
   ```

### 步骤 3：模块级单元测试与静态构建（验证改动）

```sh
# 1. 验证内存级装配与转换逻辑
node --test tests/integration/book-runtime.test.mjs packages/book-build/tests/book-theme.test.mjs packages/site/tests/json-book-source.test.mjs tests/integration/book-config-schema.test.mjs

# 2. 执行静态编译，产生全新 dist
npm run build

# 3. 基于最新产物运行边界契约测试
node --test tests/integration/book-runtime-boundary.test.mjs tests/integration/book-runtime-demo.test.mjs
```

### 步骤 4：全流程门禁验收

完成模块验证后，执行全仓库工程验证命令：

```sh
# 全量代码风格、Lint、类型、文档及单元测试门禁
npm run verify

# 若涉及排版几何、样式或浏览器端行为，必须追加运行端到端测试
npm run test:e2e
```

## 结果核对

完成上述步骤后，对照以下清单逐项验收：

1. **命令退出码**：所有测试与构建命令退出码必须为 0，无未捕获异常；
2. **数据流一致性**：确认 `BookDocument` 的章节顺序与原始输入完全一致，文章 ID 与生成的哈希 Key 保持幂等；
3. **产物无污染**：确认原始配置对象未被装配函数就地篡改（引用严格隔离）；
4. **生成文档无漂移**：执行 `npm run check:docs` 确认生成文档与源 Schema 严格同步。

## 失败与恢复

若在任何阶段发生验证失败，按以下流程实施排查与回滚：

1. **Schema 校验失败**：检查 `packages/site/src/data/book-config.json` 或测试夹具中的数值是否超出 Schema 定义的枚举或区间；
2. **样式选择器漂移**：若 `book-theme.test.mjs` 报错，说明从显示 CSS 提取测量选择器的规则与实际样式不匹配，检查正则替换规则；
3. **构建产物异常**：先保存首个错误并判断是否由缓存导致；仅处理确认可重建的产物，再执行 `npm run build`；
4. **局部恢复本次修改**：
   - 开始修改前记录 `git status -s` 和本次目标文件的 `git diff -- <文件>`；对未跟踪目标文件另存一份内容快照。HEAD 不能代表原有脏工作区。
   - 失败后对照该快照，只手工撤销本次修改的行；同一 hunk 含原有修改时逐段编辑，不整文件恢复。
   - 本次新建且未被他人继续编辑的文件可移到临时目录保留；不能按模块清理未跟踪文件。
   - 再次核对目标文件的差异、原有暂存状态与未跟踪清单，确认恢复到任务开始时的内容；不删除测试或放宽断言。

## 关联资料

- [模块设计说明](../explanation/design.md)：理解模块架构与职责切分；
- [公共接口参考](../reference/api.md)：查阅公开 API 签名与参数规范；
- [系统架构总览](../../../../docs/architecture/overview.md)：理解跨模块数据流动；
- [全局贡献指南](../../../../docs/guides/contributing.md)：查阅工程规范与提交守则。
