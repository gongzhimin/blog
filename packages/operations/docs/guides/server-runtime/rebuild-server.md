---
id: 'operations-server-rebuild'
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

# 服务器恢复操作指南

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

在服务器丢失、到期或被销毁后，用一台新的 Ubuntu 恢复 zhimin.ink 静态网站、HTTPS、systemd webhook 及 CI 部署连接。本文描述仓库预期，不是本轮恢复演练记录。

只在目标服务器和凭据权限已获批准时执行；普通本地开发不要执行这些命令。

恢复不是找回服务器 Git 工作树的推送能力。内容权威来源在 GitHub；服务器承载已验证 dist 与 webhook 运行环境。

常规升级/回滚见 [全局部署指南](../../../../../docs/operations/deployment.md)。

## 前置条件

这些内容如果丢了，无法只靠仓库完全恢复：

- 域名控制台账号，可修改 `zhimin.ink` 的 DNS。
- 新服务器的 SSH 私钥，写入 GitHub Secret `LIGHTSAIL_SSH_KEY`。
- webhook 共享密钥，写入服务器 `/etc/blog-webhook.env` 的 `BLOG_WEBHOOK_TOKEN`。
- GitHub PAT，写入服务器 `/etc/blog-webhook.env` 的 `BLOG_GITHUB_TOKEN`。
- iOS Shortcuts 中填写的 webhook token，需要和 `BLOG_WEBHOOK_TOKEN` 一致。

仓库里只保存模板，不保存真实密钥。

所有示例 IP、用户名和路径执行前与批准目标核对。安装软件、改 DNS、触发 CI、写凭据和重启属于外部变更，需要相应授权。先确认已有目标文件是否需要备份，不能以恢复为由覆盖仍有效的配置或凭据。

## 输入与配置

```text
本机 / GitHub 仓库
  -> GitHub Actions
  -> npm run build
  -> rsync dist/ 到服务器 /var/www/blog/dist
  -> nginx 服务 zhimin.ink

iOS 备忘录
  -> Shortcuts
  -> https://zhimin.ink/webhook
  -> nginx proxy_pass 127.0.0.1:9000
  -> systemd: blog-webhook.service
  -> packages/publishing/src/cli/publish.cjs
  -> GitHub API 写入 Markdown
  -> GitHub Actions 再构建并部署
```

`/var/www/blog` 不应该作为 GitHub 的源码源头。源码源头是 GitHub 仓库；
服务器只负责运行 webhook 和承载构建后的 `dist/`。

```text
GitHub 源码 -> CI 验证/构建 -> dist -> nginx -> 读者
                                        |
移动作者 -> HTTPS /webhook -> nginx proxy -> Publishing API
                                                 |
                                                 v
                                         GitHub 内容提交

Operations CLI -> systemd / env字段 / 本地路由 / 公网首页
```

输入包括批准的主机、域名、SSH 身份、目标提交/产物、系统版本与受控机密。模板见 [nginx](nginx-zhimin.ink.conf) 和 [环境字段](blog-webhook.env.example)。

服务配置使用 Operations 拥有的唯一 [正式 service](../../../src/assets/blog-webhook.service)，恢复时与批准的源码版本一起安装。

## 操作步骤

### 执行位置与 SSH 身份

- 本地命令在项目根 `blog/` 执行，不在外层工作区或 SSH 会话中执行。SSH、scp 和 rsync 示例统一使用 `../LightsailDefaultKey-ap-northeast-2.pem`；
- 这是当前工作区相对路径，不是所有机器的固定配置。操作前核对批准的身份文件、主机与用户；
- 文件位置不同则同步替换三个命令，不能打印或读取密钥内容作诊断。

| 步骤 | 执行位置                                                                    |
| ---- | --------------------------------------------------------------------------- |
| 1、2 | 云平台/域名控制台；dig 在本地终端                                           |
| 3    | ssh 在本地 blog/；登录后安装和目录命令在服务器                              |
| 4    | scp 在新的本地 blog/ 终端；安装配置在服务器                                 |
| 5    | 服务器                                                                      |
| 6    | workflow 修改在本地 blog/，Secret 与运行选择在 GitHub；ls/curl 核验在服务器 |
| 7    | rsync 在本地 blog/；创建暂存目录、安装及 npm ci 在服务器                    |
| 8、9 | 服务器；填写机密使用受控编辑流程                                            |
| 10   | 公网 curl 在本地；健康 CLI 在服务器；真实发布在获授权的 Shortcuts 客户端    |

