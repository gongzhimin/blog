# 窗口宽度锚定书本与组件化配置设计

日期：2026-06-23

## 目标

首页采用“书本是视觉主体”的尺寸模型：

- 书本宽度始终保持为窗口宽度的固定比例。
- 书本保持固定宽高比。
- 书本达到最小尺寸后不再继续缩小。
- 窗口容纳不下完整书本时，整个页面允许横向和纵向滚动。
- 导航、书本和页脚按自然文档流排列，不再按窗口高度分配固定区域。
- 书内所有文字只按整本书宽度的比例缩放，不使用固定字号、最小字号或最大字号。
- JSON 参数按组件组织，不再按 `layout`、`textStyles`、`materials` 等属性类别组织。

## 页面尺寸模型

### 书本宽度

书本宽度使用窗口宽度比例，并设置硬最小宽度：

```text
书本宽度 = max(窗口宽度 × 书本宽度比例, 书本最小宽度)
书本高度 = 书本宽度 ÷ 固定宽高比
```

对应 CSS 模型：

```css
.home-book-frame {
  width: max(
    var(--home-book-size-viewport-width),
    var(--home-book-size-minimum-width)
  );
  aspect-ratio: var(--home-book-size-aspect-ratio);
}
```

初始参数：

- 窗口宽度比例：`72vw`
- 最小宽度：`36rem`
- 宽高比：`1.8 / 1`

书本不再读取内容区剩余高度，也不再因为窗口变矮而被压小。

### 页面滚动

移除首页的横向裁剪。

书本舞台的最小宽度应包含：

```text
书本最小宽度 + 左右间隔
```

当窗口更窄时，文档宽度自然超过视口，浏览器提供横向滚动；当导航、书本和页脚总高度超过视口时，浏览器提供纵向滚动。

横向溢出的书本不能通过负边距居中到视口左侧之外，否则左半部分不可达。书本舞台自身扩展到所需宽度，再在舞台内部居中书本。

## 自然文档流

页面顺序保持：

```text
导航
书本舞台
每日一句与版权
```

导航高度和页脚高度由各自内容、内边距与最小高度决定。首页不再使用如下模型：

```css
grid-template-rows: 书本剩余高度 页脚固定高度;
```

导航可以继续保持 `position: sticky`。页脚是普通文档流元素。

## 书内比例排版

`.home-book-frame` 保持为 `home-book` 容器。书内所有文字参数只保留单个 `fontSize`，单位使用 `cqw`：

```json
{
  "fontFamily": "serif",
  "fontSize": "0.55cqw",
  "lightColor": "#282522",
  "darkColor": "#282522"
}
```

书内文字不再使用：

- `minimumSize`
- `fluidSize`
- `maximumSize`
- `clamp()`
- `rem`、`px` 或视口字号单位

生活页和技术页每一种文字仍使用独立参数对象，即使初始取值相同。

导航和页脚不属于书内排版，可以继续使用各自组件容器单位和 `clamp()`，但参数归入对应组件内部。

## 纸页、中缝与书内脊

### 纸页弯曲

左右纸页保留轻微 3D 弯曲：

```css
.book-page[data-section="life"] {
  transform-origin: right center;
  transform: rotateY(calc(-1 * var(--home-book-pages-shared-rotation-y)));
}

.book-page[data-section="technical"] {
  transform-origin: left center;
  transform: rotateY(var(--home-book-pages-shared-rotation-y));
}
```

书本容器开启 `perspective` 和 `transform-style: preserve-3d`。

纸页上下外边界继续保持对齐。不得通过错层、不同高度或底部位移制造纸页厚度。

### 1px 中缝

中缝本体是独立的 `1px` 细线：

```css
.home-book-gutter {
  width: var(--home-book-inner-spine-seam-width);
}
```

中缝具有纵深阴影，但阴影不能通过增加线宽实现：

- 左页内侧伪元素：透明到深色渐变。
- 右页内侧伪元素：镜像渐变。
- 1px 中缝自身可以向左右投射较弱的阴影。

### 书内脊

“书内脊”指纸页下方的深色装订区域，不是纸面上的宽色带。

层级顺序：

```text
1px 中缝和中缝阴影
纸页
书内脊及其上下弧形端面
封面
```

深色书内脊主体位于纸页后方。纸页会遮住它的中段，只在书本顶部和底部中央露出弧形端面。

弧形端面由书内脊组件的 `::before` 和 `::after` 生成，不新增覆盖纸面的元素。弧形参数独立配置：

