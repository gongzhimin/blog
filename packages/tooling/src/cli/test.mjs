import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { collectTestPlan, nodeResultErrors } from '../internal/testing.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check'))
  throw new Error('Usage: node packages/tooling/src/cli/test.mjs [--check]');
const { modules } = JSON.parse(
  await readFile('packages/tooling/src/modules.json', 'utf8'),
);
const plan = await collectTestPlan(process.cwd(), modules);
if (plan.errors.length) {
  console.error(plan.errors.join('\n'));
  process.exitCode = 1;
} else if (args[0] === '--check') {
  console.log(
    `Test policy passed: ${plan.node.length} Node files, ${plan.browser.length} browser files`,
  );
} else {
  const child = spawn(
    process.execPath,
    ['--test', '--test-timeout=30000', '--test-reporter=spec', ...plan.node],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
    process.stdout.write(chunk);
  });
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on('close', (status) => {
    const errors = nodeResultErrors(output, status);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    }
  });
}
