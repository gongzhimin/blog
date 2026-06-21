# 首页导航、书页层级与独立文字样式设计

日期：2026-06-22

## 目标

删除首页独立头部区，将原标题放入导航栏；恢复书页与目录页的罗马数字页码；重构首页配置，使每一种文字角色都能独立控制字体、桌面字号、移动字号、亮色颜色和暗色颜色。

## 导航

桌面导航分为三个视觉区域：

- 左侧：`ZHIMIN`。
- 中间：`写技术，也记录技术之外的生活。`。
- 右侧：`生活`、`技术`、`关于`、`RSS`、主题按钮。

中间标题尽可能位于整条导航的几何中心。宽度逐渐缩小时，标题先单行省略；进入窄屏断点后隐藏标题。右侧全部导航入口始终展开，不使用汉堡菜单，不隐藏导航入口。

品牌、标题、导航链接分别使用独立文字样式配置，即使初始字号相同。

## 首页结构

首页删除 `.home-hero`，结构变为：

1. 导航栏。
2. 精装书内容区。
3. 每日一句与版权区。

桌面区域高度总和仍以一个视口为目标：

- 导航：`6svh`。
- 书本内容区：`78svh`。
- 页脚：`16svh`。

在较矮或非标准比例屏幕上允许纵向滚动，不允许横向溢出。

## 书页页眉

删除书页页眉中的 `ZHIMIN`，采用镜像排版：

- 左页外缘：`ESSAYS`。
- 左页内缘：`CONTENTS`。
- 右页内缘：`CONTENTS`。
- 右页外缘：`TECHNICAL NOTES`。

外缘与内缘页眉分别使用独立文字样式。

## 书页链接与页码

- `PART I · LIFE` 链接到 `/life`。
- `PART II · TECHNOLOGY` 链接到 `/blog`。
- 左页底部入口：`View all essays`。
- 右页底部入口：`View all technical notes`。
- 首页左页页码：`i`。
- 首页右页页码：`ii`。

总目录入口和罗马数字页码同时保留，使用不同的底部位置参数，避免重叠。

## 子目录页码

- `/life` 显示 `i`。
- `/blog` 显示 `i`。

两个目录独立编号，暂不与首页或彼此连续。目录页只复用首页配置中的页码文字样式，不改造成精装书页面。

## 页脚

每日一句继续来自 `daily-quote.json`。版权与每日一句分离：

- 英文句子。
- 中文译文。
- 作者。
- 版权。

版权显示为：

```text
© 2026 · Zhimin 的博客书
```

年份动态生成，JSON 只保存 `Zhimin 的博客书`。

## 配置结构

`content` 保存文字：

```json
{
  "siteName": "ZHIMIN",
  "navigationTitle": "写技术，也记录技术之外的生活。",
  "copyrightLabel": "Zhimin 的博客书",
  "navigation": {
    "lifeLabel": "生活",
    "technicalLabel": "技术",
    "aboutLabel": "关于",
    "rssLabel": "RSS"
  },
  "life": {
    "outerRunningLabel": "ESSAYS",
    "innerRunningLabel": "CONTENTS",
    "partLabel": "Part I · Life",
    "archiveLabel": "View all essays",
    "homepageFolio": "i",
    "directoryFolio": "i"
  },
  "technical": {
    "outerRunningLabel": "TECHNICAL NOTES",
    "innerRunningLabel": "CONTENTS",
    "partLabel": "Part II · Technology",
    "archiveLabel": "View all technical notes",
    "homepageFolio": "ii",
    "directoryFolio": "i"
  }
}
```

`textStyles` 为以下每个角色保存独立配置：

- `navigationBrand`
- `navigationTitle`
- `navigationLinks`
- `runningOuter`
- `runningInner`
- `partLink`
- `catalogTitle`
- `catalogDate`
- `archiveLink`
- `folio`
- `quoteEnglish`
- `quoteTranslation`
- `quoteAuthor`
- `copyright`

每个角色包含：

```json
{
  "fontFamily": "sans",
  "desktopSize": "0.4rem",
  "mobileSize": "0.4rem",
  "lightColor": "#302b26",
  "darkColor": "#eeeae3"
}
```

允许的字体值为 `serif`、`sans`、`monospace`。配置转换器将字体标记映射到站点现有 CSS 字体变量。

## 测试

- 配置验证覆盖新增内容、全部文字角色、字体标记、字号和颜色。
- 首页构建结果中不存在 `.home-hero`。
- 导航包含独立标题，并完整渲染四个文字入口。
- Part 标题与总目录入口链接正确。
- 镜像页眉顺序正确。
- 首页页码为 `i`、`ii`。
- 两个目录页各显示 `i`。
- 版权为动态年份、分隔点和配置文案。
- 桌面标题接近几何中心；窄屏标题隐藏，导航入口均可见。
- 所有目标视口无横向溢出。

