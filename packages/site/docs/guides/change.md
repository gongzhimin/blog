---
id: 'src-site-docs-guides-change'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/site/README.md'
related:
  - 'packages/site/docs/explanation/design.md'
  - 'packages/site/docs/reference/api.md'
---

# 修改 Site 的风险与流程

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

本指南规范修改博客前台站点模块（`packages/site`）时的工程步骤、跨模块联动风险评估与紧急回滚方案。
适用修改场景包括：

1. 调整文稿草稿判定规则、发布日期优先级或多集合合并排序策略（`sources/`）；
2. 修改经典首页（`/classic`）或归档页的双栏排版与目录紧凑日期投影（`catalog/`）；
3. 调整经典视图视觉配置契约（`homepage-config.json` 与对应 Schema 生成器）；
4. 修改 Astro 页面路由结构、布局模板或评论/光标等局部挂载组件（`pages/`, `layouts/`, `components/`）；
5. 调整每日一句第三方格言同步逻辑与降级策略（`quotes/`）。

**非适用范围**：

- 修改 Markdown 词法分析、KaTeX 数学公式渲染或书籍书壳底层组件（属于 `packages/book-build` 职责）；
- 修改浏览器端翻页动画或富文本切分算法（属于 `packages/book-runtime` 职责）；
- 运维环境 Nginx 配置与生产服务拉起（属于 `packages/operations` 职责）。

## 前置条件

在实施任何代码或配置改动前，必须确认并满足以下条件：

1. **工作目录**：所有验证与修改命令必须在 `blog/` 目录下执行；
2. **环境与依赖**：Node.js 版本满足 22 LTS（>=22.13.0）或 24+，且已运行 `npm ci` 完成依赖同步；
3. **工作区状态与基线标记**：
   - 执行 `git status -s` 检查工作区状态，记录并保留原有暂存、未暂存和未跟踪内容；
   - 记录当前提交哈希 `git rev-parse HEAD` 作为安全回退基准；
4. **权限与操作边界**：本地修改限于获准的 `packages/site/src/`、相关 `tests/integration/`、`tests/e2e/` 及必要文档；严禁未经授权执行 `git push` 或操作生产环境。

## 输入与配置

实施修改时，开发人员必须对照下表明确配置归属与下游影响：

| 变更类型           | 涉及源码路径                                                   | 核心契约与原则                                                                 | 下游联动影响与防范                                 |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 内容过滤与排序政策 | `packages/site/src/internal/sources/`                          | 保持对 `BookDocument` 标准模型的单一产出，严禁把页面私有逻辑下沉到通用书籍模块 | 必须核对静态构建生成的书籍总篇目数与目录顺序       |
| 经典首页视觉配置   | `packages/site/src/data/homepage-config.json`, `api/index.mjs` | Schema 为单一权威源，严禁手动维护重复规则                                      | 必须执行 `npm run docs:generate` 刷新配置参考文档  |
| 页面路由与模板组合 | `packages/site/src/pages/`, `packages/site/src/layouts/`       | 严格遵守统一相对路径与公共 API 导入规范                                        | 必须核对静态产物 HTML 中各页面的渲染结果与内联脚本 |
| 每日一句服务接入   | `packages/site/src/quotes/`                                    | 纯纯逻辑与网络隔离，必须支持依赖注入与超时熔断                                 | 必须在离线断网与网络超时两种状态下验证降级行为     |

## 操作步骤

### 步骤 1：确立基线与缺陷复现（只读分析）

在修改实现前，先运行现有测试套件，确认当前行为基准：

```sh
# 运行 Site 模块核心单元测试
node --test tests/integration/public-api.test.mjs packages/site/tests/homepage-data.test.mjs packages/site/tests/homepage-config.test.mjs packages/site/tests/daily-quote.test.mjs
```

### 步骤 2：实施代码与配置修改（写入改动）

1. **核心逻辑编写**：在 `packages/site/src/` 对应子目录完成业务修改；
2. **公开接口维护**：若有新函数或配置工具对外暴露，必须在 `packages/site/src/api/index.mjs` 中登记；
3. **同步生成文档**：若修改了 `homepage-config.json` 或其 Schema，立即运行生成命令：
   ```sh
   npm run docs:generate
   ```

### 步骤 3：模块级单元测试与静态构建验证

实施修改后，依次执行离线测试与全站静态编译：

```sh
# 1. 运行核心单元测试
node --test tests/integration/public-api.test.mjs packages/site/tests/homepage-data.test.mjs packages/site/tests/homepage-config.test.mjs packages/site/tests/daily-quote.test.mjs

# 2. 执行静态编译，产生全新 dist 产物
npm run build

# 3. 运行静态渲染产物契约测试
node --test tests/integration/homepage-render.test.mjs tests/integration/archive-render.test.mjs
```

### 步骤 4：端到端与全量工程验证

启动无头浏览器并运行全工程自动化门禁：

```sh
# 运行端到端视觉与交互回归测试
npm run test:e2e

# 运行工程级全量校验（Prettier、ESLint、类型、边界及文档检查）
npm run verify
```

## 结果核对

完成操作后，对照以下清单逐项核查：

1. **构建与退出码**：所有构建与测试命令退出码必须为 0，控制台无未捕获警告；
2. **路由连通性**：确认静态产物目录 `dist/` 下包含 `/index.html`、`/classic/index.html` 及各文章详情页；
3. **配置与文档同步**：运行 `npm run check:docs` 确认生成文档无滞后或手工篡改；
4. **视觉与交互正常**：在本地执行 `npm run preview` 并打开浏览器，人工走查首页与经典视图的自适应表现。

## 失败与恢复

若在任何验证阶段发生失败，按以下流程实施排查与紧急恢复：

1. **文稿日期解析报错**：若构建抛出 `Invalid post date`，检查报错文章的 Frontmatter，修复错误的日期格式，禁止在适配器中放宽校验；
2. **样式变量未生效**：若页面样式错乱，检查 `buildHomepageCssVariables()` 输出的 CSS 变量名是否与组件样式文件中的引用完全对齐；
3. **构建产物损坏**：先记录首个构建错误，确认是否为缓存问题；需要重建时只处理已确认可重新生成的产物，再执行 `npm run build`；
4. **局部恢复本次修改**：
   - 开始修改前记录 `git status -s` 和本次目标文件的 `git diff -- <文件>`；对未跟踪目标文件另存一份内容快照。HEAD 不能代表原有脏工作区。
   - 失败后对照该快照，只手工撤销本次修改的行；同一 hunk 含原有修改时逐段编辑，不整文件恢复。
   - 本次新建且未被他人继续编辑的文件可移到临时目录保留；不能按模块清理未跟踪文件。
   - 再次核对目标文件的差异、原有暂存状态与未跟踪清单，确认恢复到任务开始时的内容；不删除测试或放宽断言。

## 关联资料

- [模块设计说明](../explanation/design.md)：系统架构与内容政策设计；
- [公共接口参考](../reference/api.md)：查看对外导出的 API 签名；
- [全局系统架构](../../../../docs/architecture/overview.md)：理解跨模块数据交互；
- [全局贡献指南](../../../../docs/guides/contributing.md)：查阅提交规范与开发守则。
