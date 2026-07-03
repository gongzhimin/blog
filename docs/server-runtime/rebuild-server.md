# Rebuild Server Runbook

这份文档用于服务器丢失、到期、被销毁之后，从一台全新的 Ubuntu
服务器重新恢复 `zhimin.ink` 博客。

目标不是恢复旧服务器上的 `/var/www/blog` Git 工作区，而是恢复当前项目真正需要的运行面：

- nginx 静态站点
- GitHub Actions 自动部署
- iOS Shortcuts `/webhook` 发布入口
- systemd 托管的 webhook 服务
- HTTPS 证书

## 当前架构

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
  -> scripts/webhook-receiver.cjs
  -> GitHub API 写入 Markdown
  -> GitHub Actions 再构建并部署
```

`/var/www/blog` 不应该作为 GitHub 的源码源头。源码源头是 GitHub 仓库；
服务器只负责运行 webhook 和承载构建后的 `dist/`。

## 需要提前保存的东西

这些内容如果丢了，无法只靠仓库完全恢复：

- 域名控制台账号，可修改 `zhimin.ink` 的 DNS。
- 新服务器的 SSH 私钥，写入 GitHub Secret `LIGHTSAIL_SSH_KEY`。
- webhook 共享密钥，写入服务器 `/etc/blog-webhook.env` 的 `BLOG_WEBHOOK_TOKEN`。
- GitHub PAT，写入服务器 `/etc/blog-webhook.env` 的 `BLOG_GITHUB_TOKEN`。
- iOS Shortcuts 中填写的 webhook token，需要和 `BLOG_WEBHOOK_TOKEN` 一致。

仓库里只保存模板，不保存真实密钥。

## 1. 创建新服务器

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

## 2. 配置 DNS

在域名服务商后台设置：

```text
A    zhimin.ink    新服务器公网 IP
```

等待解析生效：

```bash
dig +short zhimin.ink
```

返回新服务器 IP 后再继续申请证书。

## 3. 初始化服务器系统

登录服务器：

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@13.193.240.51
```

安装基础组件：

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx rsync curl git
```

安装 Node.js 22。推荐使用 NodeSource：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

创建运行目录：

```bash
sudo mkdir -p /var/www/blog/dist
sudo mkdir -p /var/www/blog/scripts
sudo chown -R ubuntu:ubuntu /var/www/blog
```

## 4. 配置 nginx

把仓库里的备份配置复制到服务器：

```bash
scp -i LightsailDefaultKey-ap-northeast-2.pem \
  docs/server-runtime/nginx-zhimin.ink.conf \
  ubuntu@13.193.240.51:/tmp/blog-nginx.conf
```

在服务器上安装配置：

```bash
sudo install -m 0644 /tmp/blog-nginx.conf /etc/nginx/sites-available/blog
sudo ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

如果还没有证书，`nginx -t` 可能会因为证书路径不存在而失败。这时先临时删除或注释
`listen 443 ssl` 和 `ssl_certificate` 相关行，只保留 80 端口配置；等证书申请成功后，
Certbot 会补回 HTTPS 配置。

## 5. 申请 HTTPS 证书

确认 DNS 已经指向新服务器后执行：

```bash
sudo certbot --nginx -d zhimin.ink
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

## 6. 配置 GitHub Actions 部署

当前部署 workflow 在 `.github/workflows/deploy.yml`：

```text
Build: npm run build
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

## 7. 安装 webhook 服务

把仓库里的 webhook 代码和 systemd service 上传到服务器：

```bash
scp -i LightsailDefaultKey-ap-northeast-2.pem \
  scripts/webhook-receiver.cjs \
  scripts/server-health-check.cjs \
  scripts/blog-webhook.service \
  ubuntu@13.193.240.51:/tmp/
```

在服务器上安装：

```bash
sudo install -m 0644 /tmp/webhook-receiver.cjs /var/www/blog/scripts/webhook-receiver.cjs
sudo install -m 0755 /tmp/server-health-check.cjs /var/www/blog/scripts/server-health-check.cjs
sudo install -m 0644 /tmp/blog-webhook.service /etc/systemd/system/blog-webhook.service
```

安装 webhook 依赖。因为 webhook 脚本使用 `jsdom`、`turndown` 和
`turndown-plugin-gfm`，服务器运行目录需要可用的 `node_modules`。

一种简单做法是在服务器放一份最小 `package.json`：

```bash
cd /var/www/blog
npm init -y
npm install jsdom turndown turndown-plugin-gfm
```

如果后续希望完全复用项目依赖，也可以把仓库 clone 到独立目录，再让
`WorkingDirectory` 指向该目录。但不要把 `/var/www/blog` 当成回推 GitHub 的源码仓库。

## 8. 配置 webhook 密钥

从模板创建 env 文件：

```bash
sudo install -m 0600 /dev/null /etc/blog-webhook.env
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

## 9. 启动 webhook 服务

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

## 10. 验证公网 webhook 入口

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

最后用 iOS Shortcuts 发一篇测试文章。成功后应该看到：

```text
iOS Shortcuts -> /webhook -> GitHub commit -> GitHub Actions -> 网站更新
```

也可以在服务器上运行自动健康检查：

```bash
node /var/www/blog/scripts/server-health-check.cjs
```

所有检查都应返回 `PASS`。

## 11. GitHub Actions 自动部署检查

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
- `/var/www/blog/scripts` 是否存在。
- `/etc/blog-webhook.env` 是否包含 `BLOG_WEBHOOK_TOKEN` 和 `BLOG_GITHUB_TOKEN`。
- `systemctl status blog-webhook.service` 和 `journalctl -u blog-webhook.service -n 80 --no-pager`。

## 12. 不要恢复的旧东西

不要试图恢复旧服务器上的 `/var/www/blog/.git` 状态。

旧服务器上的 `/var/www/blog` 曾经混合了承担：

- Git 工作区
- webhook 运行目录
- 移动端文章残留目录
- 静态站点部署目录

新服务器重建时应该只恢复必要运行面：

```text
/var/www/blog/dist
/var/www/blog/scripts/webhook-receiver.cjs
/var/www/blog/scripts/server-health-check.cjs
/etc/systemd/system/blog-webhook.service
/etc/blog-webhook.env
/etc/nginx/sites-available/blog
```

如果需要服务器作为 Git 中转仓库，另建干净 bare 仓库：

```bash
git init --bare /home/ubuntu/blog.git
```

不要使用 `/var/www/blog` 做中转仓库。

## 13. 最小恢复检查清单

服务器重建完成后，逐项确认：

- `https://zhimin.ink/` 能打开。
- `curl -I https://zhimin.ink/` 返回 `200` 或 `304`。
- `systemctl is-active blog-webhook.service` 返回 `active`。
- `ss -ltn | grep ':9000'` 显示 `127.0.0.1:9000`。
- `node /var/www/blog/scripts/server-health-check.cjs` 全部返回 `PASS`。
- `POST https://zhimin.ink/webhook` 使用错误 token 返回 `403`。
- iOS Shortcuts 使用正确 token 能发布测试文章。
- GitHub Actions 能自动部署最新页面。
- `/etc/blog-webhook.env` 权限是 `600`。
- 仓库里没有真实 PAT 或 webhook token。
