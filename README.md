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
    - 优先接收快捷指令生成的 Markdown，也兼容 HTML 和纯文本。
    - **保留文本格式**：标题、粗体、斜体、引用、列表和链接直接映射到博客 Markdown。
    - **处理内嵌图片**：HTML 输入中的图片与文章一起提交到 GitHub。
    - **自动转换表格**：HTML 表格转为 Markdown 标准格式。
    - **直接写入 GitHub**：服务器通过 GitHub Contents / Git Data API 创建提交，不再依赖本地 `git push`。

#### 快捷指令配置

推荐先把备忘录的多信息文本转换成 Markdown，再通过 `markdown` 字段发送。这样可以保留标题、粗体、斜体、引用、列表和链接等结构。

1. 在「快捷指令」App 中新建一个指令。
2. 添加「获取共享内容」动作，拿到备忘录的多信息文本。
3. 添加「从多信息文本制作Markdown」动作。
4. 添加「获取 URL 内容」动作。
   - URL：`https://zhimin.ink/webhook`
   - 方法：`POST`
   - 请求体：`JSON`
   - 头部：`Content-Type: application/json`
5. 在 JSON 请求体里填写以下字段，其中 `markdown` 的值选择上一步生成的 Markdown 变量：

```json
{
  "token": "zhimin_secret_post_2026",
  "markdown": "# 标题\n\n正文第一段\n\n**粗体内容**"
}
```

#### 字段说明

- `token`：服务端校验用的密钥，必须与服务器上的配置一致。
- `markdown`：推荐字段。一级标题会作为文章标题，剩余 Markdown 原样保存为正文。
- `title`：可选。设置后优先作为文章标题。
- `raw`：兼容旧快捷指令，第一行会被当作标题。
- `html`：兼容 HTML 输入，服务端会转换为 Markdown。

#### 使用建议

- 在备忘录中把第一行设置为标题样式，转换后通常会生成 Markdown 一级标题。
- 如果转换结果没有一级标题，服务端会使用第一行非空文本作为标题。
- 图片仍通过 HTML 内嵌图片链路处理；Markdown 路径当前主要保证文字排版格式。
- webhook 的运行时代码由独立的 GitHub Actions 工作流同步到服务器，站点构建则由主部署工作流负责。

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
