const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('Operations owns one canonical service asset using the Publishing CLI', () => {
  const resolve = (path) => require('node:path').resolve(__dirname, path);
  const asset = resolve(
    '../../packages/operations/src/assets/blog-webhook.service',
  );
  assert.ok(
    fs.existsSync(asset),
    'canonical Operations service asset is missing',
  );
  assert.equal(
    fs.existsSync(resolve('../../scripts/blog-webhook.service')),
    false,
  );
  assert.equal(
    fs.existsSync(
      resolve(
        '../../packages/operations/docs/guides/server-runtime/blog-webhook.service.example',
      ),
    ),
    false,
  );
  assert.match(
    fs.readFileSync(asset, 'utf8'),
    /^ExecStart=\/usr\/bin\/node \/var\/www\/blog\/packages\/publishing\/src\/cli\/publish\.cjs$/m,
  );
});

test('service APIs exist independently of removed command implementations', () => {
  assert.ok(
    fs.existsSync(
      require.resolve('../../packages/publishing/src/api/index.cjs'),
    ),
  );
  assert.ok(
    fs.existsSync(
      require.resolve('../../packages/operations/src/api/index.cjs'),
    ),
  );
  for (const path of [
    '../../scripts/webhook-receiver.cjs',
    '../../scripts/server-health-check.cjs',
  ]) {
    assert.equal(
      fs.existsSync(require('node:path').resolve(__dirname, path)),
      false,
    );
  }
});

test('package roots expose one default task without starting external work on import', () => {
  const api = require('../../packages/publishing/src/api/index.cjs');
  assert.deepEqual(Object.keys(api).sort(), ['startServer']);
  const operations = require('../../packages/operations/src/api/index.cjs');
  assert.deepEqual(Object.keys(operations), ['runHealthChecks']);
});
