import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  runHealthChecks: runDefaultHealthChecks,
} = require('../src/api/index.cjs');
const { runHealthChecks } = require('../src/internal/execution.cjs');
const { buildHealthChecks } = require('../src/internal/probes.cjs');

test('server health checks cover the production runtime chain', () => {
  assert.deepEqual(Object.keys(require('../src/api/index.cjs')), [
    'runHealthChecks',
  ]);
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
    false,
  );
});

test('default health task takes no arguments', () => {
  assert.equal(runDefaultHealthChecks.length, 0);
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
    ],
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

test('default webhook retry budget exhausts nine attempts and keeps the last failure', async () => {
  let attempts = 0;
  const probe = buildHealthChecks().find(
    (check) => check.id === 'local-webhook-port',
  );
  const report = await runHealthChecks({
    checks: [{ ...probe, retryDelayMs: 0 }],
    runner: async () => ({
      code: 7,
      stdout: '',
      stderr: `attempt ${++attempts}`,
    }),
  });
  assert.equal(attempts, 9);
  assert.equal(report.ok, false);
  assert.equal(report.results[0].error, 'attempt 9');
});

test('empty health plan succeeds without invoking the runner', async () => {
  const report = await runHealthChecks({
    checks: [],
    runner: async () => {
      throw new Error('must not run');
    },
  });
  assert.deepEqual(report, { ok: true, results: [] });
});

test('runner and validator exceptions reject immediately without running later probes', async () => {
  for (const phase of ['runner', 'validator']) {
    const calls = [];
    await assert.rejects(
      runHealthChecks({
        checks: [
          {
            id: 'first',
            label: 'first',
            command: 'first',
            retries: 8,
            retryDelayMs: 0,
            validate: () => {
              if (phase === 'validator') throw new Error('validator failed');
              return true;
            },
          },
          { id: 'later', label: 'later', command: 'later' },
        ],
        runner: async (command) => {
          calls.push(command);
          if (phase === 'runner') throw new Error('runner failed');
          return { code: 0, stdout: '', stderr: '' };
        },
      }),
      new RegExp(`${phase} failed`),
    );
    assert.deepEqual(calls, ['first']);
  }
});
