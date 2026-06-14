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
    - **自动双向同步**：服务器生成 `.md` 文件后，会自动将其 `git push` 回 GitHub，保证仓库内容最全。

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