每次切换终端先检查 `pwd`，本地应是项目 blog 根；服务器安装目录是 `/var/www/blog`，二者不可混用。这里的操作步骤仍需要逐项授权，不因执行位置明确而成为本地开发指令。

### 1. 创建新服务器

推荐配置：

- Ubuntu LTS。
- 至少 1GB 内存。
- 开放端口：`22`、`80`、`443`。
- 如果使用 AWS Lightsail，给实例绑定静态 IP。

以下示例假设：

```text
服务器 IP: 13.193.240.51
用户名: ubuntu
域名: zhimin.ink
仓库: gongzhimin/blog
```

如果 IP 改了，后面所有出现 `13.193.240.51` 的地方都要替换。

### 2. 配置 DNS

在域名服务商后台设置：

```text
A    zhimin.ink    新服务器公网 IP
```

等待解析生效：

```bash
dig +short zhimin.ink
```

返回新服务器 IP 后再继续申请证书。

### 3. 初始化服务器系统

登录服务器：

```bash
ssh -i ../LightsailDefaultKey-ap-northeast-2.pem ubuntu@13.193.240.51
```

安装基础组件：

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx rsync curl git
```

安装满足 package.json engines 的 Node.js：Node 22 LTS >=22.13 或 24+。以下保留 NodeSource 的 22.x 安装示例，使用前审查外部安装脚本并按目标系统政策批准：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

创建运行目录：

```bash
sudo mkdir -p /var/www/blog/dist
sudo mkdir -p /var/www/blog/packages/publishing/src/cli /var/www/blog/packages/operations/src/cli
sudo chown -R ubuntu:ubuntu /var/www/blog
```

### 4. 配置 nginx

把仓库里的备份配置复制到服务器：

```bash
scp -i ../LightsailDefaultKey-ap-northeast-2.pem \
  packages/operations/docs/guides/server-runtime/nginx-zhimin.ink.conf \
  ubuntu@13.193.240.51:/tmp/blog-nginx.conf
```

在服务器上先选择配置：

- 已有证书：确认正式模板引用的证书、Certbot include 和 dhparams 文件均存在，再安装上传的模板。
- 新服务器无证书：不要安装 HTTPS 模板，也不要仅注释证书行。用编辑器将 `/tmp/blog-nginx.conf` 改为下面的纯 HTTP 引导配置；没有 SSL include、dhparams 或 HTTPS 重定向。

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name zhimin.ink;
    root /var/www/blog/dist;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /webhook {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
    }
}
```

仅在确认目标配置及备份后，在服务器安装所选配置：

```bash
sudo install -m 0644 /tmp/blog-nginx.conf /etc/nginx/sites-available/blog
sudo ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` 成功才 reload；失败时先修正配置，不继续申请或声称恢复成功。纯 HTTP 引导阶段不发送真实 token 或文章；它只用于证书申请和初始可达性。

### 5. 申请 HTTPS 证书

确认 DNS 已经指向新服务器后执行：

```bash
sudo certbot --nginx -d zhimin.ink
```

申请成功后再次运行 `sudo nginx -t`，核对 HTTPS 证书、HTTP 重定向及 `/webhook` 代理。Certbot 修改的是已启用的引导配置；不要随后用旧引导文件覆盖它。正式模板用于比对预期拓扑，不代表其 SSL 文件在新机上已存在。

检查自动续期：

```bash
sudo certbot renew --dry-run
```

### 6. 配置 GitHub Actions 部署

当前部署 workflow 在 `.github/workflows/deploy.yml`：

```text
Verify: npm run verify + npm run test:e2e
Build: validated dist artifact
Deploy: rsync dist/ -> /var/www/blog/dist/
Host: 13.193.240.51
Secret: LIGHTSAIL_SSH_KEY
```

如果新服务器 IP 变了，需要修改：

- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-webhook.yml`

把里面的 `host: 13.193.240.51` 和 `remote_host: 13.193.240.51`
改成新 IP。

在 GitHub 仓库设置中配置 Secret：

```text
Settings
  -> Secrets and variables
  -> Actions
  -> New repository secret
  -> LIGHTSAIL_SSH_KEY
