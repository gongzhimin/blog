---
title: "手机写博客指南"
description: "如何使用 Markor 和 Stats 在手机上写博客"
pubDatetime: 2026-04-17
tags: ["教程", "博客"]
---

# 手机写博客指南

本文介绍如何在 Android 手机上写博客文章并推送到网站。

## 准备工作

### 需要安装的 App

| App | 作用 | 下载 |
|-----|------|------|
| **Markor** | 写 Markdown 文章 | Google Play 搜索 "Markor" |
| **Stats** | GitHub 客户端，推送文件 | Google Play 搜索 "Stats" |

### 克隆博客仓库

1. 打开 Stats app
2. 点击右上角 `+` 添加仓库
3. 输入 `gongzhimin/blog`
4. 克隆到本地

## 配置 Markor

1. 安装后打开 Markor
2. 设置保存路径为方便访问的文件夹
   - 建议：`/storage/emulated/0/Documents/blog/`
3. 这样所有文章都集中在一个目录

## 写文章步骤

### Step 1: 创建新文章

1. 打开 Markor
2. 新建文件，文件名格式：`2026-04-17-my-trip.md`
3. 填写文章内容

### Step 2: 写文章

直接写内容就行，frontmatter（标题、日期等元数据）会自动添加：

```markdown
# 我的旅行

2026年清明假期，去了海边！

![海边照片](beach-sunset.jpg)
```

不用操心 frontmatter，GitHub Action 会自动帮你加上。

### Step 3: 添加图片

1. 在 Markor 编辑框下方点击图片按钮
2. 选择「拍照」或「从相册选择」
3. 图片会保存到文章同一目录
4. 文章中会自动插入图片引用

## 推送到网站

### 整理文件

1. 打开手机文件管理器
2. 找到 Markor 保存文章的目录（如 `Documents/blog/`）
3. 将文章文件复制到 Stats 克隆的仓库中：
   - 文章 → `src/content/blog/` 目录
   - 图片 → `public/images/` 目录

### 提交推送

1. 打开 Stats app
2. 进入 `gongzhimin/blog` 仓库
3. 点击右下角 `+` 按钮
4. 选择「Commit」提交更改
5. 点击「Sync」推送到 GitHub

## 发布完成

推送后，GitHub Webhook 会自动触发服务器构建：

```
GitHub → Webhook → 服务器 git pull → npm run build → 网站更新
```

等待约 1-2 分钟，文章就会出现在 zhimin.ink 上。

## 注意事项

1. **图片命名**：使用有意义的文件名，如 `2026-04-beach-sunset.jpg`
2. **图片大小**：建议压缩到 1MB 以下，减少加载时间
3. **保持同步**：推送前确保 Stats 仓库是最新状态

## 常见问题

**Q: Stats 无法克隆仓库？**
A: 确保已登录 GitHub 账号（Stats 设置中授权）

**Q: 图片显示不出来？**
A: 检查图片是否放在博客仓库的 `public/images/` 目录，引用路径是否为 `/images/图片名.jpg`

**Q: 文章没有出现在网站上？**
A: 检查 GitHub 仓库的 Actions 是否完成构建，或查看 Webhook 是否正常触发

---

有问题欢迎留言讨论。
