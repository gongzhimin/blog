const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

test('Publishing CLI resolves its own API and explicitly starts one server', () => {
  const filename = require('node:path').resolve(
    __dirname,
    '../src/cli/publish.cjs',
  );
  const source = readFileSync(filename, 'utf8');
  const api = createRequire(filename).resolve('../api/index.cjs');
  assert.equal(api, require.resolve('../src/api/index.cjs'));
  let starts = 0;
  vm.runInNewContext(
    source,
    {
      require(request) {
        assert.equal(request, '../api/index.cjs');
        return {
          startServer() {
            starts++;
          },
        };
      },
    },
    { filename },
  );
  assert.equal(starts, 1);
});
