/**
 * 将探针执行结果格式化打印至标准输出 (stdout)。
 *
 * @param {{ok: boolean, results: Array<{id: string, label: string, ok: boolean, error?: string}>}} report
 * @returns {void}
 */
function printHealthReport(report) {
  for (const result of report.results) {
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${result.id} - ${result.label}`);
    if (!result.ok && result.error) {
      console.log(`  ${result.error}`);
    }
  }
}

module.exports = { printHealthReport };
