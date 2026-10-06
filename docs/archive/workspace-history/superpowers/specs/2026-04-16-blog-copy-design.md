# 个人博客文案设计文档

> **日期：** 2026/04/16
> **目标：** 优化博客网站的文案设计

---

## 一、设计基调

**整体调性：** 沉稳内敛

- 低调、稳重、有深度
- 像一本精心排版的杂志
- 去除"Zhimin's"这种西式所有格表达

---

## 二、文案清单

### 2.1 首页 (index.astro)

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 主标题 | Zhimin's Blog | Zhimin |
| 副标题 | 记录生活与技术的思考 | 删除 |
| 页脚 | About · RSS | About · RSS（不变）|

### 2.2 关于页 (about.astro)

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 页面标题 | About · Zhimin's Blog | About · Zhimin |
| 返回链接 | ← Back | ←（保持）|
| 简介 | 记录生活与技术的思考，用文字留住瞬间。 | 文字留住瞬间 |
| 下方返回链接 | ← Back to all posts | 删除 |

### 2.3 技术文章页 (BlogLayout.astro)

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 页面标题 | {标题} · Zhimin's Blog | {标题} · Zhimin |
| 返回链接 | ← Back | ← |
| 下方返回链接 | ← Back to all posts | 删除 |

### 2.4 生活随笔页 (LifeLayout.astro)

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 页面标题 | {标题} · Zhimin's Blog | {标题} · Zhimin |
| 返回链接 | ← Back | ← |
| 下方返回链接 | ← Back to all posts | 删除 |

### 2.5 RSS

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 标题 | Zhimin's Blog | Zhimin · Notes |
| 描述 | 记录生活与技术的思考 | Writing down moments worth keeping |

---

## 三、修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/pages/index.astro` | 主标题、副标题 |
| `src/pages/about.astro` | 页面标题、简介 |
| `src/layouts/BlogLayout.astro` | 页面标题、下方返回链接 |
| `src/layouts/LifeLayout.astro` | 页面标题、下方返回链接 |
| `src/pages/rss.xml.js` | RSS 标题和描述 |

---

## 四、实施步骤

1. 修改 `index.astro` 主标题
2. 修改 `about.astro` 文案
3. 修改 `BlogLayout.astro` 页面标题和链接
4. 修改 `LifeLayout.astro` 页面标题和链接
5. 修改 `rss.xml.js` RSS 信息
6. 提交并部署

---

*设计日期：2026/04/16*
