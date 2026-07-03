# iOS Shortcuts Image Publishing

这份文档记录从 iOS 备忘录通过快捷指令发布带图片文章的设计与操作方式。

当前推荐方案是：

```text
备忘录导出正文 raw
  -> 快捷指令额外选择图片
  -> 快捷指令把图片转成 base64
  -> POST raw + images 到 /webhook
  -> webhook 上传 Markdown 和图片到 GitHub
  -> GitHub Actions 构建并部署网站
```

注意：这份文档描述的是当前推荐的 `raw + images + 图片占位符` 方案。服务端会把
图片和 Markdown 放进同一次 GitHub commit，因此文章内容与图片资源会一起更新。
现有 `html + data:image/...;base64,...` 链路仍然保留兼容，但 iOS 备忘录分享时通常
不会稳定导出带内嵌图片的 HTML，所以不作为主方案。

## 为什么不是直接从备忘录导出图片

iOS 备忘录分享给快捷指令时，正文通常能以文本形式传出，但内嵌图片不会稳定地作为
富文本附件一同传给快捷指令。

因此图片发布拆成两个来源：

```text
文章文字：来自备忘录共享输入
图片文件：快捷指令运行时手动从照片选择
图片位置和标题：来自备忘录正文里的占位符
```

这样仍然是一键发布流程，只是在快捷指令中多一步选择照片。

## 备忘录写法

正文中用图片占位符标记图片位置。

支持两种完整写法：

```markdown
[图片]
[图片: 图片标题]
```

也支持短写：

```markdown
[图]
[图: 图片标题]
```

示例：

```markdown
海边的下午

今天去了海边。

[图片: 海边的风很大]

风很大，天很蓝。

[图: 傍晚的云]

最后吃了晚饭。
```

快捷指令中选择的第 1 张图片会替换第 1 个占位符，选择的第 2 张图片会替换第 2 个占位符。

最终生成的 Markdown 应类似：

```markdown
今天去了海边。

![海边的风很大](/images/mobile/2026/07/img-20260701-001.jpg)

风很大，天很蓝。

![傍晚的云](/images/mobile/2026/07/img-20260701-002.jpg)

最后吃了晚饭。
```

## 占位符规则

占位符格式：

```text
[图片]
[图片: 标题]
[图]
[图: 标题]
```

解析规则：

```text
[图片]        -> 无标题图片，生成 ![](...)
[图片: 标题] -> 有标题图片，生成 ![标题](...)
[图]          -> 无标题图片，生成 ![](...)
[图: 标题]   -> 有标题图片，生成 ![标题](...)
```

建议用中文冒号 `：` 或英文冒号 `:` 都支持：

```markdown
[图片：中文冒号标题]
[图片: 英文冒号标题]
```

服务器应统一把标题两侧空格去掉。

## 快捷指令总体流程

快捷指令负责四件事：

```text
1. 接收备忘录分享出来的正文。
2. 统计正文里有几个图片占位符。
3. 让用户选择同样数量的图片。
4. 把正文和图片 base64 一起 POST 到 /webhook。
```

快捷指令不负责解析图片标题。图片标题留在正文占位符里，由服务端解析。

## 快捷指令创建步骤

### 1. 基本设置

新建快捷指令，例如命名为：

```text
发布到博客
```

打开快捷指令详情，启用：

```text
在共享表单中显示
```

共享表单接收类型建议保留：

```text
文本
富文本
URL
文章
```

实际使用时优先按文本处理。

### 2. 获取正文

动作顺序：

```text
获取快捷指令输入
获取输入中的文本
设置变量 raw
```

变量：

```text
raw = 备忘录分享出来的文本
```

如果快捷指令里没有“获取输入中的文本”，可以用“获取文本”或“从输入获取文本”这类等价动作。
iOS 不同版本中文动作名会略有差异，核心是把共享输入转成纯文本。

### 3. 匹配图片占位符

添加“匹配文本”动作。

输入：

```text
raw
```

正则表达式：

```regex
\[(?:图片|图)(?:\s*[:：]\s*[^\]]+)?\]
```

保存匹配结果为变量：

```text
placeholders
```

再添加“计数”动作：

```text
placeholderCount = placeholders 的数量
```

### 4. 没有图片时走普通发布

添加“如果”动作：

```text
如果 placeholderCount 是 0
```

则直接发送普通 JSON：

```json
{
  "token": "你的 webhook token",
  "raw": "正文内容"
}
```

这种情况继续沿用现有纯文本发布方式。

### 5. 有图片时选择照片

如果 `placeholderCount > 0`：

添加“选择照片”动作。

建议设置：

```text
选择多张：打开
```

运行时你需要按照正文占位符的顺序选择图片。

保存选择结果：

```text
selectedImages
```

然后添加“计数”动作：

```text
imageCount = selectedImages 的数量
```

添加校验：

```text
如果 imageCount 不等于 placeholderCount
  显示提醒：图片数量和正文占位符数量不一致
  停止此快捷指令
```

这一步很重要。错图比发布失败更麻烦，所以数量不一致时应该直接停止。

### 6. 将图片转成 base64

新建空列表变量：

```text
images = []
```

对 `selectedImages` 使用“重复每一项”。

在循环中：

```text
重复项目 -> 转换图像
转换格式 -> JPEG
质量 -> 可选，中等或高
```

建议先压缩到合理大小：

```text
调整图像大小
最长边：1600px
```

然后：

```text
Base64 编码
```

得到：

```text
base64Image
```

为当前图片创建一个字典：

