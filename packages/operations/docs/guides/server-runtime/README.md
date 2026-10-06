---
id: 'operations-server-runtime-index'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'operations'
owner: 'operations 维护者'
parent: 'packages/operations/README.md'
related:
  - 'docs/operations/deployment.md'
---

# 服务器运行维护指南

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

维护 nginx 静态服务、HTTPS 与 systemd webhook 的日常运行；需要全机重建时转到 [恢复手册](rebuild-server.md)，需要跨工作流升级或回滚时使用 [交付指南](../../../../../docs/operations/deployment.md)。

本指南先观察再定位，不把健康报告当作业务发布确认。

## 前置条件

只在已批准的目标服务器运行真实探针。准备目标主机和源码提交、SSH 身份、现有配置备份及脱敏日志记录位置。

服务器默认是 Ubuntu、ubuntu 用户、Node 22.13+ 或 24+；shell、systemctl、sudo、curl 必须可用。本地单测使用注入 runner，不执行此处服务器命令。

## 输入与配置

- 当前预期是 nginx 为 zhimin.ink 提供 /var/www/blog/dist；
- /webhook 反代到 127.0.0.1:9000；
- systemd 托管 blog-webhook.service。服务器不是内容主仓库，IP 与用户名须核对批准目标。

| 资产                 | 权威来源                                                 | 核对内容                         |
| -------------------- | -------------------------------------------------------- | -------------------------------- |
| dist、CI、版本与回滚 | [全局交付](../../../../../docs/operations/deployment.md) | 目标已验证提交和产物版本         |
| nginx                | [配置模板](nginx-zhimin.ink.conf)                        | 域名、静态根、反代、证书         |
| webhook 进程         | [正式 service](../../../src/assets/blog-webhook.service) | 新 CLI、工作目录、用户、环境文件 |
| env 字段             | [模板](blog-webhook.env.example)                         | 文件权限与字段存在，不输出真值   |

DNS、证书、SSH 私钥、共享 token 与 PAT 属于外部控制面；仓库只保存字段模板。

## 操作步骤

1. 在服务器确认批准的目标运行目录，执行 `node /var/www/blog/packages/operations/src/cli/health.cjs`。保存逐项 PASS/FAIL、目标提交和执行时间，不打印 env 内容。
2. 服务项失败时观察 `systemctl status blog-webhook.service --no-pager -l`；经授权查看并脱敏 journal。核对 /var/www/blog/packages/publishing/src/cli/publish.cjs 与 packages/publishing/src/api、internal 是否完整安装。
3. 本地端口失败时核对监听地址和路由：`curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:9000/webhook`，GET 预期 404。不要用真实文章 POST 排查运行前提。
4. 公网首页失败时分别核对 DNS、HTTPS、nginx 配置和 dist。修改 nginx 前先有配置备份并执行 nginx -t；通过后才在授权范围内 reload。
5. 凭据字段或权限问题由受控服务器配置流程处理；不把 env 复制回仓库。软件升级、重启和真实发布需要既有任务授权，观察失败不会自动授权这些动作。

## 结果核对

七项 PASS 只说明服务、文件字段、本地 GET 与公网首页满足各自判据。另行比较已部署提交和目标页面内容；PAT 字段存在不证明权限有效，404 不证明 POST 发布成功，首页可达不证明版本正确。

需要端到端发布时核对授权测试对应 GitHub commit、CI run、产物与公开页面。

## 失败与恢复

- 普通失败项继续观察其他项；
- runner 异常会终止 CLI，记录已执行范围。systemctl/sudo 无统一超时，不能把挂起当作健康通过。修正后重跑相关观察和完整报告。配置回退只恢复明确备份，代码回退选择已验证的模块树与 service 同版本；
- 不要删除文章、dist 或机密以清理故障。服务器已丢失或不能保留现有运行面时，执行 [重建手册](rebuild-server.md) 的完整步骤。

## 关联资料

[Operations README](../../../README.md)、[健康 API](../../reference/api.md)、[恢复手册](rebuild-server.md)、[全局交付](../../../../../docs/operations/deployment.md)。

主机、Node、端口、域名和部署方式变化时同步模板和手册，记录实际验证与未演练范围。
