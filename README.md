# Zhimin's Blog

个人博客，基于 **Astro** 构建。首页不是普通信息流，而是一套浏览器里的书籍呈现系统：文章在构建时转成 HTML，在浏览器运行时分页，再装入 **Turn.js** 翻页书中。

访问地址：[https://zhimin.ink/](https://zhimin.ink/)

---

## 当前架构

项目现在分成两个层次：

- **Zhimin Blog**：具体的内容站点，负责文章、目录、导航、页脚、移动端发布和部署。
- **Book Runtime**：可复用的书籍呈现系统，负责主题、分页、页码编排、书本壳和 Turn.js 适配。

整体链路：

```text
Astro content collections / JSON book
  -> BookDocument
  -> Markdown / HTML renderer
  -> buildBookRuntime
  -> BookShell
  -> browser paginator
  -> orchestrator page cache
  -> Turn.js adapter
  -> flipbook UI
```

当前首页只是 Book Runtime 的一个使用者。`/demos/book-runtime/` 证明同一套运行时也可以加载非博客 JSON 内容。

---

## 设计

- **翻页书首页**：首页以硬壳书形式呈现，目录使用罗马数字，正文从 1 开始。
- **内容与呈现分离**：博客文章、JSON 示例书先统一成 `BookDocument`，再交给运行时。
- **主题可替换**：主题同时控制视觉 CSS、测量 CSS、页面尺寸和分页参数。
- **运行时分页**：浏览器端 DOM 测量容器实时分页，支持段落、代码块、列表、表格跨页拆分。
- **Turn.js 非侵入适配**：第三方 Turn.js 保持在 `vendor/`，自研逻辑放在 `public/book-runtime/`。

---

## 技术栈

- **框架**：Astro (SSG)
- **翻页**：Turn.js
- **Markdown**：marked + KaTeX
- **排版**：浏览器 DOM 测量 + 自研分页器
- **评论**：Giscus
- **部署**：GitHub Actions + AWS Lightsail (Ubuntu + Nginx)

---

## 目录结构

```text
blog/
├── src/
│   ├── book/
│   │   ├── assembler/              # BookDocument -> runtime config
│   │   ├── components/             # BookRuntimeAssets / BookShell
│   │   ├── examples/               # 非博客内容源示例
│   │   ├── model/                  # BookDocument / BookEntry 模型
│   │   ├── sources/                # Astro blog source / JSON source
│   │   └── themes/                 # classic-paper / plain-manuscript
│   ├── content/
│   │   ├── blog/                   # 技术文章
│   │   └── life/                   # 生活随笔
│   ├── data/
│   │   ├── book-config.json        # 书本、导航、页脚、主题选择
│   │   └── daily-quote.json        # 页脚每日引言
│   ├── lib/
│   │   └── book-renderer.js        # Markdown -> HTML
│   ├── pages/
│   │   ├── index.astro             # 博客书首页
│   │   ├── blog/                   # 技术文章列表 / 详情
│   │   ├── life/                   # 随笔列表 / 详情
│   │   └── demos/                  # Book Runtime 示例页
│   ├── layouts/
│   └── styles/
├── public/
│   ├── book-runtime/
│   │   └── js/
│   │       ├── paginator.js        # DOM 测量分页引擎
│   │       ├── orchestrator.js     # 全局页码编排与 page cache
│   │       ├── turnjs-adapter.js   # Turn.js 适配层
│   │       └── book-app.js         # 配置读取与运行时启动
│   ├── vendor/turnjs/              # 第三方 Turn.js / jQuery / CSS / 图片
│   └── images/
│       └── mobile/                 # 移动端发布图片
├── scripts/                        # 服务端 webhook 脚本
├── docs/                           # 架构、服务器、iOS 快捷指令文档
└── .github/workflows/              # CI/CD
```

---

## Book Runtime 分层

### 1. 内容源

`src/book/sources/` 把不同来源的数据统一成 `BookDocument`：

- `astro-blog-source.mjs`：读取 `src/content/blog` 与 `src/content/life`。
- `json-book-source.mjs`：读取独立 JSON 书籍内容。

### 2. 渲染与组装

`src/lib/book-renderer.js` 负责 Markdown 到 HTML：

- marked 渲染 Markdown。
- KaTeX 预渲染公式。
- 代码高亮。
- 图片尺寸注入。
- 中西文间距处理。
- 去掉正文中重复的一级标题。

`src/book/assembler/build-book-runtime.mjs` 负责把 `BookDocument`、主题和配置组装成浏览器端 `#book-data`。

### 3. 主题

主题位于 `src/book/themes/`。主题不是单纯的颜色包，它同时定义：

- 视觉 CSS。
- 测量 CSS。
- 页面宽高。
- 正文与目录可用高度。
- 移动端分页参数。
- Turn.js 参数。

当前主题：

- `classic-paper`：首页使用的精装纸书视觉。
- `plain-manuscript`：用于验证主题可替换的极简样板。

### 4. Astro 组件

- `BookRuntimeAssets.astro`：集中注入 Turn.js、jQuery、Hash、CSS 等第三方依赖。
- `BookShell.astro`：渲染书本 DOM、`#book-data`、测量 CSS 和自研 Book Runtime 脚本。

### 5. 浏览器运行时

自研运行时代码位于 `public/book-runtime/js/`：

- `paginator.js`：在隐藏 DOM 中测量 `scrollHeight`，拆分内容页。
- `orchestrator.js`：生成目录、计算正文起始页、填充 `_pageCache`。
- `turnjs-adapter.js`：隔离 Turn.js 细节，处理翻页、hash、滑条、键盘、单页/双页模式。
- `book-app.js`：读取配置、选择分页参数、启动分页和 adapter。

`public/vendor/turnjs/` 只保留第三方资源，不存放自研分页或启动逻辑。

---

## 排版引擎

`paginator.js` 在浏览器中创建隐藏测量容器，通过真实 CSS 布局判断内容是否溢出。

| 元素 | 跨页策略 |
|---|---|
| `<p>` `<li>` `<blockquote>` | 二分搜索可见字符拆分 |
| `<pre>` | 按代码行拆分 |
| `<table>` | 按 `<tr>` 边界拆分，保留 `<thead>` |
| `<ul>` `<ol>` `<dl>` | 嵌套列表提取为同级，再按子项拆分 |
| `<h1>`–`<h6>` | 标题与下一元素整体搬到新页 |

测量 CSS 由主题生成，和最终书页 CSS 同源，避免“测量能放下、实际显示溢出”的问题。

更多细节见 [`docs/pagination-workflow.md`](docs/pagination-workflow.md)。

---

## 自动化工作流

### PC 端

```text
git push
  -> GitHub Actions
  -> npm run build
  -> rsync dist/ 到 AWS Lightsail
```

### iOS 移动端

快捷指令 POST 到 `/webhook`，服务器脚本解析正文和图片，再通过 GitHub API 写入仓库。

图片发布方案见 [`docs/ios-shortcuts-image-publishing.md`](docs/ios-shortcuts-image-publishing.md)。

服务器重建方案见 [`docs/server-runtime/rebuild-server.md`](docs/server-runtime/rebuild-server.md)。

---

## 本地开发

```bash
npm install
npm run dev
```

常用验证：

```bash
npm run build
node --test test/*.test.*
npm run test:e2e
```

---

*"文字留住瞬间。"*
