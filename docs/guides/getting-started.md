---
id: 'docs-guides-getting-started'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: '跨模块工程'
owner: '项目维护者'
parent: 'README.md'
related:
  - 'docs/standards/documentation.md'
  - 'docs/architecture/overview.md'
---

# 开发入门：从内容到可验证的产物

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

在本地安装依赖、检查首页 `/` 与传统目录 `/classic`，再构建并运行工程验证。此指南用于建立开发环境，不启动真实发布服务或部署。

本指南仅适用于：

1. 首次搭建本地开发调试环境并验证工具链完备性；
2. 理解全站的核心数据流动路线（文稿资产 → 静态构建载荷 → 浏览器排版测量）；
3. 掌握全仓统一质量门禁命令（`npm run verify`）与端到端测试（`npm run test:e2e`）的执行方法。

本指南不适用于：

1. 直接在生产服务器上部署或重启服务；
2. 向远程代码仓库推送未经评审的代码或文稿提交；
3. 申请生产环境的 Webhook Secret 或管理云主机密钥。

## 前置条件

在开展本地开发前，必须确认本地环境满足以下前置依赖：

1. **工作目录定位**：受 Git 版本控制的工程根目录为 `blog/`，所有终端命令必须在此目录下运行；
2. **Node.js 运行时**：Node.js 版本必须为 22 LTS（>=22.13.0）或 24+，并配备对应的 npm；
3. **依赖安装与基线检查**：
   ```sh
   node --version
   git status --short
   npm ci
   ```
4. **安全隔离说明**：本地开发与演练仅使用本地文件系统与回环网络，不需要任何 GitHub Personal Access Token 或 SSH 私钥（严禁触碰外层目录下的 `.pem` 密钥文件）。

## 输入与配置

本地开发涉及的核心输入资产与网络端口分配如下：

| 配置项       | 物理路径 / 参数                                                      | 说明与默认值                             |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| 生产文稿资产 | `packages/site/src/content/blog/`, `packages/site/src/content/life/` | 博客生活随笔与技术文章 Markdown 原件     |
| 书籍排版配置 | `packages/site/src/data/book-config.json`                            | 拟真书几何尺寸、断点、Turn.js 预设参数   |
| 经典首页配置 | `packages/site/src/data/homepage-config.json`                        | 经典双栏目录的视觉字号、间距与配色 Token |
| 本地服务端口 | `http://127.0.0.1:4321`                                              | Astro 开发服务与预览服务默认监听端口     |

在执行端到端测试前，必须确保 4321 端口未被其他前台或后台常驻进程占用。

## 操作步骤

### 步骤 1：启动本地开发服务器并体验双入口

在终端启动本地实时热重载开发服务：

```sh
npm run dev
```

服务启动后，在浏览器中分别访问以下两个核心入口：

- 访问 `http://127.0.0.1:4321/`：观察拟真翻页书效果，体验文章加载、章节目录跳转与封面翻折交互；
- 访问 `http://127.0.0.1:4321/classic`：观察经典双栏布局，验证生活随笔与技术文章的时间轴排序与暗色模式切换。

### 步骤 2：执行全套自动化工程门禁（静态编译与代码验证）

关闭开发服务器（`Ctrl+C`），在项目根目录运行全流程自动化工程门禁：

```sh
npm run verify
```

该命令将依次串行执行以下 8 项严格质量检查：

1. Prettier 代码格式检查；
2. ESLint 静态代码规则扫描；
3. TypeScript 核心契约类型检查（`tsconfig.contracts.json`）；
4. 工程文档九字段元数据、ASCII 框线图与章节固定目录合规性检查（`check:docs`）；
5. 跨模块依赖边界与架构合规性扫描（`check:boundaries`）；
6. Astro 模板与类型安全检查（`astro check`）；
7. 全站静态站点构建（`astro build`），生成最新的 `dist/` 生产产物；
8. 运行模块及跨模块 Node 测试，覆盖数据转换、配置契约、回环 HTTP 和构建产物；测试数量以本次执行输出为准。

### 步骤 3：启动生产产物预览并执行端到端测试

基于刚生成的 `dist/` 静态产物，启动本地无头浏览器进行端到端视觉与交互回归：

```sh
# 1. 确保已安装 Playwright Chromium 内核
npx playwright install chromium

# 2. 运行端到端测试套件（测试脚本会自动启动 preview 预览服务并连接执行）
npm run test:e2e
```

## 结果核对

完成上述步骤后，对照以下标准确认本地环境处于健康可用状态：

| 执行阶段                    | 终端预期输出与可观察现象                       | 严禁产生的错误推论                            |
| --------------------------- | ---------------------------------------------- | --------------------------------------------- |
| 步骤 1 (`npm run dev`)      | 终端打印服务就绪地址，浏览器顺利打开两个入口   | 不代表静态 `dist/` 产物已构建成功             |
| 步骤 2 (`npm run verify`)   | 连续输出所有门禁通过日志，最终退出码严格为 0   | 不代表真实生产服务器已经发布生效              |
| 步骤 3 (`npm run test:e2e`) | Playwright 显示所有 Chromium 测试场景全部 PASS | 不代表 Safari 或 iOS 真机物理屏幕表现完全等价 |

## 失败与恢复

若在任何执行阶段遇到异常，请按以下指导实施排查与恢复：

1. **端口冲突报错（EADDRINUSE: 4321）**：
   - 先执行只读诊断 `lsof -nP -iTCP:4321 -sTCP:LISTEN`，确认占用进程和所属任务。在自己启动的 dev/preview 终端按 Ctrl+C 正常停止；无法确认归属时不要批量 kill，先协调端口使用。
2. **文档规范报错（check:docs failed）**：
   - 检查报错文档的 YAML Frontmatter 是否缺失了 9 项必填元数据，确认二级标题顺序完全符合所属类型的固定目录契约；
3. **模块边界报错（check:boundaries failed）**：
   - 检查是否有新增的代码跨模块导入了未在 `packages/tooling/src/modules.json` 中公开的私有内部文件，改为通过对应模块的 `api/` 入口导入；
4. **恢复本次修改**：
   - 先执行只读 git status 和 git diff，记录本次文件、已有差异及未跟踪文件；未跟踪内容不能只靠 diff 保存。
   - 恢复到任务开始时的状态，不默认恢复 HEAD。仅确认属于本次操作的差异才可以逐文件或逐块撤销；原有改动与本次混合时保留原有部分，归属不明则停止恢复。
   - 不执行整仓库或模块目录级覆盖/删除。构建产物与源码分别判断；不要清理原有文件来制造“干净环境”。

## 关联资料

- [系统架构总览](../architecture/overview.md)：系统分层架构与数据流动模型；
- [文档编写与组织规范](../standards/documentation.md)：受控工程文档的标准规范与元数据要求；
- [全局测试方案](../testing/strategy.md)：全工程测试矩阵与分层证据边界；
- 各独立模块深入指南：[Site 模块](../../packages/site/README.md)、[Book Build 模块](../../packages/book-build/README.md)、[Book Runtime 模块](../../packages/book-runtime/README.md)、[Publishing 模块](../../packages/publishing/README.md)、[Operations 模块](../../packages/operations/README.md)。
