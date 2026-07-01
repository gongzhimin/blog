# Book Runtime 模块化设计

## 背景

当前项目已经不只是一个 Astro 博客主题。它包含了内容源、Markdown 渲染、书页排版、浏览器分页、Turn.js 翻页、移动端发布、GitHub Actions 部署等多个子系统。

目前这些能力主要集中在首页链路中：

```text
Astro content collections
  -> src/pages/index.astro
  -> src/lib/book-renderer.js
  -> src/styles/book-content.css
  -> public/vendor/turnjs/js/paginator.js
  -> public/vendor/turnjs/js/orchestrator.js
  -> public/vendor/turnjs/js/book-app.js
  -> Turn.js book
```

这条链路已经能稳定呈现博客文章，但它把“内容是什么”和“如何以书本形式呈现”绑得过紧。后续需求已经变成：

1. 书页样式可以更换。
2. 内容呈现系统可以独立出来，不只显示博客 Markdown。
3. 博客只是书籍呈现系统的一个内容来源。

因此需要把当前系统演进为：

```text
Zhimin Blog
  = 一个具体内容站点

Book Runtime
  = 一个可复用的浏览器书籍呈现系统
```

## 目标

### 必须实现

- 将“内容来源”和“书籍呈现”分离。
- 将书页主题从首页实现中抽离，使主题可替换。
- 让主题同时控制视觉 CSS 和分页测量参数。
- 让首页继续保持现有视觉与交互，不引入行为回归。
- 让后续可以接入非博客内容源，例如单本书、图文集、JSON 内容、手写 HTML 内容。

### 暂不实现

- 不更换 Turn.js。
- 不把项目拆成 monorepo 或独立 npm 包。
- 不一次性重写首页视觉。
- 不新增后台管理系统。
- 不引入数据库。

## 当前模块划分

当前项目可以逻辑上分成 8 个模块。

### 1. 内容源模块

当前位置：

```text
src/content/blog
src/content/life
src/content.config.ts
```

职责：

- 存放博客文章和生活文章。
- 由 Astro Content Collections 读取。

问题：

- 内容源类型固定为 Astro Markdown collections。
- 首页直接知道 `blog` 和 `life` collection 的存在。
- 非博客内容无法自然接入书本呈现链路。

### 2. 内容标准化模块

当前位置：

```text
src/pages/index.astro
src/lib/homepage.mjs
```

职责：

- 排序文章。
- 提取标题、日期、正文。
- 把 Markdown 转成首页运行时需要的 `articles` 数据。

问题：

- 标准化逻辑没有明确模型。
- `index.astro` 同时负责内容查询、转换和页面渲染。

### 3. Markdown 渲染模块

当前位置：

```text
src/lib/book-renderer.js
```

职责：

- Markdown 转 HTML。
- KaTeX 渲染。
- 代码高亮。
- 表格包装。
- 图片尺寸注入。
- 中西文自动间距。
- 去掉正文重复标题。

状态：

- 这个模块边界相对清楚。
- 它已经基本不依赖 Astro，也不知道 Turn.js。

需要改进：

- 图片宽度目前有硬编码。
- 表格、图片、figure 等能力后续应由主题或渲染选项控制。

### 4. 书籍组装模块

当前位置：

```text
src/pages/index.astro
public/vendor/turnjs/js/orchestrator.js
```

职责：

- 生成目录。
- 计算初始页码。
- 注入封面、目录、正文、空白页、后封。
- 组织 `book-data`。

问题：

- 服务端组装和浏览器运行时组装分散在两个地方。
- 页码规则、目录规则、物理页规则和文章规则混杂。

### 5. 分页模块

当前位置：

```text
public/vendor/turnjs/js/paginator.js
```

职责：

- 在浏览器 DOM 中测量内容高度。
- 按真实样式分页。
- 拆分段落、列表、代码块、表格。

问题：

- 存在硬编码页面宽高。
- 分页器依赖全局 `MEASURE_CSS`。
- 分页策略与当前书页主题耦合。

### 6. 书页主题模块

当前位置：

```text
src/data/book-config.json
src/styles/book-content.css
src/styles/book-toc.css
src/styles/code-highlight.css
src/styles/fonts.css
public/vendor/turnjs/css/steve-jobs.css
src/pages/index.astro inline CSS
```

职责：

