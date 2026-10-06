---
id: 'homepage-config-reference'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'packages/site'
owner: 'Site 维护者'
parent: 'packages/site/README.md'
related:
  [
    'packages/site/src/api/homepage-config.mjs',
    'packages/site/src/data/homepage-config.json',
  ]
---

# 经典视图组件配置参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

供 Site 页面与传统首页组件维护者查询 Homepage 配置。 当前值来自 packages/site/src/data/homepage-config.json，不是所有主题/组件的默认回退。参考表展示可提取约束，不替代完整校验、API 或设计。

## 接口清单

定义来源为 packages/site/src/api/homepage-config.mjs。字段以点号路径展开；必填相对于直接父对象，父对象可选时不意味着其所有子字段无条件必填。只从权威定义和当前配置生成，不手动编辑本文件。

## 输入与配置

<!-- prettier-ignore -->
| 字段 | 类型 | 必填（相对父对象） | 当前值 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `$schema` | string | 否 | "./homepage-config.schema.json" |  |  |
| `navigation` | object | 是 | 见配置 |  | 导航组件：文案、尺寸、间距、各链接文字和主题按钮。 |
| `navigation.content` | object | 是 | 见配置 |  | 导航中的站点名称和居中标题。 |
| `navigation.content.siteName` | string | 是 | "ZHIMIN" |  | text；组件内容或行为参数 |
| `navigation.content.title` | string | 是 | "写技术，也记录技术之外的生活。" |  | text；组件内容或行为参数 |
| `navigation.size` | object | 是 | 见配置 |  | 导航组件自身的最小、流式和最大高度。 |
| `navigation.size.minimumHeight` | string | 是 | "3.5rem" |  | length；CSS 变量 --home-navigation-size-minimum-height |
| `navigation.size.fluidHeight` | string | 是 | "6svh" |  | length；CSS 变量 --home-navigation-size-fluid-height |
| `navigation.size.maximumHeight` | string | 是 | "4rem" |  | length；CSS 变量 --home-navigation-size-maximum-height |
| `navigation.spacing` | object | 是 | 见配置 |  | 导航左右留白以及品牌、标题、链接之间的间距。 |
| `navigation.spacing.inlineGapFixed` | string | 是 | "4rem" |  | length；CSS 变量 --home-navigation-spacing-inline-gap-fixed |
| `navigation.spacing.inlineGapProportional` | string | 是 | "5vw" |  | length；CSS 变量 --home-navigation-spacing-inline-gap-proportional |
| `navigation.spacing.sectionGap` | string | 是 | "2rem" |  | length；CSS 变量 --home-navigation-spacing-section-gap |
| `navigation.spacing.linkGap` | string | 是 | "1.4rem" |  | length；CSS 变量 --home-navigation-spacing-link-gap |
| `navigation.brand` | object | 是 | 见配置 |  | 站点品牌文字。 |
| `navigation.brand.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-navigation-brand-font-family |
| `navigation.brand.minimumSize` | string | 是 | "0.4rem" |  | length；CSS 变量 --home-navigation-brand-minimum-size |
| `navigation.brand.fluidSize` | string | 是 | "12cqh" |  | length；CSS 变量 --home-navigation-brand-fluid-size |
| `navigation.brand.maximumSize` | string | 是 | "0.72rem" |  | length；CSS 变量 --home-navigation-brand-maximum-size |
| `navigation.brand.lightColor` | string | 是 | "#2a2a2a" |  | color；CSS 变量 --home-navigation-brand-light-color |
| `navigation.brand.darkColor` | string | 是 | "#ebe7df" |  | color；CSS 变量 --home-navigation-brand-dark-color |
| `navigation.title` | object | 是 | 见配置 |  | 导航中央标题及其隐藏阈值。 |
| `navigation.title.maximumWidth` | string | 是 | "38rem" |  | length；CSS 变量 --home-navigation-title-maximum-width |
| `navigation.title.hideThreshold` | string | 是 | "48rem" |  | length；组件内容或行为参数 |
| `navigation.title.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-navigation-title-font-family |
| `navigation.title.minimumSize` | string | 是 | "0.4rem" |  | length；CSS 变量 --home-navigation-title-minimum-size |
| `navigation.title.fluidSize` | string | 是 | "12cqh" |  | length；CSS 变量 --home-navigation-title-fluid-size |
| `navigation.title.maximumSize` | string | 是 | "0.72rem" |  | length；CSS 变量 --home-navigation-title-maximum-size |
| `navigation.title.lightColor` | string | 是 | "#504b46" |  | color；CSS 变量 --home-navigation-title-light-color |
| `navigation.title.darkColor` | string | 是 | "#beb8ae" |  | color；CSS 变量 --home-navigation-title-dark-color |
| `navigation.links` | object | 是 | 见配置 |  | 生活、技术、关于和 RSS 四个独立导航链接。 |
| `navigation.links.life` | object | 是 | 见配置 |  |  |
| `navigation.links.life.label` | string | 是 | "生活" |  | text；组件内容或行为参数 |
| `navigation.links.life.href` | string | 是 | "/life" |  | text；组件内容或行为参数 |
| `navigation.links.life.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-navigation-links-life-font-family |
| `navigation.links.life.minimumSize` | string | 是 | "0.4rem" |  | length；CSS 变量 --home-navigation-links-life-minimum-size |
| `navigation.links.life.fluidSize` | string | 是 | "12cqh" |  | length；CSS 变量 --home-navigation-links-life-fluid-size |
| `navigation.links.life.maximumSize` | string | 是 | "0.7rem" |  | length；CSS 变量 --home-navigation-links-life-maximum-size |
| `navigation.links.life.lightColor` | string | 是 | "#2a2a2a" |  | color；CSS 变量 --home-navigation-links-life-light-color |
| `navigation.links.life.darkColor` | string | 是 | "#ebe7df" |  | color；CSS 变量 --home-navigation-links-life-dark-color |
| `navigation.links.technical` | object | 是 | 见配置 |  |  |
| `navigation.links.technical.label` | string | 是 | "技术" |  | text；组件内容或行为参数 |
| `navigation.links.technical.href` | string | 是 | "/blog" |  | text；组件内容或行为参数 |
| `navigation.links.technical.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-navigation-links-technical-font-family |
| `navigation.links.technical.minimumSize` | string | 是 | "0.4rem" |  | length；CSS 变量 --home-navigation-links-technical-minimum-size |
| `navigation.links.technical.fluidSize` | string | 是 | "12cqh" |  | length；CSS 变量 --home-navigation-links-technical-fluid-size |
| `navigation.links.technical.maximumSize` | string | 是 | "0.7rem" |  | length；CSS 变量 --home-navigation-links-technical-maximum-size |
| `navigation.links.technical.lightColor` | string | 是 | "#2a2a2a" |  | color；CSS 变量 --home-navigation-links-technical-light-color |
| `navigation.links.technical.darkColor` | string | 是 | "#ebe7df" |  | color；CSS 变量 --home-navigation-links-technical-dark-color |
| `navigation.links.about` | object | 是 | 见配置 |  |  |
| `navigation.links.about.label` | string | 是 | "关于" |  | text；组件内容或行为参数 |
| `navigation.links.about.href` | string | 是 | "/about" |  | text；组件内容或行为参数 |
| `navigation.links.about.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-navigation-links-about-font-family |
| `navigation.links.about.minimumSize` | string | 是 | "0.4rem" |  | length；CSS 变量 --home-navigation-links-about-minimum-size |
| `navigation.links.about.fluidSize` | string | 是 | "12cqh" |  | length；CSS 变量 --home-navigation-links-about-fluid-size |
| `navigation.links.about.maximumSize` | string | 是 | "0.7rem" |  | length；CSS 变量 --home-navigation-links-about-maximum-size |
| `navigation.links.about.lightColor` | string | 是 | "#2a2a2a" |  | color；CSS 变量 --home-navigation-links-about-light-color |
| `navigation.links.about.darkColor` | string | 是 | "#ebe7df" |  | color；CSS 变量 --home-navigation-links-about-dark-color |
| `navigation.links.rss` | object | 是 | 见配置 |  |  |
| `navigation.links.rss.label` | string | 是 | "RSS" |  | text；组件内容或行为参数 |
| `navigation.links.rss.href` | string | 是 | "/rss.xml" |  | text；组件内容或行为参数 |
| `navigation.links.rss.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-navigation-links-rss-font-family |
| `navigation.links.rss.minimumSize` | string | 是 | "0.4rem" |  | length；CSS 变量 --home-navigation-links-rss-minimum-size |
| `navigation.links.rss.fluidSize` | string | 是 | "12cqh" |  | length；CSS 变量 --home-navigation-links-rss-fluid-size |
| `navigation.links.rss.maximumSize` | string | 是 | "0.7rem" |  | length；CSS 变量 --home-navigation-links-rss-maximum-size |
| `navigation.links.rss.lightColor` | string | 是 | "#2a2a2a" |  | color；CSS 变量 --home-navigation-links-rss-light-color |
| `navigation.links.rss.darkColor` | string | 是 | "#ebe7df" |  | color；CSS 变量 --home-navigation-links-rss-dark-color |
| `navigation.themeToggle` | object | 是 | 见配置 |  | 明暗主题按钮尺寸。 |
| `navigation.themeToggle.size` | string | 是 | "2.25rem" |  | length；CSS 变量 --home-navigation-theme-toggle-size |
| `navigation.themeToggle.iconSize` | string | 是 | "1rem" |  | length；CSS 变量 --home-navigation-theme-toggle-icon-size |
| `book` | object | 是 | 见配置 |  | 首页双开书组件及全部物理、材质和页内排版参数。 |
| `book.size` | object | 是 | 见配置 |  | 书本按窗口宽度比例取值，并使用硬最小宽度和固定宽高比。 |
| `book.size.viewportWidth` | string | 是 | "72vw" |  | length；CSS 变量 --home-book-size-viewport-width |
| `book.size.minimumWidth` | string | 是 | "36rem" |  | length；CSS 变量 --home-book-size-minimum-width |
| `book.size.aspectRatio` | string | 是 | "1.8 / 1" |  | ratio；CSS 变量 --home-book-size-aspect-ratio |
| `book.stage` | object | 是 | 见配置 |  | 书本舞台的左右留白和上下内边距。 |
| `book.stage.inlineGapFixed` | string | 是 | "4rem" |  | length；CSS 变量 --home-book-stage-inline-gap-fixed |
| `book.stage.inlineGapProportional` | string | 是 | "5vw" |  | length；CSS 变量 --home-book-stage-inline-gap-proportional |
| `book.stage.paddingTop` | string | 是 | "3rem" |  | length；CSS 变量 --home-book-stage-padding-top |
| `book.stage.paddingBottom` | string | 是 | "4rem" |  | length；CSS 变量 --home-book-stage-padding-bottom |
| `book.perspective` | object | 是 | 见配置 |  | 书本整体 3D 透视。 |
| `book.perspective.distance` | string | 是 | "112.5rem" |  | length；CSS 变量 --home-book-perspective-distance |
| `book.perspective.rotateX` | string | 是 | "0.2deg" |  | angle；CSS 变量 --home-book-perspective-rotate-x |
| `book.shadow` | object | 是 | 见配置 |  | 整本书投影。 |
| `book.shadow.offsetY` | string | 是 | "0.85rem" |  | length；CSS 变量 --home-book-shadow-offset-y |
| `book.shadow.blur` | string | 是 | "0.72rem" |  | length；CSS 变量 --home-book-shadow-blur |
| `book.shadow.color` | string | 是 | "rgba(42, 37, 31, 0.2)" |  | color；CSS 变量 --home-book-shadow-color |
| `book.cover` | object | 是 | 见配置 |  | 硬壳封面的外扩、圆角和颜色。 |
| `book.cover.insetTop` | string | 是 | "-3.4%" |  | length；CSS 变量 --home-book-cover-inset-top |
| `book.cover.insetInline` | string | 是 | "-2.2%" |  | length；CSS 变量 --home-book-cover-inset-inline |
| `book.cover.insetBottom` | string | 是 | "-4%" |  | length；CSS 变量 --home-book-cover-inset-bottom |
| `book.cover.radius` | string | 是 | "4px" |  | length；CSS 变量 --home-book-cover-radius |
| `book.cover.color` | string | 是 | "#f0f0f0" |  | color；CSS 变量 --home-book-cover-color |
| `book.pageEdges` | object | 是 | 见配置 |  | 左右书口厚度和纸张边缘颜色。 |
| `book.pageEdges.width` | string | 是 | "2%" |  | length；CSS 变量 --home-book-page-edges-width |
| `book.pageEdges.color` | string | 是 | "#efeeeb" |  | color；CSS 变量 --home-book-page-edges-color |
| `book.innerSpine` | object | 是 | 见配置 |  | 纸页下方的深色书内脊、1px 中缝、阴影和上下弧形端面。 |
| `book.innerSpine.width` | string | 是 | "5.2%" |  | length；CSS 变量 --home-book-inner-spine-width |
| `book.innerSpine.color` | string | 是 | "#737373" |  | color；CSS 变量 --home-book-inner-spine-color |
| `book.innerSpine.centerColor` | string | 是 | "#33342f" |  | color；CSS 变量 --home-book-inner-spine-center-color |
| `book.innerSpine.seamWidth` | string | 是 | "1px" |  | length；CSS 变量 --home-book-inner-spine-seam-width |
| `book.innerSpine.seamColor` | string | 是 | "rgba(45, 42, 38, 0.72)" |  | color；CSS 变量 --home-book-inner-spine-seam-color |
| `book.innerSpine.seamShadowBlur` | string | 是 | "1rem" |  | length；CSS 变量 --home-book-inner-spine-seam-shadow-blur |
| `book.innerSpine.seamShadowColor` | string | 是 | "rgba(30, 27, 24, 0.2)" |  | color；CSS 变量 --home-book-inner-spine-seam-shadow-color |
| `book.innerSpine.capWidth` | string | 是 | "7.8%" |  | length；CSS 变量 --home-book-inner-spine-cap-width |
| `book.innerSpine.capHeight` | string | 是 | "6%" |  | length；CSS 变量 --home-book-inner-spine-cap-height |
| `book.innerSpine.capRadius` | string | 是 | "50%" |  | length；CSS 变量 --home-book-inner-spine-cap-radius |
| `book.paper` | object | 是 | 见配置 |  | 纸张颜色、正文颜色和纹理透明度。 |
| `book.paper.color` | string | 是 | "#ffffff" |  | color；CSS 变量 --home-book-paper-color |
| `book.paper.textColor` | string | 是 | "#282522" |  | color；CSS 变量 --home-book-paper-text-color |
| `book.paper.mutedColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-paper-muted-color |
| `book.paper.accentColor` | string | 是 | "#755a43" |  | color；CSS 变量 --home-book-paper-accent-color |
| `book.paper.textureOpacity` | number | 是 | 0.1 | >= 0; <= 1 | opacity；CSS 变量 --home-book-paper-texture-opacity |
| `book.pages` | object | 是 | 见配置 |  | 纸页共享弯曲参数，以及生活页和技术页的独立内容与排版。 |
| `book.pages.shared` | object | 是 | 见配置 |  | 左右页镜像使用的弯曲角度和中缝渐变阴影。 |
| `book.pages.shared.rotationY` | string | 是 | "2deg" |  | angle；CSS 变量 --home-book-pages-shared-rotation-y |
| `book.pages.shared.innerShadowWidth` | string | 是 | "8%" |  | length；CSS 变量 --home-book-pages-shared-inner-shadow-width |
| `book.pages.shared.innerShadowColor` | string | 是 | "rgba(30, 27, 23, 0.24)" |  | color；CSS 变量 --home-book-pages-shared-inner-shadow-color |
| `book.pages.life` | object | 是 | 见配置 |  | 生活书页的文案、间距、目录和各文字角色。 |
| `book.pages.life.content` | object | 是 | 见配置 |  |  |
| `book.pages.life.content.outerRunningLabel` | string | 是 | "ESSAYS" |  | text；组件内容或行为参数 |
| `book.pages.life.content.innerRunningLabel` | string | 是 | "CONTENTS" |  | text；组件内容或行为参数 |
| `book.pages.life.content.partLabel` | string | 是 | "Part I · Life" |  | text；组件内容或行为参数 |
| `book.pages.life.content.partHref` | string | 是 | "/life" |  | text；组件内容或行为参数 |
| `book.pages.life.content.archiveLabel` | string | 是 | "View all essays" |  | text；组件内容或行为参数 |
| `book.pages.life.content.archiveHref` | string | 是 | "/life" |  | text；组件内容或行为参数 |
| `book.pages.life.content.homepageFolio` | string | 是 | "i" |  | text；组件内容或行为参数 |
| `book.pages.life.layout` | object | 是 | 见配置 |  |  |
| `book.pages.life.layout.paddingTop` | string | 是 | "6.5%" |  | length；CSS 变量 --home-book-pages-life-layout-padding-top |
| `book.pages.life.layout.paddingInline` | string | 是 | "7.5%" |  | length；CSS 变量 --home-book-pages-life-layout-padding-inline |
| `book.pages.life.layout.paddingBottom` | string | 是 | "6%" |  | length；CSS 变量 --home-book-pages-life-layout-padding-bottom |
| `book.pages.life.layout.partMarginTop` | string | 是 | "9%" |  | length；CSS 变量 --home-book-pages-life-layout-part-margin-top |
| `book.pages.life.layout.partMarginBottom` | string | 是 | "7%" |  | length；CSS 变量 --home-book-pages-life-layout-part-margin-bottom |
| `book.pages.life.layout.partPaddingTop` | string | 是 | "3.6%" |  | length；CSS 变量 --home-book-pages-life-layout-part-padding-top |
| `book.pages.life.layout.catalogGap` | string | 是 | "0.7em" |  | length；CSS 变量 --home-book-pages-life-layout-catalog-gap |
| `book.pages.life.layout.catalogColumnGap` | string | 是 | "0.46em" |  | length；CSS 变量 --home-book-pages-life-layout-catalog-column-gap |
| `book.pages.life.layout.archiveBottom` | string | 是 | "10%" |  | length；CSS 变量 --home-book-pages-life-layout-archive-bottom |
| `book.pages.life.layout.folioBottom` | string | 是 | "3.25%" |  | length；CSS 变量 --home-book-pages-life-layout-folio-bottom |
| `book.pages.life.catalog` | object | 是 | 见配置 |  |  |
| `book.pages.life.catalog.wideMaximumEntries` | integer | 是 | 6 | >= 1 | positiveInteger；组件内容或行为参数 |
| `book.pages.life.catalog.narrowMaximumEntries` | integer | 是 | 3 | >= 1 | positiveInteger；组件内容或行为参数 |
| `book.pages.life.catalog.narrowBookWidth` | string | 是 | "42rem" |  | length；组件内容或行为参数 |
| `book.pages.life.catalog.extremeBookWidth` | string | 是 | "28rem" |  | length；组件内容或行为参数 |
| `book.pages.life.catalog.titleMaximumLines` | integer | 是 | 2 | >= 1 | positiveInteger；CSS 变量 --home-book-pages-life-catalog-title-maximum-lines |
| `book.pages.life.catalog.wideDateFormat` | string | 是 | "YYYY.MM.DD" |  | dateFormat；组件内容或行为参数 |
| `book.pages.life.catalog.compactDateFormat` | string | 是 | "MM.DD" |  | dateFormat；组件内容或行为参数 |
| `book.pages.life.catalog.narrowRowGap` | string | 是 | "0.18em" |  | length；CSS 变量 --home-book-pages-life-catalog-narrow-row-gap |
| `book.pages.life.runningOuter` | object | 是 | 见配置 |  |  |
| `book.pages.life.runningOuter.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-life-running-outer-font-family |
| `book.pages.life.runningOuter.fontSize` | string | 是 | "0.35cqw" |  | bookFontSize；CSS 变量 --home-book-pages-life-running-outer-font-size |
| `book.pages.life.runningOuter.lightColor` | string | 是 | "#32302d" |  | color；CSS 变量 --home-book-pages-life-running-outer-light-color |
| `book.pages.life.runningOuter.darkColor` | string | 是 | "#32302d" |  | color；CSS 变量 --home-book-pages-life-running-outer-dark-color |
| `book.pages.life.runningInner` | object | 是 | 见配置 |  |  |
| `book.pages.life.runningInner.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-life-running-inner-font-family |
| `book.pages.life.runningInner.fontSize` | string | 是 | "0.35cqw" |  | bookFontSize；CSS 变量 --home-book-pages-life-running-inner-font-size |
| `book.pages.life.runningInner.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-life-running-inner-light-color |
| `book.pages.life.runningInner.darkColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-life-running-inner-dark-color |
| `book.pages.life.partLink` | object | 是 | 见配置 |  |  |
| `book.pages.life.partLink.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-life-part-link-font-family |
| `book.pages.life.partLink.fontSize` | string | 是 | "0.4cqw" |  | bookFontSize；CSS 变量 --home-book-pages-life-part-link-font-size |
| `book.pages.life.partLink.lightColor` | string | 是 | "#755a43" |  | color；CSS 变量 --home-book-pages-life-part-link-light-color |
| `book.pages.life.partLink.darkColor` | string | 是 | "#755a43" |  | color；CSS 变量 --home-book-pages-life-part-link-dark-color |
| `book.pages.life.catalogTitle` | object | 是 | 见配置 |  |  |
| `book.pages.life.catalogTitle.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-book-pages-life-catalog-title-font-family |
| `book.pages.life.catalogTitle.fontSize` | string | 是 | "0.55cqw" |  | bookFontSize；CSS 变量 --home-book-pages-life-catalog-title-font-size |
| `book.pages.life.catalogTitle.lightColor` | string | 是 | "#282522" |  | color；CSS 变量 --home-book-pages-life-catalog-title-light-color |
| `book.pages.life.catalogTitle.darkColor` | string | 是 | "#282522" |  | color；CSS 变量 --home-book-pages-life-catalog-title-dark-color |
| `book.pages.life.catalogDate` | object | 是 | 见配置 |  |  |
| `book.pages.life.catalogDate.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-life-catalog-date-font-family |
| `book.pages.life.catalogDate.fontSize` | string | 是 | "0.42cqw" |  | bookFontSize；CSS 变量 --home-book-pages-life-catalog-date-font-size |
| `book.pages.life.catalogDate.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-life-catalog-date-light-color |
| `book.pages.life.catalogDate.darkColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-life-catalog-date-dark-color |
| `book.pages.life.archiveLink` | object | 是 | 见配置 |  |  |
| `book.pages.life.archiveLink.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-life-archive-link-font-family |
| `book.pages.life.archiveLink.fontSize` | string | 是 | "0.4cqw" |  | bookFontSize；CSS 变量 --home-book-pages-life-archive-link-font-size |
| `book.pages.life.archiveLink.lightColor` | string | 是 | "#716b64" |  | color；CSS 变量 --home-book-pages-life-archive-link-light-color |
| `book.pages.life.archiveLink.darkColor` | string | 是 | "#716b64" |  | color；CSS 变量 --home-book-pages-life-archive-link-dark-color |
| `book.pages.life.folio` | object | 是 | 见配置 |  |  |
| `book.pages.life.folio.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-book-pages-life-folio-font-family |
| `book.pages.life.folio.fontSize` | string | 是 | "0.42cqw" |  | bookFontSize；CSS 变量 --home-book-pages-life-folio-font-size |
| `book.pages.life.folio.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-life-folio-light-color |
| `book.pages.life.folio.darkColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-life-folio-dark-color |
| `book.pages.technical` | object | 是 | 见配置 |  | 技术书页的文案、间距、目录和各文字角色。 |
| `book.pages.technical.content` | object | 是 | 见配置 |  |  |
| `book.pages.technical.content.outerRunningLabel` | string | 是 | "TECHNICAL NOTES" |  | text；组件内容或行为参数 |
| `book.pages.technical.content.innerRunningLabel` | string | 是 | "CONTENTS" |  | text；组件内容或行为参数 |
| `book.pages.technical.content.partLabel` | string | 是 | "Part II · Technology" |  | text；组件内容或行为参数 |
| `book.pages.technical.content.partHref` | string | 是 | "/blog" |  | text；组件内容或行为参数 |
| `book.pages.technical.content.archiveLabel` | string | 是 | "View all technical notes" |  | text；组件内容或行为参数 |
| `book.pages.technical.content.archiveHref` | string | 是 | "/blog" |  | text；组件内容或行为参数 |
| `book.pages.technical.content.homepageFolio` | string | 是 | "ii" |  | text；组件内容或行为参数 |
| `book.pages.technical.layout` | object | 是 | 见配置 |  |  |
| `book.pages.technical.layout.paddingTop` | string | 是 | "6.5%" |  | length；CSS 变量 --home-book-pages-technical-layout-padding-top |
| `book.pages.technical.layout.paddingInline` | string | 是 | "7.5%" |  | length；CSS 变量 --home-book-pages-technical-layout-padding-inline |
| `book.pages.technical.layout.paddingBottom` | string | 是 | "6%" |  | length；CSS 变量 --home-book-pages-technical-layout-padding-bottom |
| `book.pages.technical.layout.partMarginTop` | string | 是 | "9%" |  | length；CSS 变量 --home-book-pages-technical-layout-part-margin-top |
| `book.pages.technical.layout.partMarginBottom` | string | 是 | "7%" |  | length；CSS 变量 --home-book-pages-technical-layout-part-margin-bottom |
| `book.pages.technical.layout.partPaddingTop` | string | 是 | "3.6%" |  | length；CSS 变量 --home-book-pages-technical-layout-part-padding-top |
| `book.pages.technical.layout.catalogGap` | string | 是 | "0.7em" |  | length；CSS 变量 --home-book-pages-technical-layout-catalog-gap |
| `book.pages.technical.layout.catalogColumnGap` | string | 是 | "0.46em" |  | length；CSS 变量 --home-book-pages-technical-layout-catalog-column-gap |
| `book.pages.technical.layout.archiveBottom` | string | 是 | "10%" |  | length；CSS 变量 --home-book-pages-technical-layout-archive-bottom |
| `book.pages.technical.layout.folioBottom` | string | 是 | "3.25%" |  | length；CSS 变量 --home-book-pages-technical-layout-folio-bottom |
| `book.pages.technical.catalog` | object | 是 | 见配置 |  |  |
| `book.pages.technical.catalog.wideMaximumEntries` | integer | 是 | 6 | >= 1 | positiveInteger；组件内容或行为参数 |
| `book.pages.technical.catalog.narrowMaximumEntries` | integer | 是 | 3 | >= 1 | positiveInteger；组件内容或行为参数 |
| `book.pages.technical.catalog.narrowBookWidth` | string | 是 | "42rem" |  | length；组件内容或行为参数 |
| `book.pages.technical.catalog.extremeBookWidth` | string | 是 | "28rem" |  | length；组件内容或行为参数 |
| `book.pages.technical.catalog.titleMaximumLines` | integer | 是 | 2 | >= 1 | positiveInteger；CSS 变量 --home-book-pages-technical-catalog-title-maximum-lines |
| `book.pages.technical.catalog.wideDateFormat` | string | 是 | "YYYY.MM.DD" |  | dateFormat；组件内容或行为参数 |
| `book.pages.technical.catalog.compactDateFormat` | string | 是 | "MM.DD" |  | dateFormat；组件内容或行为参数 |
| `book.pages.technical.catalog.narrowRowGap` | string | 是 | "0.18em" |  | length；CSS 变量 --home-book-pages-technical-catalog-narrow-row-gap |
| `book.pages.technical.runningOuter` | object | 是 | 见配置 |  |  |
| `book.pages.technical.runningOuter.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-technical-running-outer-font-family |
| `book.pages.technical.runningOuter.fontSize` | string | 是 | "0.35cqw" |  | bookFontSize；CSS 变量 --home-book-pages-technical-running-outer-font-size |
| `book.pages.technical.runningOuter.lightColor` | string | 是 | "#32302d" |  | color；CSS 变量 --home-book-pages-technical-running-outer-light-color |
| `book.pages.technical.runningOuter.darkColor` | string | 是 | "#32302d" |  | color；CSS 变量 --home-book-pages-technical-running-outer-dark-color |
| `book.pages.technical.runningInner` | object | 是 | 见配置 |  |  |
| `book.pages.technical.runningInner.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-technical-running-inner-font-family |
| `book.pages.technical.runningInner.fontSize` | string | 是 | "0.35cqw" |  | bookFontSize；CSS 变量 --home-book-pages-technical-running-inner-font-size |
| `book.pages.technical.runningInner.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-technical-running-inner-light-color |
| `book.pages.technical.runningInner.darkColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-technical-running-inner-dark-color |
| `book.pages.technical.partLink` | object | 是 | 见配置 |  |  |
| `book.pages.technical.partLink.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-technical-part-link-font-family |
| `book.pages.technical.partLink.fontSize` | string | 是 | "0.4cqw" |  | bookFontSize；CSS 变量 --home-book-pages-technical-part-link-font-size |
| `book.pages.technical.partLink.lightColor` | string | 是 | "#755a43" |  | color；CSS 变量 --home-book-pages-technical-part-link-light-color |
| `book.pages.technical.partLink.darkColor` | string | 是 | "#755a43" |  | color；CSS 变量 --home-book-pages-technical-part-link-dark-color |
| `book.pages.technical.catalogTitle` | object | 是 | 见配置 |  |  |
| `book.pages.technical.catalogTitle.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-book-pages-technical-catalog-title-font-family |
| `book.pages.technical.catalogTitle.fontSize` | string | 是 | "0.55cqw" |  | bookFontSize；CSS 变量 --home-book-pages-technical-catalog-title-font-size |
| `book.pages.technical.catalogTitle.lightColor` | string | 是 | "#282522" |  | color；CSS 变量 --home-book-pages-technical-catalog-title-light-color |
| `book.pages.technical.catalogTitle.darkColor` | string | 是 | "#282522" |  | color；CSS 变量 --home-book-pages-technical-catalog-title-dark-color |
| `book.pages.technical.catalogDate` | object | 是 | 见配置 |  |  |
| `book.pages.technical.catalogDate.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-technical-catalog-date-font-family |
| `book.pages.technical.catalogDate.fontSize` | string | 是 | "0.42cqw" |  | bookFontSize；CSS 变量 --home-book-pages-technical-catalog-date-font-size |
| `book.pages.technical.catalogDate.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-technical-catalog-date-light-color |
| `book.pages.technical.catalogDate.darkColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-technical-catalog-date-dark-color |
| `book.pages.technical.archiveLink` | object | 是 | 见配置 |  |  |
| `book.pages.technical.archiveLink.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-book-pages-technical-archive-link-font-family |
| `book.pages.technical.archiveLink.fontSize` | string | 是 | "0.4cqw" |  | bookFontSize；CSS 变量 --home-book-pages-technical-archive-link-font-size |
| `book.pages.technical.archiveLink.lightColor` | string | 是 | "#716b64" |  | color；CSS 变量 --home-book-pages-technical-archive-link-light-color |
| `book.pages.technical.archiveLink.darkColor` | string | 是 | "#716b64" |  | color；CSS 变量 --home-book-pages-technical-archive-link-dark-color |
| `book.pages.technical.folio` | object | 是 | 见配置 |  |  |
| `book.pages.technical.folio.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-book-pages-technical-folio-font-family |
| `book.pages.technical.folio.fontSize` | string | 是 | "0.42cqw" |  | bookFontSize；CSS 变量 --home-book-pages-technical-folio-font-size |
| `book.pages.technical.folio.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-technical-folio-light-color |
| `book.pages.technical.folio.darkColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-book-pages-technical-folio-dark-color |
| `footer` | object | 是 | 见配置 |  | 每日一句和版权页脚组件。 |
| `footer.content` | object | 是 | 见配置 |  |  |
| `footer.content.copyrightLabel` | string | 是 | "Zhimin 的博客书" |  | text；组件内容或行为参数 |
| `footer.size` | object | 是 | 见配置 |  |  |
| `footer.size.minimumHeight` | string | 是 | "8rem" |  | length；CSS 变量 --home-footer-size-minimum-height |
| `footer.spacing` | object | 是 | 见配置 |  |  |
| `footer.spacing.inlineGapFixed` | string | 是 | "4rem" |  | length；CSS 变量 --home-footer-spacing-inline-gap-fixed |
| `footer.spacing.inlineGapProportional` | string | 是 | "5vw" |  | length；CSS 变量 --home-footer-spacing-inline-gap-proportional |
| `footer.spacing.paddingTop` | string | 是 | "1.5rem" |  | length；CSS 变量 --home-footer-spacing-padding-top |
| `footer.spacing.paddingBottom` | string | 是 | "2rem" |  | length；CSS 变量 --home-footer-spacing-padding-bottom |
| `footer.spacing.englishTranslationGap` | string | 是 | "0.38em" |  | length；CSS 变量 --home-footer-spacing-english-translation-gap |
| `footer.spacing.translationMetaGap` | string | 是 | "0.38em" |  | length；CSS 变量 --home-footer-spacing-translation-meta-gap |
| `footer.spacing.authorCopyrightGap` | string | 是 | "0.55rem" |  | length；CSS 变量 --home-footer-spacing-author-copyright-gap |
| `footer.quoteEnglish` | object | 是 | 见配置 |  |  |
| `footer.quoteEnglish.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-footer-quote-english-font-family |
| `footer.quoteEnglish.minimumSize` | string | 是 | "0.55rem" |  | length；CSS 变量 --home-footer-quote-english-minimum-size |
| `footer.quoteEnglish.fluidSize` | string | 是 | "0.7cqw" |  | length；CSS 变量 --home-footer-quote-english-fluid-size |
| `footer.quoteEnglish.maximumSize` | string | 是 | "1rem" |  | length；CSS 变量 --home-footer-quote-english-maximum-size |
| `footer.quoteEnglish.lightColor` | string | 是 | "#2a2a2a" |  | color；CSS 变量 --home-footer-quote-english-light-color |
| `footer.quoteEnglish.darkColor` | string | 是 | "#ebe7df" |  | color；CSS 变量 --home-footer-quote-english-dark-color |
| `footer.quoteTranslation` | object | 是 | 见配置 |  |  |
| `footer.quoteTranslation.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-footer-quote-translation-font-family |
| `footer.quoteTranslation.minimumSize` | string | 是 | "0.48rem" |  | length；CSS 变量 --home-footer-quote-translation-minimum-size |
| `footer.quoteTranslation.fluidSize` | string | 是 | "0.58cqw" |  | length；CSS 变量 --home-footer-quote-translation-fluid-size |
| `footer.quoteTranslation.maximumSize` | string | 是 | "0.86rem" |  | length；CSS 变量 --home-footer-quote-translation-maximum-size |
| `footer.quoteTranslation.lightColor` | string | 是 | "#504b46" |  | color；CSS 变量 --home-footer-quote-translation-light-color |
| `footer.quoteTranslation.darkColor` | string | 是 | "#beb8ae" |  | color；CSS 变量 --home-footer-quote-translation-dark-color |
| `footer.quoteAuthor` | object | 是 | 见配置 |  |  |
| `footer.quoteAuthor.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-footer-quote-author-font-family |
| `footer.quoteAuthor.minimumSize` | string | 是 | "0.42rem" |  | length；CSS 变量 --home-footer-quote-author-minimum-size |
| `footer.quoteAuthor.fluidSize` | string | 是 | "0.5cqw" |  | length；CSS 变量 --home-footer-quote-author-fluid-size |
| `footer.quoteAuthor.maximumSize` | string | 是 | "0.76rem" |  | length；CSS 变量 --home-footer-quote-author-maximum-size |
| `footer.quoteAuthor.lightColor` | string | 是 | "#786753" |  | color；CSS 变量 --home-footer-quote-author-light-color |
| `footer.quoteAuthor.darkColor` | string | 是 | "#978f84" |  | color；CSS 变量 --home-footer-quote-author-dark-color |
| `footer.copyright` | object | 是 | 见配置 |  |  |
| `footer.copyright.fontFamily` | string | 是 | "sans" | serif, sans, monospace | font；CSS 变量 --home-footer-copyright-font-family |
| `footer.copyright.minimumSize` | string | 是 | "0.42rem" |  | length；CSS 变量 --home-footer-copyright-minimum-size |
| `footer.copyright.fluidSize` | string | 是 | "0.5cqw" |  | length；CSS 变量 --home-footer-copyright-fluid-size |
| `footer.copyright.maximumSize` | string | 是 | "0.76rem" |  | length；CSS 变量 --home-footer-copyright-maximum-size |
| `footer.copyright.lightColor` | string | 是 | "#786753" |  | color；CSS 变量 --home-footer-copyright-light-color |
| `footer.copyright.darkColor` | string | 是 | "#978f84" |  | color；CSS 变量 --home-footer-copyright-dark-color |
| `directories` | object | 是 | 见配置 |  | 生活目录页和技术目录页的独立页码组件。 |
| `directories.life` | object | 是 | 见配置 |  |  |
| `directories.life.folio` | object | 是 | 见配置 |  |  |
| `directories.life.folio.content` | string | 是 | "i" |  | text；组件内容或行为参数 |
| `directories.life.folio.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-directories-life-folio-font-family |
| `directories.life.folio.fontSize` | string | 是 | "0.85rem" |  | length；CSS 变量 --home-directories-life-folio-font-size |
| `directories.life.folio.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-directories-life-folio-light-color |
| `directories.life.folio.darkColor` | string | 是 | "#978f84" |  | color；CSS 变量 --home-directories-life-folio-dark-color |
| `directories.technical` | object | 是 | 见配置 |  |  |
| `directories.technical.folio` | object | 是 | 见配置 |  |  |
| `directories.technical.folio.content` | string | 是 | "i" |  | text；组件内容或行为参数 |
| `directories.technical.folio.fontFamily` | string | 是 | "serif" | serif, sans, monospace | font；CSS 变量 --home-directories-technical-folio-font-family |
| `directories.technical.folio.fontSize` | string | 是 | "0.85rem" |  | length；CSS 变量 --home-directories-technical-folio-font-size |
| `directories.technical.folio.lightColor` | string | 是 | "#858079" |  | color；CSS 变量 --home-directories-technical-folio-light-color |
| `directories.technical.folio.darkColor` | string | 是 | "#978f84" |  | color；CSS 变量 --home-directories-technical-folio-dark-color |

