#!/usr/bin/env node

const { exec } = require('node:child_process');

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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runShellCommand(command) {
  return new Promise((resolve) => {
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        code:
          typeof error?.code === 'number'
            ? error.code
            : error
              ? 1
              : 0,
        stdout,
        stderr,
      });
    });
  });
}

async function runHealthChecks({
  checks = buildHealthChecks(),
  runner = runShellCommand,
} = {}) {
  const results = [];

  for (const check of checks) {
    const attempts = Math.max(1, Number(check.retries || 0) + 1);
    let result = null;
    let ok = false;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      result = await runner(check.command);
      ok =
        result.code === 0 &&
        (typeof check.validate === 'function' ? check.validate(result) : true);
      if (ok || attempt === attempts) {
        break;
      }
      await sleep(Number(check.retryDelayMs || 0));
    }

    const error = ok
      ? ''
      : (result.stderr || result.stdout || `exit code ${result.code}`).trim();

    results.push({
      id: check.id,
      label: check.label,
      ok,
      error,
    });
  }

  return {
    ok: results.every((result) => result.ok),
    results,
  };
}

function printHealthReport(report) {
  for (const result of report.results) {
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${result.id} - ${result.label}`);
    if (!result.ok && result.error) {
      console.log(`  ${result.error}`);
    }
  }
}

async function main() {
  const report = await runHealthChecks();
  printHealthReport(report);
  process.exitCode = report.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildHealthChecks,
  printHealthReport,
  runHealthChecks,
  runShellCommand,
};