```json
{
  "filename": "image.jpg",
  "mime": "image/jpeg",
  "base64": "base64Image"
}
```

把这个字典添加到 `images` 列表。

如果希望保留 PNG，也可以不统一转 JPEG，但 JPEG 对手机照片更省空间。
如果快捷指令不方便拿到原文件名，可以固定填写 `image.jpg`；服务端会优先使用
`mime` 判断扩展名。

### 7. 组装请求 JSON

创建字典：

```json
{
  "token": "你的 webhook token",
  "raw": "raw",
  "images": "images"
}
```

注意：

- `raw` 是正文变量，不是字符串 `"raw"`。
- `images` 是图片字典列表；没有图片时可以不传。
- 图片数量必须和正文里的 `[图片]` / `[图]` 占位符数量一致，否则服务器会拒绝发布。
- `images` 是图片字典列表，不是字符串 `"images"`。
- 图片标题不放在 `images` 里，标题已经写在正文占位符中。

最终 JSON 结构应类似：

```json
{
  "token": "replace-with-webhook-token",
  "raw": "海边的下午\n\n[图片: 海边的风很大]\n\n正文...",
  "images": [
    {
      "filename": "image.jpg",
      "mime": "image/jpeg",
      "base64": "/9j/4AAQSkZJRgABAQ..."
    },
    {
      "filename": "image.jpg",
      "mime": "image/jpeg",
      "base64": "/9j/4AAQSkZJRgABAQ..."
    }
  ]
}
```

### 8. POST 到 webhook

添加“获取 URL 内容”动作。

URL：

```text
https://zhimin.ink/webhook
```

方法：

```text
POST
```

请求体：

```text
JSON
```

请求体内容：

```text
上一步创建的字典
```

Headers：

```text
Content-Type: application/json
```

成功时服务器返回：

```text
Success
```

如果返回错误，将返回错误原因，例如：

```text
Missing content
Image placeholder count (2) does not match image count (1)
Missing BLOG_GITHUB_TOKEN
```

## 服务端处理方式

服务端收到：

```json
{
  "token": "...",
  "raw": "正文\n\n[图片: 标题]\n\n正文",
  "images": [
    {
      "filename": "image.jpg",
      "mime": "image/jpeg",
      "base64": "..."
    }
  ]
}
```

应执行：

```text
1. 校验 token。
2. 解析 raw，提取图片占位符。
3. 校验占位符数量和 images 数量一致。
4. 为每张图片生成文件名。
5. 把图片写入 GitHub tree:
   public/images/mobile/YYYY/MM/img-<timestamp>-<index>.jpg
6. 把 raw 中的占位符按顺序替换为 Markdown 图片语法。
7. 创建或覆盖同名 life 文章。
8. Markdown 和图片在同一个 GitHub commit 中提交。
```

替换示例：

```text
[图片: 海边的风很大]
```

替换为：

```markdown
![海边的风很大](/images/mobile/2026/07/img-20260701-001.jpg)
```

无标题示例：

```text
[图片]
```

替换为：

```markdown
![](/images/mobile/2026/07/img-20260701-001.jpg)
```

## 图片标题如何显示

第一阶段可以只生成 Markdown 图片 alt：

```markdown
![海边的风很大](/images/mobile/YYYY/MM/img-xxx.jpg)
```

浏览器会显示图片，但不一定显示标题文字。

如果后续希望标题显示在图片下方，可以在渲染层把图片转成：

```html
<figure>
  <img src="/images/mobile/YYYY/MM/img-xxx.jpg" alt="海边的风很大">
  <figcaption>海边的风很大</figcaption>
</figure>
```

建议分两步做：

```text
第一步：先保证图片能上传和显示。
第二步：再设计图片标题的视觉样式。
```

## 常见问题

### 图片数量和占位符数量不一致怎么办

应该停止发布。

推荐错误：

```text
图片数量和正文占位符数量不一致
```

不要自动猜测，也不要把多余图片追加到文末。博客文章里错图很难发现，严格失败更安全。

### 我可以不写图片标题吗

可以。

```markdown
[图片]
```

会生成：

```markdown
![](/images/mobile/YYYY/MM/img-xxx.jpg)
```

### 图片太大怎么办

快捷指令里先压缩。

推荐：

```text
最长边 1600px
JPEG
质量中等或高
```

单张图片建议控制在 1MB 左右。图片太大会导致：

- 快捷指令运行慢。
- JSON 请求体过大。
- GitHub API 提交变慢。
- 网站加载变慢。

### 为什么不把标题放在快捷指令弹窗里输入

因为那会把写作语义拆散。

推荐把标题写在备忘录：

```markdown
[图片: 海边的风很大]
```

这样以后修改文章时，图片位置和图片说明都在同一个文本里，维护成本最低。

### 如果备忘录里已经有图片，还要重新选吗

是的。

iOS 备忘录分享时不会稳定把内嵌图片交给快捷指令。当前方案要求在快捷指令运行时从相册重新选择图片。

### 可以从“文件”而不是“照片”选择吗

可以作为后续增强。

第一版建议只支持“选择照片”，减少快捷指令复杂度。

## 最小测试用例

备忘录内容：

```markdown
图片测试

这是第一段。

[图片: 第一张测试图]

这是第二段。
```

快捷指令选择 1 张照片。

预期 GitHub commit 中包含：

```text
src/content/life/<date>-*.md
public/images/mobile/YYYY/MM/img-*.jpg
```

文章 Markdown 应包含：

```markdown
![第一张测试图](/images/mobile/YYYY/MM/img-*.jpg)
```

网站构建后应显示图片。