```

值填写能登录新服务器的 SSH 私钥全文。

然后在本机推送一次任意会触发部署的变更，或手动重新运行 GitHub Actions。

部署成功后，服务器上应该出现：

```bash
ls -la /var/www/blog/dist
curl -I https://zhimin.ink/
```

### 7. 安装 webhook 服务

- 状态：当前恢复操作。CLI 通过公开 API 启动；
- 必须同时安装 publishing/operations 的 api 与 internal 完整树。优先执行当前提交的 Deploy Webhook 工作流。手动上传前在服务器创建 /tmp/blog-runtime-restore；
- 下面上传命令在仓库根执行。

把仓库里的 webhook 代码和 systemd service 上传到服务器：

```bash
rsync -avR -e 'ssh -i ../LightsailDefaultKey-ap-northeast-2.pem' \
  packages/publishing/src/cli/publish.cjs packages/operations/src/cli/health.cjs packages/operations/src/assets/blog-webhook.service \
  packages/publishing/src/api packages/publishing/src/internal packages/operations/src/api packages/operations/src/internal \
  package.json package-lock.json \
  ubuntu@13.193.240.51:/tmp/blog-runtime-restore/
```

在服务器上安装：

```bash
sudo install -d -o ubuntu -g ubuntu /var/www/blog/packages/publishing/src/cli /var/www/blog/packages/operations/src/cli
sudo install -m 0644 /tmp/blog-runtime-restore/packages/publishing/src/cli/publish.cjs /var/www/blog/packages/publishing/src/cli/publish.cjs
sudo cp -R /tmp/blog-runtime-restore/packages/publishing/src/api /tmp/blog-runtime-restore/packages/publishing/src/internal /var/www/blog/packages/publishing/src/
sudo install -m 0755 /tmp/blog-runtime-restore/packages/operations/src/cli/health.cjs /var/www/blog/packages/operations/src/cli/health.cjs
sudo cp -R /tmp/blog-runtime-restore/packages/operations/src/api /tmp/blog-runtime-restore/packages/operations/src/internal /var/www/blog/packages/operations/src/
sudo install -m 0644 /tmp/blog-runtime-restore/packages/operations/src/assets/blog-webhook.service /etc/systemd/system/blog-webhook.service
sudo install -m 0644 -o ubuntu -g ubuntu /tmp/blog-runtime-restore/package.json /var/www/blog/package.json
sudo install -m 0644 -o ubuntu -g ubuntu /tmp/blog-runtime-restore/package-lock.json /var/www/blog/package-lock.json
```

安装 webhook 依赖。因为 webhook 脚本使用 `jsdom`、`turndown` 和
`turndown-plugin-gfm`，服务器运行目录需要可用的 `node_modules`。

使用仓库锁文件安装，避免恢复时下载不相容版本：

```bash
cd /var/www/blog
PUPPETEER_SKIP_DOWNLOAD=1 npm ci --omit=dev
```

如果后续希望完全复用项目依赖，也可以把仓库 clone 到独立目录，再让
`WorkingDirectory` 指向该目录。但不要把 `/var/www/blog` 当成回推 GitHub 的源码仓库。

### 8. 配置 webhook 密钥

从模板创建 env 文件：

```bash
sudo test -f /etc/blog-webhook.env || sudo install -m 0600 /dev/null /etc/blog-webhook.env
sudo nano /etc/blog-webhook.env
```

内容格式：

```dotenv
BLOG_WEBHOOK_TOKEN=replace-with-shortcuts-shared-secret
BLOG_GITHUB_TOKEN=replace-with-github-pat
BLOG_GITHUB_REPO=gongzhimin/blog
BLOG_GITHUB_BRANCH=main
```

`BLOG_WEBHOOK_TOKEN` 要和 iOS Shortcuts 里 POST 的 `token` 字段一致。

`BLOG_GITHUB_TOKEN` 是 GitHub PAT。它至少需要能写入目标仓库内容。如果使用
Fine-grained token，给 `gongzhimin/blog` 仓库 `Contents: Read and write` 权限。

不要把 `/etc/blog-webhook.env` 复制回仓库。

### 9. 启动 webhook 服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable blog-webhook.service
sudo systemctl restart blog-webhook.service
sudo systemctl status blog-webhook.service --no-pager -l
```

确认监听本地端口：

```bash
ss -ltn | grep ':9000'
```

预期：

```text
127.0.0.1:9000
```

用错误 token 测试鉴权：

```bash
curl -sS -o /tmp/blog-webhook-bad-token.out -w '%{http_code}\n' \
  -X POST http://127.0.0.1:9000/webhook \
  -H 'Content-Type: application/json' \
  --data '{"token":"bad"}'
```

预期返回：

```text
403
```

### 10. 验证公网 webhook 入口

从本机执行：

```bash
curl -sS -o /tmp/blog-webhook-public-bad-token.out -w '%{http_code}\n' \
  -X POST https://zhimin.ink/webhook \
  -H 'Content-Type: application/json' \
  --data '{"token":"bad"}'
```