- 控制页面尺寸。
- 控制内容字体、纸张质感、目录样式、代码样式、封面图片。

问题：

- 主题参数分散。
- 视觉 CSS 和测量 CSS 需要手动同步。
- 换字体、行高、边距会影响分页，但目前没有统一约束。

### 7. 翻页交互模块

当前位置：

```text
public/vendor/turnjs/js/book-app.js
public/vendor/turnjs/js/orchestrator.js
public/vendor/turnjs/turn.js
```

职责：

- 启动 Turn.js。
- 响应 hash route。
- 支持键盘翻页、滑条、鼠标滚动。
- 按需添加页面。

问题：

- Turn.js 细节暴露在业务结构里。
- 后续若增加其他阅读模式，缺少适配层。

### 8. 发布系统模块

当前位置：

```text
scripts/webhook-receiver.cjs
.github/workflows/deploy.yml
.github/workflows/deploy-webhook.yml
docs/server-runtime
docs/ios-shortcuts-image-publishing.md
```

职责：

- iOS Shortcuts 发布。
- GitHub API 写入 Markdown 和图片。
- GitHub Actions 构建部署。
- 服务器运行配置。

状态：

- 这个模块与书本呈现系统可以保持松耦合。
- 它只需要知道目标内容目录和资源目录。

## 目标架构

### 目录结构

第一阶段不拆 npm 包，只在 `src/book/` 内部形成清晰边界：

```text
src/book/
  model/
    BookDocument.ts
    BookEntry.ts
    BookTheme.ts

  sources/
    astro-blog-source.ts
    json-book-source.ts
    markdown-folder-source.ts

  renderers/
    markdown-renderer.ts
    html-renderer.ts

  assembler/
    build-book-document.ts
    build-toc.ts
    build-runtime-config.ts

  themes/
    classic-paper/
      theme.json
      page.css
      toc.css
      code.css
      cover.css
      measure.css

  runtime/
    paginator.js
    page-cache.js
    turnjs-adapter.js
    book-app.js
```

Astro 页面层变薄：

```text
src/pages/index.astro
  -> 选择 content source
  -> 选择 theme
  -> build runtime config
  -> 渲染 BookShell
```

## 核心模型

### BookEntry

`BookEntry` 是书籍运行时接收的最小内容单元。

```ts
type BookEntry = {
  id: string;
  title: string;
  date?: Date;
  body: string;
  bodyType: "markdown" | "html";
  href?: string;
  metadata?: Record<string, unknown>;
};
```

说明：

- 博客文章、生活文章、单本书章节、图文集条目都先转成 `BookEntry`。
- `bodyType` 决定使用哪种 renderer。
- `href` 可用于目录或外链。

### BookDocument

`BookDocument` 表示一本待呈现的书。

```ts
type BookDocument = {
  id: string;
  title: string;
  description?: string;
  entries: BookEntry[];
  tocTitle: string;
  frontMatter?: BookEntry[];
  backMatter?: BookEntry[];
  metadata?: Record<string, unknown>;
};
```

说明：

- 首页博客书是一种 `BookDocument`。
- 未来单本长文、作品集、图文册也可以是 `BookDocument`。

### BookTheme

`BookTheme` 同时描述视觉和分页条件。

```ts
type BookTheme = {
  id: string;
  name: string;
  page: {
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
  };
  assets: {
    coverSprite?: string;
    fonts?: string[];
  };
  styles: {
    pageCss: string;
    tocCss: string;
    codeCss: string;
    coverCss: string;
    measureCss: string;
  };
  turn: {
    elevation: number;
    duration: number;
    startPage: number;
  };
};
```

关键原则：

```text
主题不只是颜色。
主题必须同时控制页面尺寸、字体、边距、测量 CSS 和分页参数。
```

否则换主题后分页会失准。

## 数据流

目标数据流：

```text
ContentSource
  -> BookEntry[]
  -> BookDocument
  -> Renderer
  -> RenderedEntry[]
  -> BookAssembler
  -> RuntimeBookConfig
  -> BookShell
  -> Browser Paginator
  -> Turn.js Adapter
```

展开：

```text
Astro collections
  -> AstroBlogSource
  -> BookDocument("Zhimin 的博客书")
  -> MarkdownRenderer
  -> HTML entries
  -> TOC + cover + article sequence
  -> injected #book-data
  -> paginator measures real DOM
  -> turnjs adapter displays pages
```

