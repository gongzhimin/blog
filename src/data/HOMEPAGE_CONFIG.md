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
- `layout.navigation`：导航独立的高度、留白、间距和标题隐藏阈值。
- `layout.bookRegion`：书本与窗口边界的固定/比例间隔。
- `layout.book`：整本书的固定宽高比、参考尺寸和物理细节。
- `layout.lifePage`：生活页独立的页内间距与底部位置。
- `layout.technicalPage`：技术页独立的页内间距与底部位置。
- `layout.footer`：页脚独立的高度、留白和行间距。
- `catalogs.life`：生活目录独立的文章数量、阈值和日期格式。
- `catalogs.technical`：技术目录独立的文章数量、阈值和日期格式。
- `textStyles`：每一处文字独立使用的字体、最小/流式/最大字号和明暗颜色。
- `materials`：纸张、封面、装订布、中缝和基础材质颜色。

## 独立文字角色

首页不会在不同位置之间共享文字样式字段。即使当前取值相同，也分别保留：

- `textStyles.navigation`：品牌、标题、生活、技术、关于、RSS 六项。
- `textStyles.lifePage`：生活页七项。
- `textStyles.technicalPage`：技术页七项。
- `textStyles.footer`：英文、译文、作者、版权四项。
- `textStyles.lifeDirectory.folio`：生活目录页码。
- `textStyles.technicalDirectory.folio`：技术目录页码。

每个角色的结构如下：

```json
"catalogTitle": {
  "fontFamily": "sans",
  "minimumSize": "0.52rem",
  "fluidSize": "0.55cqw",
  "maximumSize": "1rem",
  "lightColor": "#504b46",
  "darkColor": "#beb8ae"
}
```

`fontFamily` 可使用 `serif`、`sans`、`monospace`。

## 常用单位

- `rem`：最小/最大字号和普通间距。
- `%`：相对于父容器的比例，例如书本宽度。
- `svh`：相对于屏幕高度，例如首页四个区域。
- `px`：只用于 1px 中缝、圆角等物理细节。
- `em`：相对于当前字号的目录行距。
- `cqw`：相对于书本或页脚容器宽度的流式字号。
- `cqh`：相对于导航容器高度的流式字号。

配置中的数值必须带单位，例如：

```json
"inlineGapFixed": "8rem",
"inlineGapProportional": "8vw",
"minimumSize": "0.52rem",
"fluidSize": "0.55cqw",
"maximumSize": "1rem"
```

## 书本尺寸

书本始终保持双开和固定宽高比。左右、上下间隔分别使用：

```text
min(固定值, 比例值)
```

书本宽度再从“可用宽度”和“可用高度 × 宽高比”中取较小者，因此宽屏矮屏也不会挤压页脚。

`referenceMinimumWidth` 与 `referenceMinimumHeight` 是校准参考值。窗口低于参考值后书本仍会继续缩小，但每处文字会停在自己的 `minimumSize`。

## 修改后验证

```bash
npm run check
npm run test:homepage
```

构建时也会自动校验配置。错误信息会包含完整字段路径，例如：

```text
homepage config: desktop.book.width must be a CSS length, received "68"
```
