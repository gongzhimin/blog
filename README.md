# Zhimin's Blog

一个基于 **Astro** 构建的现代化个人博客系统，采用极简主义的编辑风格设计，支持全平台（PC/iOS）自动化发布。

访问地址：[https://zhimin.ink/](https://zhimin.ink/)

---

## 🎨 设计哲学：沉稳内敛的编辑风格

本项目旨在营造一种“沉浸式”的杂志阅读质感：
*   **双栏目录布局**：首页采用双栏 Showcase 模式，左侧展现生活随笔（Essays），右侧呈现技术文章（Technical）。
*   **经典纸媒排版**：
    *   **首字下沉 (Drop Caps)**：为生活随笔的第一段注入文学感。
    *   **古典引言块**：精致的双引号背景与斜体排版。
    *   **星号分隔符**：用传统的 `* * *` 取代生硬的水平线。
*   **克制动效**：全局页面平滑淡入，文章列表序贯加载，增强精致感。

---

## 🛠️ 技术架构

### 核心栈
- **框架**: Astro (Static Site Generation)
- **样式**: Tailwind CSS + Custom CSS
- **评论**: Giscus (基于 GitHub Discussions)
- **部署**: AWS Lightsail (Ubuntu + Nginx)

### 目录结构
```text
blog/
├── src/
│   ├── content/
│   │   ├── blog/          # 技术文章 (Markdown)
│   │   └── life/          # 生活随笔 (Markdown)
│   ├── pages/
│   │   ├── blog/          # 技术文章列表与详情页
│   │   ├── life/          # 随笔列表与详情页
│   │   └── index.astro    # 双栏 Showcase 首页
│   ├── layouts/           # 页面基础模板
│   └── styles/            # 全局样式与动画定义
├── public/                # 静态资源 (Logo, Favicon)
│   └── images/mobile/     # 移动端发布的图片自动存储处
├── scripts/               # 服务端自动化脚本 (Webhook 接收器)
└── .github/workflows/     # CI/CD 自动化流水线
```

---

## 🚀 自动化工作流

### 1. PC 端发布
在本地编辑器（如 VS Code）写好 Markdown 后，直接 `git push`：
- 触发 **GitHub Actions** 自动连接 AWS 服务器。
- 服务器自动执行 `git pull` 并运行 `npm run build`。
- 网站秒级更新。

### 2. 移动端发布 (iOS)
利用 **iOS 快捷指令 (Shortcuts)** 实现一键图文混合发布：
- **操作**：在 iPhone 备忘录中点击“共享” -> 运行“发布博文”指令。
- **服务端处理**：
    - 接收 HTML 格式内容。
    - **自动保存图片**：将备忘录中的图片保存到服务器本地。
    - **自动转换表格**：将 HTML 表格转为 Markdown 标准格式。
    - **直接写入 GitHub**：服务器通过 GitHub Contents / Git Data API 创建提交，不再依赖本地 `git push`。

#### 快捷指令配置

推荐把快捷指令配置成「备忘录内容 -> `raw` 字段」的方式，结构最简单，也最稳定。

1. 在「快捷指令」App 中新建一个指令。
2. 添加「获取共享内容」或「获取剪贴板内容」动作，拿到要发布的正文。
3. 添加「文本」动作，拼出 JSON 请求体。
4. 添加「获取 URL 内容」动作。
   - URL：`https://zhimin.ink/webhook`
   - 方法：`POST`
   - 请求体：`JSON`
   - 头部：`Content-Type: application/json`
5. 在 JSON 里填写以下字段：

```json
{
  "token": "zhimin_secret_post_2026",
  "raw": "标题\n正文第一段\n正文第二段"
}
```

#### 字段说明

- `token`：服务端校验用的密钥，必须与服务器上的配置一致。
- `raw`：原始文本内容，第一行会被当作标题，后续内容会转成正文。
- `html`：如果你想直接传富文本，也可以使用这个字段，服务端会自动转换为 Markdown。

#### 使用建议

- 标题放在第一行。
- 正文每一段之间空一行。
- 如果要发图片，建议通过 HTML 内容传入，服务端会把内嵌图片保存到 `public/images/mobile/`。

---

## 🧞 维护指南

### 本地开发
```bash
npm install
npm run dev
```

### 生产部署
部署已完全自动化。手动同步命令参考：
```bash
# 构建并同步到 AWS
npm run build
rsync -avz --delete ./dist/ ubuntu@zhimin.ink:/var/www/blog/dist/
```

---

*“文字留住瞬间。”*
