# 手机写博客方案设计

> **日期：** 2026/04/16
> **目标：** 实现手机写文章并推送至博客
> **更新：** 2026/04/17（简化方案：移除 Syncthing）

---

## 一、需求概述

| 需求 | 说明 |
|------|------|
| 手机平台 | Android + iPhone |
| 图片存储 | 放在博客仓库 `public/images/` 目录 |
| 文章推送 | 手机 → GitHub |
| 自动部署 | GitHub Webhook 触发服务器即时拉取 |

---

## 二、架构设计

```
[手机 Markor + Stats App]
       │
       ▼
[GitHub 仓库: gongzhimin/blog]
       │
       │ (Webhook: push 事件)
       ▼
[服务器: 52.194.254.9]
       │
       │ git pull → npm run build
       ▼
[/var/www/blog] → Nginx → [博客网站 zhimin.ink]
```

---

## 三、仓库目录结构

```
gongzhimin/blog/
├── public/
│   └── images/           ← 手机推送的图片放这里
│       ├── beach-sunset.jpg
│       └── my-photo.jpg
├── src/
│   └── content/
│       └── blog/         ← 手机推送的文章放这里
│           └── my-post.md
└── ...
```

---

## 四、服务器 Webhook 配置

### 4.1 Webhook 服务

- 运行在端口 9000
- 路径：`/var/webhook/webhook.js`
- Secret：`zhimin-blog-2026`
- 配置为 systemd 服务

### 4.2 Nginx 配置

- 路径：`/etc/nginx/sites-available/blog`
- `/webhook` 转发到 `127.0.0.1:9000`

### 4.3 GitHub Webhook

- Payload URL：`https://zhimin.ink/webhook`
- Content type：`application/json`
- Secret：`zhimin-blog-2026`
- Events：push

### 4.4 部署流程

Webhook 触发后执行：
1. `git pull origin main`
2. `npm run build`
3. `chown -R www-data:www-data /var/www/blog/dist`

---

## 五、手机写作流程（简化方案）

### 5.1 Android 推荐应用

| App | 作用 |
|-----|------|
| **Markor** | 写 Markdown 文章、拍照 |
| **Stats** | GitHub 客户端，推送文件到仓库 |

### 5.2 Markor 配置

1. 安装 Markor（Google Play 搜索）
2. 设置保存路径：`/storage/emulated/0/Documents/blog/`

### 5.3 写作步骤

**Step 1: 写文章**
- 用 Markor 新建 `.md` 文件
- 放在 `Documents/blog/` 目录

**Step 2: 添加图片**
- 用 Markor 拍照或从相册选择图片
- 图片保存在同一目录
- 文章中引用：
```markdown
![海边照片](beach-sunset.jpg)
```

**Step 3: 推送到 GitHub**
1. 打开 Stats app
2. 克隆/同步 `gongzhimin/blog` 仓库
3. 将文章文件复制到 `src/content/blog/` 目录
4. 将图片复制到 `public/images/` 目录
5. 提交并推送

### 5.4 文章格式模板

```markdown
---
title: "我的旅行"
description: "2026年清明假期"
pubDatetime: 2026-04-17
tags: ["旅行"]
---

# 我的旅行

去了海边！

![海边照片](beach-sunset.jpg)
```

---

## 六、图片引用方式

手机照片同步到服务器后，在文章中引用：

```markdown
![图片描述](/images/照片名.jpg)
```

注意：Markor 编辑时显示本地图片，GitHub 预览和博客网站上显示服务器图片。

---

## 七、替代方案

### 7.1 纯 GitHub Mobile App 方案

- 只用 GitHub Mobile App
- 缺点：无法直接上传图片
- 图片需要用外部图床链接

### 7.2 Syncthing 方案（已放弃）

- 优点：图片自动同步
- 缺点：需要额外的 Syncthing 服务器端配置，App 较小众

---

## 八、实施步骤（已完成）

- [x] 服务器安装 webhook 接收服务
- [x] 配置 Nginx 转发 webhook 请求
- [x] 配置 GitHub Webhook
- [x] 服务器 `/var/www/blog` 设置为 git 克隆
- [ ] Android 安装配置 Markor
- [ ] Android 安装配置 Stats（GitHub client）
- [ ] 测试完整流程

---

## 九、注意事项

1. **图片命名**：使用有意义的文件名，如 `2026-04-beach-sunset.jpg`
2. **图片大小**：建议单张不超过 1MB，先压缩再上传
3. **仓库同步**：Stats app 需要保持仓库同步状态

---

*设计日期：2026/04/16*
*更新日期：2026/04/17（简化方案）*
