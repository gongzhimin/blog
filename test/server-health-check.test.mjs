import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  buildHealthChecks,
  runHealthChecks,
} = require('../scripts/server-health-check.cjs');

test('server health checks cover the production runtime chain', () => {
  const checks = buildHealthChecks();
  const ids = checks.map((check) => check.id);

  assert.deepEqual(ids, [
    'nginx-service',
    'webhook-service',
    'webhook-env-file',
    'webhook-env-token',
    'webhook-env-github-token',
    'local-webhook-port',
    'public-homepage',
  ]);
  assert.equal(
    checks.some((check) => check.command.includes('cat /etc/blog-webhook.env')),
    false
  );
});

test('server health checks report pass and fail without throwing early', async () => {
  const calls = [];
  const checks = [
    {
      id: 'ok-check',
      label: 'OK check',
      command: 'true',
    },
    {
      id: 'custom-check',
      label: 'Custom check',
      command: 'echo 404',
      validate: ({ stdout }) => stdout.trim() === '404',
    },
    {
      id: 'bad-check',
      label: 'Bad check',
      command: 'false',
    },
  ];
  const runner = async (command) => {
    calls.push(command);
    if (command === 'false') {
      return {
        code: 1,
        stdout: '',
        stderr: 'failed',
      };
    }
    return {
      code: 0,
      stdout: command === 'echo 404' ? '404\n' : '',
      stderr: '',
    };
  };

  const result = await runHealthChecks({ checks, runner });

  assert.deepEqual(calls, ['true', 'echo 404', 'false']);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.results.map((entry) => [entry.id, entry.ok]),
    [
      ['ok-check', true],
      ['custom-check', true],
      ['bad-check', false],
    ]
  );
  assert.equal(result.results[2].error, 'failed');
});

test('server health checks retry transient startup failures', async () => {
  let attempts = 0;
  const result = await runHealthChecks({
    checks: [
      {
        id: 'local-webhook-port',
        label: 'local webhook port responds',
        command: 'curl local webhook',
        retries: 2,
        retryDelayMs: 0,
        validate: ({ stdout }) => stdout.trim() === '404',
      },
    ],
    runner: async () => {
      attempts += 1;
      if (attempts === 1) {
        return {
          code: 7,
          stdout: '',
          stderr: "Couldn't connect to server",
        };
      }
      return {
        code: 0,
        stdout: '404',
        stderr: '',
      };
    },
  });

  assert.equal(attempts, 2);
  assert.equal(result.ok, true);
  assert.equal(result.results[0].ok, true);
});