未来非博客内容：

```text
JSON book file
  -> JsonBookSource
  -> BookDocument("一本独立的书")
  -> HTMLRenderer or MarkdownRenderer
  -> same runtime
```

## 内容源设计

### ContentSource 接口

```ts
interface ContentSource {
  id: string;
  load(): Promise<BookDocument>;
}
```

第一批 source：

```text
AstroBlogSource
  - 读取 blog + life collections
  - 按日期排序
  - 输出当前博客书

JsonBookSource
  - 读取 JSON 文件
  - 适合非博客内容

MarkdownFolderSource
  - 读取一个文件夹内 Markdown
  - 适合单本书/文档集
```

第一阶段只需要实现 `AstroBlogSource`，但接口要为其他 source 留好位置。

## 主题设计

### 第一主题：classic-paper

现有书页视觉迁移为第一个主题：

```text
src/book/themes/classic-paper/
```

包含：

```text
theme.json       页面尺寸、Turn.js 参数、封面 sprite 参数
page.css         正文书页样式
toc.css          目录样式
code.css         代码高亮样式
cover.css        纸张、封面、书口、深度样式
measure.css      测量容器样式
```

### 测量 CSS 原则

测量 CSS 必须由主题生成或与主题同源，不能手写第二份。

现有做法：

```text
book-content.css replace selector -> measurement CSS
```

可以保留，但要封装在 theme loader 内部。

目标：

```text
ThemeLoader.load("classic-paper")
  -> visual CSS
  -> measurement CSS
  -> pagination page size
```

## 分页器设计

### 当前问题

`paginator.js` 中存在硬编码：

```js
var ARTICLE_H = 471;
var ARTICLE_W = 380;
```

这些应从 `BookTheme.page` 或 runtime config 中读取。

### 目标接口

浏览器运行时拿到：

```js
BOOK_CONFIG.runtime.pagination = {
  articleWidth: 380,
  articleHeight: 471,
  tocWidth: 300,
  tocHeight: 420,
  measureCss: "..."
};
```

分页器初始化：

```js
PAGINATOR.configure(BOOK_CONFIG.runtime.pagination);
```

第一阶段可以不彻底模块化，只把硬编码转移到配置。

## Turn.js 适配层

Turn.js 应成为实现细节。

目标：

```text
BookRuntime
  -> PageProvider
  -> TurnJsAdapter
```

`book-app.js` 应只负责：

```text
1. 读取 #book-data。
2. 初始化分页。
3. 把 page provider 接给 Turn.js。
4. 处理 hash、键盘、slider。
```

它不应该知道博客文章、目录生成、内容排序等业务逻辑。

## Astro 页面层

`src/pages/index.astro` 目标是变薄。

当前职责：

```text
读取 collection
排序文章
渲染 Markdown
生成 TOC
拼测量 CSS
拼首页 CSS
生成 book DOM
注入 runtime config
渲染导航和页脚
```

目标职责：

```text
选择 source
选择 theme
调用 buildBookRuntime
渲染 BookShell
```

示意：

```astro
---
import { createAstroBlogSource } from "../book/sources/astro-blog-source";
import { loadBookTheme } from "../book/themes/load-theme";
import { buildBookRuntime } from "../book/assembler/build-book-runtime";
import BookShell from "../book/components/BookShell.astro";

const source = createAstroBlogSource();
const theme = await loadBookTheme("classic-paper");
const runtime = await buildBookRuntime({ source, theme });
---

<BookShell runtime={runtime} />
```

## 实施路线

### 阶段 1：抽出书籍数据组装

目标：

- 不改变视觉。
- 不改变分页。
- 不改变 Turn.js。
- 只让 `index.astro` 变薄。

任务：

```text
1. 新增 src/book/model。
2. 新增 AstroBlogSource。
3. 新增 buildBookRuntime。
4. 把 index.astro 中文章查询、排序、TOC、runtime config 迁出。
5. 保留现有 CSS 和 JS 引用。
```

验收：

```text
npm run build 通过。
现有 homepage tests 通过。
首页页面数、目录、文章顺序不变。
```

### 阶段 2：抽出 classic-paper 主题

目标：

- 建立主题目录。
- 把 `book-config.json`、书页 CSS、目录 CSS、代码 CSS 的关系收拢。
- 仍然只有一个主题。

任务：

