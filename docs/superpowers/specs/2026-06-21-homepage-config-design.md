# 首页配置与结构分离设计

日期：2026-06-21

## 目标

将首页中可调整的文字、尺寸、比例、字号、间距和颜色集中到一个 JSON 配置文件。以后调整首页时，只修改配置，不需要编辑 Astro 组件或 `home.css`。

## 文件边界

- `src/data/homepage-config.json`
  - 用户唯一需要日常编辑的首页配置。
  - 包含内容文案、桌面参数、移动端参数和材质颜色。
- `src/data/homepage-config.schema.json`
  - JSON Schema。
  - 为每个参数提供中文说明、类型、单位、建议范围和编辑器自动补全。
- `src/lib/homepage-config.mjs`
  - 读取并校验配置。
  - 将配置转换为 CSS 自定义属性。
- `src/pages/index.astro`
  - 读取配置并传递内容。
  - 在首页根节点注入生成后的 CSS 变量。
- `src/components/BookCatalogPage.astro`
  - 只渲染传入的页眉、分部标签和归档文案。
- `src/styles/home.css`
  - 只保留结构、材质算法和响应式规则。
  - 可调数值全部改为 `var(--home-...)`。

## 配置结构

```json
{
  "$schema": "./homepage-config.schema.json",
  "content": {
    "siteName": "ZHIMIN",
    "heroTitle": "写技术，也记录技术之外的生活。",
    "life": {
      "runningLabel": "CONTENTS",
      "partLabel": "Part I · Life",
      "archiveLabel": "全部生活文章"
    },
    "technical": {
      "runningLabel": "NOTES",
      "partLabel": "Part II · Technology",
      "archiveLabel": "全部技术文章"
    }
  },
  "desktop": {},
  "mobile": {},
  "materials": {}
}
```

## 参数表达

配置文件使用带单位的字符串，而不是裸数字：

```json
{
  "navigationHeight": "6svh",
  "bookWidth": "68%",
  "bookAspectRatio": "1.8 / 1",
  "navigationFontSize": "0.4rem"
}
```

这样做可以避免额外维护单位映射，也能直接看懂配置含义。Schema 使用正则规则阻止不合法单位。

## 桌面配置

桌面配置包含：

- 导航、头部、内容区、页脚高度。
- 站点内容宽度。
- 书本宽度和宽高比。
- 页面内边距。
- 分部标签上下间距。
- 目录行距。
- 归档链接底部位置。
- 导航、头部、书内目录、日期、归档链接、每日一句和页脚字号。

初始值使用当前线上已经确认的参数。

## 移动端配置

移动端配置包含：

- 导航和头部高度。
- 站点左右留白。
- 两张纸页的最小高度、内边距和间距。
- 页眉、分部标签、目录、日期、归档链接和页脚字号。

精装封面、装订布、书口和中缝在移动端始终隐藏，不作为可配置开关。

## 材质配置

材质配置包含：

- 纸张颜色。
- 硬壳颜色。
- 装订布颜色。
- 纸张纹理强度。
- 书本投影颜色和强度。
- 中缝颜色。

纸张纹理的算法和书口细线算法仍保留在 CSS 中，配置只控制颜色和强度，避免把复杂 CSS 片段放入 JSON。

## 校验

构建前验证：

- 必需字段存在。
- 文案是非空字符串。
- CSS 长度使用允许的单位：`rem`、`px`、`%`、`svh`、`vw`、`em`。
- 颜色使用十六进制或 `rgb/rgba`。
- 书本宽高比符合 `<number> / <number>`。
- 纹理强度为 `0` 到 `1`。

错误信息包含完整字段路径，例如：

```text
homepage config: desktop.bookWidth must be a CSS length, received "68"
```

## CSS 变量桥接

`homepage-config.mjs` 输出：

```text
--home-desktop-book-width: 68%;
--home-desktop-book-ratio: 1.8 / 1;
--home-material-paper: #ffffff;
```

`index.astro` 将字符串写入 `.home-body` 的 `style` 属性。CSS 使用：

```css
.home-book-frame {
  width: var(--home-desktop-book-width);
  aspect-ratio: var(--home-desktop-book-ratio);
}
```

移动端变量在媒体查询中使用，不依赖 JavaScript。

## 测试

- 校验当前配置通过。
- 缺失字段、非法单位、非法颜色和越界纹理强度失败。
- CSS 变量输出包含所有可调参数。
- 构建后首页文案来自配置。
- 构建后首页根节点包含配置生成的 CSS 变量。
- 现有桌面和移动端布局测试继续通过。

## 非目标

- 不在正式网站中加入可视化调节台。
- 不允许在 JSON 中直接写任意 CSS。
- 不把文章列表或每日一句数据合并进该配置。
- 不改变现有发布和部署流程。
