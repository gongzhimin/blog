# 首页参数修改指南

日常调整首页时，只需要编辑：

```text
src/data/homepage-config.json
```

## 编辑器说明

配置文件第一行通过 `$schema` 关联了 `homepage-config.schema.json`。

在 VS Code 中：

- 把鼠标停在字段名上，可以看到中文说明。
- 输入字段名时会自动补全。
- 单位、颜色或字段类型错误会显示提示。

## 参数分组

- `content`：导航标题、站点名、导航入口、版权、书页页眉、链接和页码。
- `desktop.regions`：桌面导航、书本区、页脚高度和站点宽度。
- `desktop.book`：书本宽度、比例、封面、纸页间距和目录位置。
- `mobile.layout`：手机端纸页尺寸和间距。
- `textStyles`：每一种文字角色独立使用的字体、桌面字号、移动字号和明暗模式颜色。
- `materials`：纸张、封面、装订布、中缝和文字颜色。

## 独立文字角色

首页不会在不同位置之间共享文字样式字段。即使两个位置当前取值相同，也分别保留配置：

- `navigationBrand`：导航品牌。
- `navigationTitle`：导航中间标题。
- `navigationLinks`：生活、技术、关于、RSS。
- `runningOuter`：书页外缘页眉。
- `runningInner`：书页内缘 `CONTENTS`。
- `partLink`：可点击的 Part 链接。
- `catalogTitle`：文章目录标题。
- `catalogDate`：文章日期。
- `archiveLink`：`View all ...` 入口。
- `folio`：首页和子目录罗马数字页码。
- `quoteEnglish`：每日一句英文。
- `quoteTranslation`：每日一句译文。
- `quoteAuthor`：作者。
- `copyright`：版权。

每个角色的结构如下：

```json
"navigationTitle": {
  "fontFamily": "sans",
  "desktopSize": "0.4rem",
  "mobileSize": "0.62rem",
  "lightColor": "#504b46",
  "darkColor": "#beb8ae"
}
```

`fontFamily` 可使用 `serif`、`sans`、`monospace`。

## 常用单位

- `rem`：字体和普通间距，推荐优先使用。
- `%`：相对于父容器的比例，例如书本宽度。
- `svh`：相对于屏幕高度，例如首页四个区域。
- `px`：只用于 1px 中缝、圆角等物理细节。
- `em`：相对于当前字号的目录行距。

配置中的数值必须带单位，例如：

```json
"width": "68%",
"navigationHeight": "6svh",
"desktopSize": "0.2rem"
```

## 修改后验证

```bash
npm run check
npm run test:homepage
```

构建时也会自动校验配置。错误信息会包含完整字段路径，例如：

```text
homepage config: desktop.book.width must be a CSS length, received "68"
```
