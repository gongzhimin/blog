---
id: 'book-config-reference'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-08'
scope: 'packages/book-build'
owner: 'Book Build 维护者'
parent: 'packages/book-build/README.md'
related:
  [
    'packages/book-build/src/api/book-config.schema.json',
    'packages/site/src/data/book-config.json',
  ]
---

# 书籍配置参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

供书籍配置、主题和浏览器测量维护者查询 Book 配置。 当前值来自 packages/site/src/data/book-config.json，不是所有主题/组件的默认回退。参考表展示可提取约束，不替代完整校验、API 或设计。

## 接口清单

定义来源为 packages/book-build/src/api/book-config.schema.json。字段以点号路径展开；必填相对于直接父对象，父对象可选时不意味着其所有子字段无条件必填。只从权威定义和当前配置生成，不手动编辑本文件。

## 输入与配置

<!-- prettier-ignore -->
| 字段 | 类型 | 必填（相对父对象） | 当前值 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `theme` | object | 是 | 见配置 |  | 当前使用的书本主题。 |
| `theme.id` | string | 是 | "classic-paper" | classic-paper, plain-manuscript | 主题 ID。 |
| `nav` | object | 是 | 见配置 |  | 首页导航栏配置。 |
| `nav.height` | number | 否 | 68 | > 0 | 导航高度。 |
| `nav.brand` | object | 是 | 见配置 |  |  |
| `nav.brand.text` | string | 是 | "ZHIMIN" |  | 导航品牌。 |
| `nav.slogan` | string | 是 | "记录技术，也记录技术之外的生活" |  |  |
| `nav.links` | object | 是 | 见配置 |  |  |
| `nav.links.items` | array | 是 | 见配置 |  |  |
| `book` | object | 是 | 见配置 |  | 书本几何尺寸、Turn.js 参数、封面精灵图、纸张背景图集和分页配置。 |
| `book.canvasWidth` | number | 是 | 960 | > 0 | 桌面端书本外层画布宽度。 |
| `book.width` | number | 是 | 960 | > 0 | 桌面端书本宽度。 |
| `book.height` | number | 是 | 600 | > 0 | 桌面端书本高度。 |
| `book.mobileBreakpoint` | number | 是 | 800 | > 0 | 切换移动端单页模式的窗口宽度断点。 |
| `book.mobileCanvas` | object | 是 | 见配置 |  | 移动端书本外层画布尺寸与留白。 |
| `book.mobileCanvas.width` | number | 是 | 370 | > 0 | width，正数。 |
| `book.mobileCanvas.paddingY` | number | 是 | 16 | > 0 | paddingY，正数。 |
| `book.contentPage` | object | 是 | 见配置 |  | 桌面端正文页尺寸。 |
| `book.contentPage.width` | number | 是 | 460 | > 0 | width，正数。 |
| `book.contentPage.height` | number | 是 | 582 | > 0 | height，正数。 |
| `book.mobileContentPage` | object | 是 | 见配置 |  | 移动端单页正文页尺寸。 |
| `book.mobileContentPage.width` | number | 是 | 370 | > 0 | width，正数。 |
| `book.mobileContentPage.height` | number | 是 | 507 | > 0 | height，正数。 |
| `book.turn` | object | 是 | 见配置 |  | Turn.js 初始化参数。totalPages 是启动估算值，浏览器端分页完成后会按实际内容页数动态覆盖。 |
| `book.turn.totalPages` | number | 是 | 112 | > 0 | 启动时用于创建 Turn.js 的估算页数；运行时会由分页结果替换，不代表固定总页数。 |
| `book.turn.elevation` | number | 是 | 50 | > 0 | elevation，正数。 |
| `book.turn.duration` | number | 是 | 1000 | > 0 | duration，正数。 |
| `book.turn.startPage` | number | 是 | 7 | > 0 | startPage，正数。 |
| `book.coverSprite` | object | 是 | 见配置 |  | 封面精灵图路径、背景尺寸和各封面位置。 |
| `book.coverSprite.image` | string | 是 | "/vendor/turnjs/pics/book-covers.jpg" |  | 封面精灵图 URL。 |
| `book.coverSprite.backgroundSize` | string | 是 | "2400px 600px" |  | CSS background-size 值。 |
| `book.coverSprite.positions` | object | 是 | 见配置 |  | 封面、内封、封底对应的 background-position。 |
| `book.coverSprite.positions.front` | string | 是 | "0 0" |  | 封面位置 front |
| `book.coverSprite.positions.frontInside` | string | 是 | "-483px 0" |  | 封面位置 frontInside |
| `book.coverSprite.positions.titlePage` | string | 否 | "-1936px 0" |  | 扉页插画位置；省略时兼容使用 backInside。Site 当前配置显式指定，不能与封底内侧混用。 |
| `book.coverSprite.positions.backInside` | string | 是 | "-968px 0" |  | 封面位置 backInside |
| `book.coverSprite.positions.back` | string | 是 | "-968px 0" |  | 封面位置 back |
| `book.coverSprite.positions.backOuter` | string | 是 | "-1452px 0" |  | 封面位置 backOuter |
| `book.paperTexture` | object | 否 | 见配置 |  | 纸张背景图集配置。启用后，每个正文页会从同一张大背景图中确定性裁剪不同位置，避免所有页面纸纹完全重复。 |
| `book.paperTexture.enabled` | boolean | 是 | true |  | 是否启用纸张背景图集。 |
| `book.paperTexture.image` | string | 否 | "/paper-bg-3.jpg" |  | 纸张背景图 URL，通常放在 public 目录并以 / 开头引用。 |
| `book.paperTexture.size` | string | 否 | "736px 1097px" |  | CSS background-size 值，用于控制图集在书页上的裁剪尺度。 |
| `book.paperTexture.opacity` | number | 否 | 0.3 | >= 0; <= 1 | 纸纹叠加透明度。 |
| `book.paperTexture.blendMode` | string | 否 | "normal" |  | CSS mix-blend-mode 值，用于控制纸纹与原纸色的混合方式。 |
| `book.pagination` | object | 是 | 见配置 |  | 分页测量参数，决定浏览器端正文、目录和移动端分页尺寸。 |
| `book.pagination.contentWidth` | number | 是 | 380 | > 0 | contentWidth，正数。 |
| `book.pagination.contentHeight` | number | 是 | 471 | > 0 | contentHeight，正数。 |
| `book.pagination.tocWidth` | number | 是 | 380 | > 0 | tocWidth，正数。 |
| `book.pagination.tocHeight` | number | 是 | 400 | > 0 | tocHeight，正数。 |
| `footer` | object | 是 | 见配置 |  | 页脚与每日一句默认文案。 |
| `footer.content` | object | 是 | 见配置 |  |  |
| `footer.content.copyright` | string | 是 | "Zhimin 的博客书" |  |  |
| `backgrounds` | object | 是 | 见配置 |  | 页面背景材质。 |
| `backgrounds.light` | object | 是 | 见配置 |  |  |
| `backgrounds.light.fabric` | string | 是 | "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px), #e8e4de" |  |  |