- 书内脊宽度。
- 顶部、底部端面高度。
- 端面横向扩展比例。
- 弧形圆度。
- 深色渐变与内阴影。

### 书口与上下边缘

左右书口维持现有厚度：

- 书口宽度：`2%`
- 纸张条纹密度维持现状

上方和下方纸面采用相同边缘处理。纸张上下必须对齐，不增加底部错层叠页。

## 组件化 JSON

配置顶层改为组件：

```json
{
  "navigation": {},
  "book": {},
  "footer": {},
  "directories": {}
}
```

删除按属性分类的顶层：

- `content`
- `layout`
- `catalogs`
- `textStyles`
- `materials`

### 导航组件

```json
{
  "navigation": {
    "content": {
      "siteName": "ZHIMIN",
      "title": "写技术，也记录技术之外的生活。"
    },
    "size": {},
    "spacing": {},
    "brand": {},
    "title": {},
    "links": {
      "life": {},
      "technical": {},
      "about": {},
      "rss": {}
    },
    "themeToggle": {}
  }
}
```

每个链接对象包含自己的显示文字、地址和文字样式。

### 书本组件

```json
{
  "book": {
    "size": {},
    "stage": {},
    "perspective": {},
    "shadow": {},
    "cover": {},
    "pageEdges": {},
    "innerSpine": {},
    "paper": {},
    "pages": {
      "shared": {},
      "life": {},
      "technical": {}
    }
  }
}
```

`book.pages.life` 和 `book.pages.technical` 各自包含：

- 显示文字。
- 页面内边距和目录间距。
- 页眉、Part、目录标题、日期、总目录入口、页码的独立文字样式。
- 目录数量、断点与日期格式。

### 页脚组件

```json
{
  "footer": {
    "content": {
      "copyrightLabel": "Zhimin 的博客书"
    },
    "size": {},
    "spacing": {},
    "quoteEnglish": {},
    "quoteTranslation": {},
    "quoteAuthor": {},
    "copyright": {}
  }
}
```

每日一句正文继续来自 `daily-quote.json`，但显示样式归入 `footer`。

### 目录组件

```json
{
  "directories": {
    "life": {
      "folio": {}
    },
    "technical": {
      "folio": {}
    }
  }
}
```

## 配置模块与调参页面

`homepage-config.mjs` 继续负责：

- 配置校验。
- CSS 变量生成。
- 容器查询生成。
- 导出字段描述供调参页面使用。

字段路径和 CSS 变量名称全部迁移到组件路径，例如：

```text
book.size.viewportWidth
  → --home-book-size-viewport-width

book.pages.life.catalogTitle.fontSize
  → --home-book-pages-life-catalog-title-font-size

book.innerSpine.seamWidth
  → --home-book-inner-spine-seam-width
```

现有 `/tune` 调参页面保留，并改为按组件树展示：

- Navigation
- Book
  - Size / Stage
  - Cover
  - Page edges
  - Inner spine
  - Paper
  - Life page
  - Technical page
- Footer
- Directories

导出 JSON 时保持新的组件化结构。

## 响应式目录

目录窄页和极窄页查询继续以书本容器宽度为条件，而不是视口宽度。

由于书本存在硬最小宽度，默认手机窗口下书本宽度可能不会低于窄页阈值。是否进入紧凑目录由配置阈值决定，不额外加入视口媒体查询。

## 测试

### 配置

- 顶层只存在组件分组。
- 旧的属性分类顶层不存在。
- 所有书内文字只有 `fontSize`，且使用 `cqw`。
- 左右页同类文字参数是两个独立对象。
- 调参字段路径与新配置一致。

### 浏览器

- 1440×900 下书本宽度约为视口的配置比例。
- 调整窗口高度但保持宽度时，书本尺寸不变。
- 窗口宽度低于最小书宽时，书本不再缩小。
- 窄窗口出现横向滚动，矮窗口允许纵向滚动。
- 书本始终双开。
- 中缝计算宽度为 `1px`。
- 中缝两侧存在渐变阴影。
- 左右页存在镜像 `rotateY`。
- 深色书内脊层级低于纸页。
- 书内脊顶部和底部存在弧形端面。
- 上下纸张边缘对齐。

## 非目标

- 不实现真实物理模拟。
- 不实现翻页动画。
- 不改变文章、Webhook 或 GitHub 发布链路。
- 不修改生活目录、技术目录和文章页的整体视觉语言，目录页码配置迁移除外。
