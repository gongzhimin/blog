# Optimization Roadmap

这份文档记录后续优化方向的边界，避免把架构重构、iOS 发布协议和服务器运行态混在一次危险改动里。

## 已完成的架构收敛

- Book Runtime 已从博客首页中拆出，首页和 `/demos/book-runtime/` 都通过 `BookShell` 接入。
- Markdown renderer 已迁入 `src/book/renderers/markdown-renderer.mjs`。
- 运行时统一挂在 `window.BookRuntime` 命名空间下。
- 分页器拆成三层：
  - `paginator-core.js`：分页配置与隐藏测量容器。
  - `paginator-splitters.js`：段落、代码、列表、表格拆分策略。
  - `paginator.js`：正文/目录分页调度与公开 API。
- `book-config.json` 已有 schema 与构建期校验。

## 下一阶段一：iOS 图片发布增强

目标：让 iOS 备忘录正文和用户手动选择的图片一起发布，生成稳定的 Markdown 图片语法。

建议分两步做：

1. 协议稳定
   - 请求字段：`raw`、`images[]`、`token`。
   - 每张图片包含：`filename`、`mime`、`base64`。
   - 正文占位符：`[图片]`、`[图片: 标题]`、`[图]`、`[图: 标题]`。
   - 服务端按占位符顺序替换成 `![标题](/images/mobile/...)`。

2. 服务端实现
   - 解码图片并写入 GitHub：`public/images/mobile/YYYY/MM/...`。
   - Markdown 与图片用一次 GitHub commit 原子提交。
   - 占位符数量和图片数量不一致时返回明确错误。

暂不建议直接依赖 iOS 备忘录导出的 HTML，因为分享表单不会稳定携带内嵌图片。

## 下一阶段二：服务器运行态观测

目标：服务器出问题时，不再靠猜。

建议新增：

- `/webhook/health` 或独立 healthcheck 脚本。
- `scripts/server-health-check.cjs`：检查 nginx、webhook service、env 文件、GitHub token 可用性。
- `docs/server-runtime/troubleshooting.md`：常见故障和对应命令。
- GitHub Actions 部署后访问 `https://zhimin.ink/` 验证首页可达。

## 下一阶段三：主题与内容产品化

目标：Book Runtime 不只服务博客 Markdown，也能服务独立书稿、作品集或文档。

建议新增稳定接口文档：

```text
BookDocument
  -> buildBookRuntime()
  -> BookShell
  -> window.BookRuntime
```

主题继续拆成：

- `visual`：纸张、字体、色彩、代码块。
- `geometry`：页面尺寸、封面、书脊、移动端尺寸。
- `pagination`：测量宽高、目录高度、正文高度。

## 不建议现在做的事

- 不要直接魔改 `public/vendor/turnjs/`。
- 不要让服务器 `/var/www/blog` 重新成为 Git 源头。
- 不要在没有回归测试的情况下调整分页算法。
- 不要一次性改 webhook 协议和快捷指令教程，必须先稳定服务端协议。
