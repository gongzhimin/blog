---
id: 'site-cover-generator-guide'
type: 'guide'
status: 'active'
created: '2026-10-05'
modified: '2026-10-09'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/site/README.md'
related:
  - 'packages/site/src/data/book-config.json'
  - 'packages/book-build/src/api/book-config.schema.json'
---

# 封面母版编辑与导出

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

修改本博客的书名、作者、卷首语及封面底图，导出可供翻页书切片使用的图片。母版含站点文案，归 Site；Book 提供通用切片配置，Runtime 显示页面，不维护这套设计素材。

这是浏览器手工编辑和截图工具，不提供自动导出命令，不参与 Astro 页面路由，也不在构建时生成封面。移动母版目录不会改变现有封面或线上资源 URL。

## 前置条件

- 在本地 `blog/` 工作，不连接服务器，不使用生产凭据。
- 使用支持 SVG、CSS 和 `contenteditable` 的浏览器；检查字体和四张底图已加载后再截图。
- 保存本次修改前的母版与配置差异。浏览器内编辑只改变当前 DOM，刷新后不会自动写回 HTML。
- 不修改 `public/vendor/`。新设计产物放在自有静态资源目录，不能覆盖第三方原件。

## 输入与配置

```text
packages/site/src/tools/cover-generator/
+-- sprite-only.html              主母版；引用本目录 CSS 和 assets
+-- editable-book-sprite.css       文字位置、纹理及尺寸样式
+-- sprite-only-standalone.html    内嵌素材的独立导出版本
+-- assets/
    +-- front-cover-image.jpg
    +-- physical-base-no-text.jpg
    +-- page2-bg-from-page-neg2-mirrored-exact.jpg
    +-- page2-page3-spread-reference-v2.jpg

母版 -- 浏览器编辑/截图 --> 自有 JPEG
自有 JPEG -- 静态文件 --> public/images/<明确文件名>.jpg
配置 -- image/backgroundSize/positions --> BookShell/Runtime 封面
```

箭头表示文件生产及配置消费，不是模块源码导入。

当前截图区域 `#sprite` 为 2048 × 516 CSS px。SVG 内部坐标、源图尺寸与当前运行配置的 `backgroundSize` 并非同一尺寸；不能仅改图片路径就假定所有切片对齐。

消费配置在 `packages/site/src/data/book-config.json` 的 `book.coverSprite`：

- `image`：浏览器资源 URL，例如自有文件对应的 `/images/book-cover-custom.jpg`。
- `backgroundSize`：实际渲染的背景尺寸，不必等于原图像素尺寸。
- `positions`：各封面区域的背景偏移；必须结合最终显示尺寸核对。`frontInside` 为封二，`titlePage` 为扉页插画，`backInside` 为封底内侧；`titlePage` 缺省兼容 `backInside`，设计不同画面时显式配置。

这两份 HTML 是不同交付形式，不会自动互相生成。调整主母版后，若还要交付独立版本，必须同步文案、样式和素材并核对两者结果。

## 操作步骤

1. 用浏览器打开 `packages/site/src/tools/cover-generator/sprite-only.html`。需要单文件传递时才选独立版本。
2. 修改书名、卷首语和版权图层；长期修改写回 HTML/CSS，不能只保留浏览器当前编辑状态。
3. 等待图片与字体就绪。设置页面缩放为 100%，用节点截图选中 `#sprite`，核对导出图片像素尺寸；设备像素比可能使截图像素大于 CSS 尺寸。
4. 将截图导出为 JPEG，保存到本次新建且命名明确的 `public/images/` 文件。避免覆盖不属于本次任务的已有资产。
5. 将 `book.coverSprite.image` 改为新 URL；按切片布局核对 `backgroundSize` 和全部 `positions`，不要直接照搬旧图偏移。
6. 在 blog 根执行以下命令，再打开预览核对封面与封底。测试使用独立 4392 端口，不复用已运行的开发站点；4392 冲突时先识别进程归属，不自动终止其他服务。首次浏览器测试先安装两个引擎：

```sh
npx playwright install chromium webkit
npm run verify
npm run test:e2e
npm run preview
```

停止预览进程即可结束本地操作。发布属于另一项授权流程，不在本指南自动执行。

## 结果核对

- 主母版四张素材均显示，无字体缺字、遮挡或被截图边界裁切的文字。
- 新资源 URL 在预览中可访问，配置引用自有目录，不指向工具源码或新增 vendor 文件。
- 核对封面、卷首区域、版权区域及封底，检查宽屏与窄屏的切片边缘、文字完整性和缩放。
- 自动 E2E 验证既有布局与交互，不替代新封面视觉验收；保存本次截图、浏览器和视口信息。

## 失败与恢复

底图缺失时，检查 HTML 中相对 `assets/` 地址及文件是否齐全；不要通过改写成机器绝对路径解决。字体不一致先记录本机字体与浏览器条件，再决定是否需要固定字体资产。

截图清晰但切片错位时，先核对图片像素尺寸、背景显示尺寸和偏移坐标；不能把旧配置视为新图的正确参数。独立版本不同步时只使用已核对的主母版，不交付两个矛盾版本。

恢复仅针对本次明确修改的母版、配置及新产物。保留原有工作区差异；新图片只有在确认无引用并获得删除授权后才删除，不清空目录，不修改 vendor。

## 关联资料

- [Site README](../../README.md)：站点内容、CLI、开发工具和配置归属。
- [Site API](../reference/api.md)：页面与配置校验入口。
- [Book 配置参考](../../../../packages/book-build/docs/reference/book-config.generated.md)：封面字段及约束。
- [全局交付指南](../../../../docs/operations/deployment.md)：本地验收后的发布边界。