预期返回：

```text
403
```

这说明：

- DNS 可达。
- HTTPS 可用。
- nginx `/webhook` proxy 可用。
- Node.js webhook 服务可用。
- token 校验可用。

获得真实内容写入与部署授权后，最后用 iOS Shortcuts 发一篇测试文章。成功后应该看到：

```text
iOS Shortcuts -> /webhook -> GitHub commit -> GitHub Actions -> 网站更新
```

也可以在服务器上运行自动健康检查：

```bash
node /var/www/blog/packages/operations/src/cli/health.cjs
```

所有检查都应返回 `PASS`。

## 结果核对

### 最小恢复清单

服务器重建完成后，逐项确认：

- `https://zhimin.ink/` 能打开。
- `curl -I https://zhimin.ink/` 返回 `200` 或 `304`。
- `systemctl is-active blog-webhook.service` 返回 `active`。
- `ss -ltn | grep ':9000'` 显示 `127.0.0.1:9000`。
- `node /var/www/blog/packages/operations/src/cli/health.cjs` 全部返回 `PASS`。
- `POST https://zhimin.ink/webhook` 使用错误 token 返回 `403`。
- iOS Shortcuts 使用正确 token 能发布测试文章。
- GitHub Actions 能自动部署最新页面。
- `/etc/blog-webhook.env` 权限是 `600`。
- 仓库里没有真实 PAT 或 webhook token。

进一步记录目标源码提交、CI run、产物版本及时间。HTTP 200、active 和七项 PASS 只证明各自探针，不证明目标页面已经发布。

真实 Shortcuts 测试需独立授权，并核对 GitHub commit、后续 CI 和公开内容，不能将 webhook 200 当作部署完成。

## 失败与恢复

### 工作流失败定位

在 GitHub Actions 页面确认：

- `Deploy Blog` 成功。
- `Deploy Webhook` 成功。

如果 `Deploy Blog` 失败，重点检查：

- `LIGHTSAIL_SSH_KEY` 是否是新服务器私钥。
- workflow 里的 IP 是否已更新。
- 服务器 `/var/www/blog/dist` 是否存在且 `ubuntu` 可写。
- 服务器安全组是否允许 SSH。

如果 `Deploy Webhook` 失败，重点检查：

- workflow 里的 IP 是否已更新。
- `/var/www/blog/packages/publishing/src/cli` 与 `/var/www/blog/packages/operations/src/cli` 是否存在，CLI 引用的 api/internal 是否完整。
- `/etc/blog-webhook.env` 是否包含 `BLOG_WEBHOOK_TOKEN` 和 `BLOG_GITHUB_TOKEN`。
- `systemctl status blog-webhook.service` 和 `journalctl -u blog-webhook.service -n 80 --no-pager`。

### 避免恢复错误资产

不要试图恢复旧服务器上的 `/var/www/blog/.git` 状态。

旧服务器上的 `/var/www/blog` 曾经混合了承担：

- Git 工作区
- webhook 运行目录
- 移动端文章残留目录
- 静态站点部署目录

新服务器重建时应该只恢复必要运行面：

```text
/var/www/blog/dist
/var/www/blog/packages/publishing/src/cli/publish.cjs
/var/www/blog/packages/operations/src/cli/health.cjs
/var/www/blog/packages/publishing/src/api/
/var/www/blog/packages/publishing/src/internal/
/var/www/blog/packages/operations/src/api/
/var/www/blog/packages/operations/src/internal/
/etc/systemd/system/blog-webhook.service
/etc/blog-webhook.env
/etc/nginx/sites-available/blog
```

如果另有批准的 Git 中转需求，应单独设计并另建干净 bare 仓库；以下不是此恢复任务的必要步骤：

```bash
git init --bare /home/ubuntu/blog.git
```

不要使用 `/var/www/blog` 做中转仓库。

nginx 配置测试失败时先修正模板，不 reload 错误配置。证书未就绪时只保留批准的 HTTP 引导配置，申请成功后再次 nginx -t。服务失败先检查安装路径、依赖及脱敏日志，不打印完整 env。

只有在目标与备份明确的情况下回退本次配置；不要删除用户内容或运行目录来清理故障。

## 关联资料

[服务器资料索引](README.md)、[Operations 设计](../../explanation/design.md)、[健康接口](../../reference/api.md)、[全局部署](../../../../../docs/operations/deployment.md)。

主机 IP、域名、Node、工作流或端口变化时同步手册、模板和当前接口。
