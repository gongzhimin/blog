# iOS 同名文章 GitHub 覆盖设计

## 目标

iOS 发布文章时，以 GitHub `main` 分支为唯一事实源。若 `src/content/life` 中存在 frontmatter `title` 完全相同的 Markdown 文件，则覆盖该文件内容；若不存在，则创建新文件。

## 数据流

1. webhook 接收并解析 iOS 提交的标题、正文和图片。
2. webhook 读取 GitHub 当前分支的 commit 与递归 tree。
3. webhook 下载 `src/content/life/*.md`，解析 frontmatter 标题。
4. 同名文章存在时，使用其 GitHub 路径作为目标，并保留原 frontmatter 日期。
5. 同名文章不存在时，使用当前日期、标题 slug 和随机后缀创建路径。
6. Markdown、图片和重复文件删除操作在一个 GitHub commit 中完成。
7. GitHub 分支更新成功后返回 HTTP 200，由 GitHub Actions 构建并部署网站。

## 一致性规则

- 服务器工作目录不再写入文章或图片。
- 覆盖目标由 GitHub 当前 tree 决定，不依赖服务器仓库状态。
- 如果存在多个同名文件，保留 GitHub tree 中路径排序最后的一份作为目标，并删除其余同名文件。
- 只删除 GitHub 当前 tree 中真实存在的文件，避免无效删除导致 `GitRPC::BadObjectState`。
- GitHub API 任一步骤失败时返回错误，不产生服务器本地文章变更。

## 测试

- GitHub 存在同名文章时覆盖原路径并保留原日期。
- GitHub 不存在同名文章时创建新路径。
- GitHub 存在多个同名文章时覆盖一个并删除其余文件。
- 发布函数仅提交 GitHub tree 中存在的删除路径。
- 全部单元测试和 Astro 构建必须通过。
