---
id: 'site-special-pages-design'
type: 'module'
status: 'active'
created: '2026-10-09'
modified: '2026-10-09'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/site/docs/explanation/design.md'
related:
  [
    'packages/site/src/internal/presentation/special-pages/index.mjs',
    'packages/site/src/data/book-edition.json',
    'docs/reference/book-runtime-contract.md',
  ]
---

# 六种特殊页设计

目录：

- [问题与目标](#问题与目标)
- [范围与约束](#范围与约束)
- [内部组成](#内部组成)
- [数据与接口](#数据与接口)
- [关键流程](#关键流程)
- [设计取舍](#设计取舍)
- [失败与边界](#失败与边界)
- [验证与演进](#验证与演进)

## 问题与目标

封面和前后衬页需要独立调整内容与版面，不能让一次封面修改同时改动分页算法和 Astro 书壳。此前扉页与出版说明有服务端、运行时两套模板，封底样式还绑定估算页号，容易产生内容或资源漂移。

本设计将六页分成六种稳定角色。每种角色有独立模板、挂载类和资源映射；初始渲染与运行时缓存使用同一份 HTML。当前图片和文案不换新。

## 范围与约束

- Site 决定文案、版面、主题和插画；Runtime 只决定物理页号及导航。
- 特殊页不参与正文分页，不显示正文页码。正文结束后的对齐尾衬不属于这六页，仍由 Runtime 生成。
- 不增加公开 API 或 npm 包，不修改只读 vendor。书脊、衬边、层叠隔离、运动状态仍由书壳和适配器管理。
- 内容来自受信仓库；文案转义为文本。手写 HTML/CSS 模板不提供用户投稿净化。

## 内部组成

以下是 Site 的内部文件关系，箭头表示构建期函数调用或浏览器数据传递：

```text
src/data/book-edition.json -- text --> special-pages/index.mjs
Book Build source title  -- title -->         |
                                             +--> front-cover.mjs
                                             +--> front-inside.mjs
                                             +--> title-page.mjs
                                             +--> imprint-page.mjs
                                             +--> back-inside.mjs
                                             +--> back-cover.mjs
                                             |
                                    six role definitions
                                      /             \
                         initial HTML/               \JSON payload
                                    v                 v
                               BookShell         Book Runtime
                                                     |
                                            assign 1,2,3,4,N-1,N

book-config.coverSprite --> special-pages/styles.mjs --> role surface CSS
special-pages/<theme>.css --> loadSiteBookTheme --> visual CSS only
```

正文主题 `styles/book-themes/<theme>/content.css` 不再包含扉页或出版说明布局。特殊页布局放在相邻的 `classic-paper.css`、`plain-manuscript.css`；这些规则只追加到显示 CSS，不加入正文或目录测量 CSS。

## 数据与接口

这些是 Site 私有定义，不是六个包级接口。公共任务仍是 `buildHomepageModel(input)`；其 `runConfig.specialPages` 由组合器生成。其他书路由由 BookShell 使用同一组合器补齐。

| 角色        | 物理位置 | 模板文件         | 资源坐标字段     | 内容                             |
| ----------- | -------- | ---------------- | ---------------- | -------------------------------- |
| frontCover  | 1        | front-cover.mjs  | front            | 原封面及书脊节点                 |
| frontInside | 2        | front-inside.mjs | frontInside      | 原卷首插画；文案目前烘焙在图片中 |
| titlePage   | 3        | title-page.mjs   | titlePage        | 书名、副标题、作者及版本标识     |
| imprintPage | 4        | imprint-page.mjs | 无；使用纸张表面 | 出版信息、说明及版权             |
| backInside  | N−1      | back-inside.mjs  | backInside       | 原封三插画                       |
| backCover   | N        | back-cover.mjs   | backOuter        | 原封底插画                       |

每个定义返回新对象：`{ html: string, className: string, artwork?: string }`。

- `html` 是页内 HTML，不包含插件管理的外层物理页节点。书壳直接渲染，Runtime 原样缓存。
- `className` 是 Site 挂载类，保留 `hard`、`fixed`、`front-side`、`back-side` 等机械约定，并增加稳定 `book-page--*` 角色类。
- `artwork` 对应 `book.coverSprite.positions`，不是 URL 或物理页号。图像 URL 和总尺寸仍由现有 Book 配置提供；扉页坐标省略时使用 backInside，封三省略时使用 back。
- `year` 在构建时取一次，随后进入生成的 HTML。浏览器不重新取年份，不从引语署名推导书籍作者。

## 关键流程

1. Book Build 生成来源标题、正文和目录载荷。
2. Site 将来源标题、现有 edition 文案与构建年份组合为六个角色定义。
3. BookShell 用这些定义生成六个初始节点，并将相同定义写入 JSON 数据岛。尾页节点暂用构建估算页号。
4. Runtime 校验六种角色均有字符串 HTML；校准目录并计算实际总页数 N，写入相应缓存，更新现有尾页节点的页号类。
5. Site 适配器管理翻页。角色类不随 N 改变，因此封底样式不需要运行时注入或重建。

缺少某个角色或 HTML 类型错误时 Runtime 返回分页诊断，不交付部分结果。分页或目录校准失败时仍按既有失败路径停止，不能靠旧页号伪装成功。

## 设计取舍

- 不采用六个独立包或公开渲染接口：六页共同消费同一书籍主题和元数据，分包只增加调用与版本协调。
- 不保留两端模板：模板只属于 Site，HTML 是 JSON 可传递的构建结果；Runtime 不需要导入 Site 或理解版权文案。
- 不用 `.pN` 绑定封底素材：N 会因字体、视口和内容改变；稳定角色类避免样式失效。
- 不把所有页都改成图片：扉页和出版说明的 HTML 文案仍可选择、检索及独立排版。现有插画中的文字本轮不提取。

## 失败与边界

- 当前卷首、封面部分文字仍烘焙在精灵图中；修改 JSON 不会改变这些像素。后续换图时需要同步母版与切片。
- 当前尺寸、移动端缩放和衬边几何保持原方案；六文件抽取不等于已支持任意书页尺寸或在线换主题。
- `classic-paper` 显示扉页插画；演示书的 `plain-manuscript` 保留其原有纸张背景覆盖规则。更换插画前先明确是否修改该主题的 surface.css，不能仅由生成 CSS 含 URL 推断实际显示。
- 不带 `specialPages` 的独立 Runtime 消费者得到通用空衬页与来源标题，不再得到个人博客版权或隐式 vendor 插画。消费者负责提供自己的版面与资源。
- 插件缓存节点移出活动 DOM 不表示其内容丢失，不重建已登记页以绕过插件生命周期。

## 验证与演进

- Site public-api 用例核对六角色、JSON 序列化、书籍与引语作者隔离、标题文本转义和固定年份。
- Runtime runtime-lifecycle 核对固定四页与动态尾页的 HTML 精确对应、输入不变、不完整载荷拒绝、通用路径不注入 Site 样式。
- 全局 turnjs-integration 在首页、独立书、演示书三个构建产物中比较初始页 HTML 与数据岛 HTML。
- Chromium/WebKit 继续验证扉页背景、出版说明往返、内封页遮挡与封面运动。自动测试不证明任意新素材的美术质量或 Safari/iOS 真机表现。

后续个性化先改具体页面模板或 edition 文案，再改角色素材；如需独立图片模式，先扩充资源契约与切片验收，不把新素材逻辑加入 Runtime。