## 输出与副作用

buildBook 以 Book Schema 校验配置并组装浏览器载荷；失败以带阶段和 code 的 diagnostics 返回。成功载荷中的初始页数是估值，浏览器分页后会重新计算。

生成器读取配置、调用接口并启动 Prettier 子进程。普通模式写两份参考和首页 Schema；--check 只比较，--patch 输出补丁。生成无外部网络，不代表无文件/进程副作用。

## 错误与边界

类型、必填、数值和组合规则以完整 Schema 为准；不能把所有 number 一概写成正整数，Schema 通过也不证明 CSS 与浏览器实际布局相同。theme.id 需对应已登记主题；构建 totalPages 是估值，不是最终页数。

表不表达所有额外键、条件组合、运行行为或语义限制。修改几何、字体、图片及断点必须核对生产者与 Runtime 并追加浏览器证据。

## 兼容与示例

完整配置样例为 packages/site/src/data/book-config.json。修改定义、说明或配置后运行 npm run docs:generate，再检查差异与测试。字段更名/删除时同步消费者；跨已部署版本的过渡需显式设计，不自动添加兼容转发层。

## 验证与关联

运行 npm run check:docs 检查结构与漂移，运行 npm run verify 检查工程和行为。几何与布局变化追加 npm run test:e2e。生成日期只在内容变化时更新，--check 不刷新日期。

[模块 README](../../README.md) · [公共 API](api.md) · [测试方案](../testing/strategy.md) · [文档规范](../../../../docs/standards/documentation.md)
