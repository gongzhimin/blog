/**
 * 构造生产服务部署后的 7 项默认健康检查探针定义。
 *
 * @returns {Array<{id: string, label: string, command: string, retries?: number, retryDelayMs?: number, validate?: (res: {code: number, stdout: string, stderr: string}) => boolean}>}
 */
function buildHealthChecks() {
  return [
    {
      id: 'nginx-service',
      label: 'nginx is active',
      command: 'systemctl is-active nginx',
    },
    {
      id: 'webhook-service',
      label: 'blog webhook service is active',
      command: 'systemctl is-active blog-webhook.service',
    },
    {
      id: 'webhook-env-file',
      label: 'webhook env file exists',
      command: 'test -f /etc/blog-webhook.env',
    },
    {
      id: 'webhook-env-token',
      label: 'webhook token is configured',
      command: "sudo grep -q '^BLOG_WEBHOOK_TOKEN=' /etc/blog-webhook.env",
    },
    {
      id: 'webhook-env-github-token',
      label: 'GitHub token is configured',
      command: "sudo grep -q '^BLOG_GITHUB_TOKEN=' /etc/blog-webhook.env",
    },
    {
      id: 'local-webhook-port',
      label: 'local webhook port responds',
      command:
        "curl -sS --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:9000/webhook",
      retries: 8,
      retryDelayMs: 500,
      validate: ({ stdout }) => stdout.trim() === '404',
    },
    {
      id: 'public-homepage',
      label: 'public homepage responds',
      command: 'curl -fsS --max-time 10 https://zhimin.ink/ >/dev/null',
    },
  ];
}

module.exports = { buildHealthChecks };
