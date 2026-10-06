/** Operations boundary: definitions are inert; execution is explicitly requested. */
const {
  runHealthChecks: executeDefaultChecks,
} = require('../internal/execution.cjs');

/** Runs the configured production health-check profile. */
function runHealthChecks() {
  return executeDefaultChecks();
}

module.exports = { runHealthChecks };
