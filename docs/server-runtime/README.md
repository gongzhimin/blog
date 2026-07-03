# Server Runtime Backup

This directory records the server-side runtime pieces that support the blog
site and the iOS Shortcuts publishing flow.

If the server is lost, expired, or rebuilt from scratch, follow
`rebuild-server.md`.

The live server is `13.193.240.51` (`ubuntu`). The public web root is served
from `/var/www/blog/dist`, and `/webhook` is proxied to the local Node.js
webhook receiver on `127.0.0.1:9000`.

## Runtime Roles

`/var/www/blog`

Runtime/deployment directory on the server. It currently contains an old Git
working tree and should not be treated as the source of truth.

`/var/www/blog/scripts/webhook-receiver.cjs`

Node.js webhook receiver used by iOS Shortcuts. The running server copy matched
the repository copy when this backup was created.

`/var/www/blog/scripts/server-health-check.cjs`

Read-only health check script for the server runtime. It checks nginx,
`blog-webhook.service`, `/etc/blog-webhook.env`, the local webhook port, and
the public homepage. It does not print secret values.

`/etc/systemd/system/blog-webhook.service`

Systemd service that runs the webhook receiver.

`/etc/blog-webhook.env`

Server-only environment file. This file contains secrets and must not be
committed. Use `blog-webhook.env.example` as the versioned template.

`/etc/nginx/sites-available/blog`

Nginx site config for `zhimin.ink`.

## Source Of Truth

The source of truth should remain the local/GitHub repository. The server
runtime directory should receive built assets and run the webhook service, but
it should not be used as the Git source that pushes back to GitHub.

If a server-side Git relay is needed later, create a clean bare repository such
as `/home/ubuntu/blog.git` instead of using `/var/www/blog`.

## Backup Notes

- Real tokens are intentionally excluded.
- The committed systemd service uses `EnvironmentFile=-/etc/blog-webhook.env`.
- Keep `BLOG_WEBHOOK_TOKEN` and `BLOG_GITHUB_TOKEN` only on the server.

## Health Check

After rebuilding or changing the server runtime, run:

```bash
node /var/www/blog/scripts/server-health-check.cjs
```

From a repository checkout you can also run:

```bash
npm run server:health
```

The script returns exit code `0` only when every check passes.