## 输出与副作用

validateHomepageConfig 读取 FIELDS 并检查字段及跨字段关系；CSS 组合函数输出变量和响应样式，不修改 DOM。验证返回原配置，不提供深不可变副本。

生成器读取配置、调用接口并启动 Prettier 子进程。普通模式写两份参考和首页 Schema；--check 只比较，--patch 输出补丁。生成无外部网络，不代表无文件/进程副作用。

## 错误与边界

长度、字体、颜色、透明度等采用接口声明的格式与范围，不是完整 CSS 解析。书页字体大小要求 cqw；比例、目录条目数量及宽窄关系由校验函数补充，不能只看编辑器 Schema。阈值有效仍需实际布局验证。

表不表达所有额外键、条件组合、运行行为或语义限制。修改几何、字体、图片及断点必须核对生产者与 Runtime 并追加浏览器证据。

## 兼容与示例

完整配置样例为 packages/site/src/data/homepage-config.json。修改定义、说明或配置后运行 npm run docs:generate，再检查差异与测试。字段更名/删除时同步消费者；跨已部署版本的过渡需显式设计，不自动添加兼容转发层。

## 验证与关联

运行 npm run check:docs 检查结构与漂移，运行 npm run verify 检查工程和行为。几何与布局变化追加 npm run test:e2e。生成日期只在内容变化时更新，--check 不刷新日期。

[模块 README](../../README.md) · [公共 API](api.md) · [测试方案](../testing/strategy.md) · [文档规范](../../../../docs/standards/documentation.md)