```text
1. 新建 src/book/themes/classic-paper。
2. theme.json 承接现有 book-config 的 book/page/turn 参数。
3. 迁移 book-content.css、book-toc.css、code-highlight.css 到主题目录或由主题引用。
4. ThemeLoader 输出 visual CSS 和 measurement CSS。
5. index.astro 不再手动拼测量 CSS。
```

验收：

```text
换文件位置不改变页面视觉。
测量 CSS 与视觉 CSS 仍同源。
```

### 阶段 3：分页器配置化

目标：

- 移除 `paginator.js` 中的页面尺寸硬编码。
- 分页器读取 runtime config。

任务：

```text
1. 为 PAGINATOR 增加 configure。
2. 把 ARTICLE_W、ARTICLE_H、TOC 测量尺寸从 config 注入。
3. 更新测试覆盖 config 注入。
```

验收：

```text
现有主题分页结果保持稳定。
调整主题 page.contentWidth 后测量容器宽度随之变化。
```

### 阶段 4：新增第二主题样板

目标：

- 验证主题可替换，而不是只抽目录。

第二主题可以先做极简：

```text
plain-manuscript
```

特征：

```text
无硬壳封面
更素的纸页
不同字体和行距
同样使用 Turn.js 翻页
```

验收：

```text
通过配置切换主题。
两个主题都能构建。
分页器使用各自主题参数。
```

### 阶段 5：接入非博客内容源

目标：

- 证明 Book Runtime 不依赖博客 Markdown。

新增一个 JSON 示例：

```text
src/book/examples/sample-book.json
```

结构：

```json
{
  "title": "Sample Book",
  "entries": [
    {
      "title": "第一章",
      "bodyType": "markdown",
      "body": "这是正文。"
    }
  ]
}
```

新增页面：

```text
src/pages/demos/book-runtime.astro
```

验收：

```text
/demos/book-runtime/ 显示独立内容。
不读取 src/content/blog 或 src/content/life。
```

## 风险与约束

### 视觉回归风险

书页视觉和分页高度强相关。任何字体、行距、边距变化都可能改变分页。

控制方式：

```text
每阶段只移动边界，不主动改视觉。
保留现有测试。
需要时增加 HTML 结构断言。
```

### Turn.js 全局依赖风险

现有 Turn.js、jQuery、Modernizr 依赖全局变量。

控制方式：

```text
短期保留 vendor 目录。
先建立 adapter 边界。
不在第一阶段替换 Turn.js。
```

### 主题抽象过度风险

如果一开始设计太通用，会拖慢重构。

控制方式：

```text
先只有 classic-paper 一个真实主题。
接口只覆盖当前实际需要的 page、toc、content、cover、measure。
第二主题到阶段 4 再验证。
```

### 文档和实现脱节风险

架构演进较长，容易文档先行但代码不跟。

控制方式：

```text
每阶段都有小验收。
每次提交保持可构建。
不做跨阶段大提交。
```

## 测试策略

保留现有测试：

```text
test/homepage-render.test.mjs
test/homepage-layout.spec.mjs
test/homepage-data.test.mjs
test/homepage-config.test.mjs
```

新增测试方向：

```text
BookDocument model:
  - AstroBlogSource 输出稳定 entries。

Theme loader:
  - classic-paper 输出视觉 CSS、测量 CSS、分页参数。

Runtime config:
  - buildBookRuntime 输出 articles、toc、turn config。

Paginator config:
  - PAGINATOR 使用注入尺寸，不使用硬编码默认值。

Non-blog source:
  - JSON source 可以生成独立 BookDocument。
```

## 成功标准

最终达到：

```text
博客内容 -> Book Runtime -> classic-paper theme -> Turn.js book
非博客内容 -> Book Runtime -> 任意 theme -> Turn.js book
```

具体表现：

- 首页视觉保持现状。
- 书页主题可以通过配置切换。
- `index.astro` 明显变薄。
- `BookDocument` 成为内容呈现的统一输入。
- 新增内容源不需要修改分页器和 Turn.js 适配层。
- 新增主题不需要修改内容源。

## 第一阶段建议

下一步不直接改视觉，也不碰 Turn.js。

建议先实施：

```text
阶段 1：抽出书籍数据组装
```

这是风险最低、收益最高的一步。它能先把 `index.astro` 从“万能文件”降级为页面壳，同时为主题抽离和非博客内容源打基础。
