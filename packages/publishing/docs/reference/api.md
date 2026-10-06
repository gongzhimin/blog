---
id: 'scripts-publishing-docs-reference-interface'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'publishing'
owner: 'Publishing 维护者'
parent: 'packages/publishing/README.md'
related:
  - 'packages/publishing/src/api/index.cjs'
  - 'packages/publishing/src/internal/http.cjs'
---

# Publishing API 参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

Publishing 是仓库内移动文章发布服务，不是通用 GitHub SDK。包根仅提供一个启动任务；内容转换、GitHub 请求和 HTTP handler 是服务内部职责。

## 接口清单

| 导入                 | 成员            | 调用目的                                     |
| -------------------- | --------------- | -------------------------------------------- |
| `@myblog/publishing` | `startServer()` | 启动本机 webhook 服务并返回 HTTP server 句柄 |

只读导入不启动监听。普通运维调用应使用 `npm run server:publish`；低层规划、Git 和 HTTP 函数不从包根导出。

## 输入与配置

### `startServer()`

**签名**：`startServer(): http.Server`

公开声明见 [index.d.cts](../../src/api/index.d.cts)。监听尚未就绪时句柄仍会返回；宿主须处理 listening/error 事件，尤其端口占用不是同步成功。

无参数。调用前必须通过环境变量提供非空 `BLOG_WEBHOOK_TOKEN`；GitHub 仓库、分支和访问 Token 由服务环境配置。服务固定监听 `127.0.0.1:9000`，外部请求应通过受控反向代理进入。

HTTP 协议为 `POST /webhook`。请求体为 JSON；顶层字段名会先 trim，`token` 以原值与 `BLOG_WEBHOOK_TOKEN` 比较，Authorization 请求头不用于客户端鉴权。

| 字段       | 类型                               | 必填     | 作用与限制                                   |
| ---------- | ---------------------------------- | -------- | -------------------------------------------- |
| `token`    | `string`                           | 是       | webhook 共享密钥；不放入 URL、日志或示例     |
| `title`    | `string`                           | 否       | 文章标题；可由正文标题提取                   |
| `raw`      | `string`                           | 条件必填 | 当前移动端推荐正文格式，可包含图片占位符     |
| `markdown` | `string`                           | 条件必填 | Markdown 正文替代输入                        |
| `html`     | `string`                           | 条件必填 | 受信 HTML 替代输入                           |
| `images`   | `Array<{filename?, mime, base64}>` | 否       | 按正文占位符顺序提供图片；数量必须匹配占位符 |

正文至少提供 `raw`、`markdown` 或 `html` 之一。输入格式、图片字典示例和手机端配置步骤见[iOS 发布指南](../guides/ios-shortcuts-image-publishing.md)。

## 输出与副作用

调用后启动 HTTP listener，并返回 Node `http.Server`。调用者负责在测试或宿主关闭时调用 `server.close()`。导入 API 不读取请求、不连接 GitHub、不监听端口。

HTTP handler 验证请求、加载远端仓库状态、生成文件变更并提交 GitHub。HTTP `200` 仅表示仓库 ref 更新请求已成功，不代表 CI 或静态部署完成。

## 错误与边界

- 缺少或为空白 `BLOG_WEBHOOK_TOKEN` 时，`startServer` 同步抛 `Error`，不会调用 `process.exit`。
- 请求鉴权失败返回 `403`；方法或路径不匹配返回 `404`；解析、计划或提交错误由 handler 返回 `400`。
- `400` 不能单独判断失败发生于解析、内容校验还是远端写入。响应丢失时先查询目标分支/提交状态，不能直接重试。
- GitHub 拒绝非快进更新时不会强制覆盖。远端结果不确定时先核实分支状态。
- 服务内部使用环境凭据及仓库路径，不提供任意命令或仓库路径接口。

## 兼容与示例

生产运行使用批准的服务环境：

```sh
npm run server:publish
```

该命令要求服务凭据与部署目录已正确配置；不要在开发机上启动真实发布 listener。单元测试直接注入 HTTP/Git 替身，不调用此命令。

包根导出变化需同步 CLI、部署资源、请求/响应测试及本页。`src/internal/` 不属于支持的调用路径。

## 验证与关联

```sh
npm run --workspace @myblog/publishing test
npm run check:docs
```

测试通过替身固定鉴权、请求映射、串行提交和错误响应，不证明真实 GitHub 或 CI 部署状态。内容计划见[模块设计](../explanation/design.md)，安全执行见[变更指南](../guides/change.md)和[服务器指南](../../../operations/docs/guides/server-runtime/README.md)。
