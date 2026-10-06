#!/usr/bin/env node
/**
 * @file packages/operations/src/cli/health.cjs
 * @description 生产服务器与发布通道探针健康检查 CLI 脚本。
 * 检查默认探针中的进程状态、环境文件/字段、监听端口和公网可达性。
 * 不检查证书剩余期限、磁盘空间或发布业务结果；退出码为 0（全部通过）或 1（失败/异常）。
 */
const { runHealthChecks } = require('../api/index.cjs');
const { printHealthReport: printReport } = require('../internal/report.cjs');

/**
 * 探针健康巡检主入口。
 *
 * @returns {Promise<void>}
 */
async function main() {
  const report = await runHealthChecks();
  printReport(report);
  process.exitCode = report.ok ? 0 : 1;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
