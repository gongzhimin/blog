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
    - 优先接收共享表单中的原始文本，也兼容 Markdown 和 HTML。
    - **保留 Markdown 符号**：粗体、斜体、引用、列表和链接不会被转义。
    - **处理内嵌图片**：HTML 输入中的图片与文章一起提交到 GitHub。
    - **自动转换表格**：HTML 表格转为 Markdown 标准格式。
    - **直接写入 GitHub**：服务器通过 GitHub Contents / Git Data API 创建提交，不再依赖本地 `git push`。

#### 快捷指令配置

推荐直接把共享内容通过 `raw` 字段发送。快捷指令只负责传输，标题提取、换行和 Markdown 语法恢复由服务端完成。

1. 在「快捷指令」App 中新建一个指令。
2. 添加「获取 URL 内容」动作。
   - URL：`https://zhimin.ink/webhook`
   - 方法：`POST`
   - 请求体：`JSON`
   - 头部：`Content-Type: application/json`
3. 在 JSON 请求体里填写以下字段，其中 `raw` 的值选择「快捷指令输入」：

```json
{
  "token": "zhimin_secret_post_2026",
  "raw": "快捷指令输入"
}
```

#### 字段说明

- `token`：服务端校验用的密钥，必须与服务器上的配置一致。
- `raw`：推荐字段。第一行作为标题，剩余内容直接按 Markdown 保存。
- `markdown`：兼容字段。一级标题会作为文章标题。
- `title`：可选。设置后优先作为文章标题。
- `html`：兼容 HTML 输入，服务端会转换为 Markdown。

#### 使用建议

- 第一行非空文本作为文章标题。
- 普通连续换行会转成 Markdown 硬换行，适合诗歌和短句。
- 可以直接输入 `> 引用`、`**粗体**`、`- 列表` 和 Markdown 链接。
- iOS 备忘录自身的富文本样式不会通过共享表单导出；需要保留的格式应使用 Markdown 符号表达。
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
