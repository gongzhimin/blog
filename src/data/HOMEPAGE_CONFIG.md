# 首页配置说明

首页所有可调参数位于 `homepage-config.json`，按组件分组：

- `navigation`：导航文案、尺寸、间距、四个链接和主题按钮。
- `book`：书本尺寸、舞台、封面、书口、纸张、书内脊及左右页面。
- `footer`：每日一句排版和版权。
- `directories`：生活目录页与技术目录页的页码。

## 书本尺寸

```json
"size": {
  "viewportWidth": "72vw",
  "minimumWidth": "36rem",
  "aspectRatio": "1.8 / 1"
}
```

书本宽度为 `max(viewportWidth, minimumWidth)`。窗口过窄时书本不再缩小，页面会出现横向滚动；页面总高度超过窗口时使用纵向滚动。

## 书内字号

书内每种文字只有一个 `fontSize`，必须使用 `cqw`：

```json
"catalogTitle": {
  "fontFamily": "serif",
  "fontSize": "0.55cqw",
  "lightColor": "#282522",
  "darkColor": "#282522"
}
```

`1cqw` 等于整本书宽度的 1%。书内字号没有固定值、最小值或最大值。

生活页和技术页的同类参数分别位于：

- `book.pages.life`
- `book.pages.technical`

即使初始值相同，也应分别修改。

## 中缝与书内脊

```json
"innerSpine": {
  "width": "5.2%",
  "seamWidth": "1px",
  "seamShadowBlur": "1rem",
  "capWidth": "7.8%",
  "capHeight": "6%"
}
```

- `seamWidth`：纸面中央的细线。
- `seamShadowBlur`：中缝两侧纵深阴影。
- `width`：纸页下方深色装订区域宽度。
- `capWidth` / `capHeight`：书内脊在书本上下端露出的弧形端面。

深色书内脊位于纸页下方，不应覆盖纸面。

## 纸页弯曲

```json
"pages": {
  "shared": {
    "rotationY": "2deg",
    "innerShadowWidth": "8%",
    "innerShadowColor": "rgba(30, 27, 23, 0.24)"
  }
}
```

左右页使用镜像角度和镜像渐变阴影。上下纸张边缘保持对齐。

## 调参页面

本地开发时访问 `/tune`。参数面板读取配置模块导出的 `FIELDS`，按组件树展示，并可复制完整 JSON。

修改 JSON 后运行：

```bash
npm run check
npm test
npm run test:e2e
```
