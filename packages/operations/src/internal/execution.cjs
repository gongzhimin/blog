const { exec } = require('node:child_process');
const { buildHealthChecks } = require('./probes.cjs');
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 异步执行底层 Shell 命令行并封装退出状态码与标准输入输出。
 *
 * @param {string} command 待执行的命令行字符串
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runShellCommand(command) {
  return new Promise((resolve) => {
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        code: typeof error?.code === 'number' ? error.code : error ? 1 : 0,
        stdout,
        stderr,
      });
    });
  });
}

/**
 * 顺序执行健康检查探针数组，支持探针独立配置重试次数与失败重试延迟。
 *
 * @param {Object} [options]
 * @param {Array<{id: string, label: string, command: string, retries?: number, retryDelayMs?: number, validate?: (res: {code: number, stdout: string, stderr: string}) => boolean}>} [options.checks]
 * @param {(cmd: string) => Promise<{code: number, stdout: string, stderr: string}>} [options.runner] 命令行执行器函数（支持单测注入）
 * @returns {Promise<{ok: boolean, results: Array<{id: string, label: string, ok: boolean, error: string}>}>}
 */
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

module.exports = { runHealthChecks };
