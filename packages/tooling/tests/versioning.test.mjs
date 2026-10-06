import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('private versions advance independently and update exact consumer dependencies without tags', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'myblog-version-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const json = (path, value) =>
    writeFile(join(root, path), JSON.stringify(value));
  await mkdir(join(root, '.changeset'));
  await mkdir(join(root, 'packages/producer'), { recursive: true });
  await mkdir(join(root, 'packages/consumer'), { recursive: true });
  await json('package.json', {
    name: 'fixture-root',
    version: '0.0.0',
    private: true,
    workspaces: ['packages/*'],
  });
  await json('package-lock.json', {
    name: 'fixture-root',
    version: '0.0.0',
    lockfileVersion: 3,
    packages: {},
  });
  const config = JSON.parse(
    await readFile(
      new URL('../../../.changeset/config.json', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(config.privatePackages, { version: true, tag: false });
  assert.deepEqual(config.fixed, []);
  assert.deepEqual(config.linked, []);
  await json('.changeset/config.json', config);
  await json('packages/producer/package.json', {
    name: '@fixture/producer',
    version: '0.1.0',
    private: true,
  });
  await json('packages/consumer/package.json', {
    name: '@fixture/consumer',
    version: '0.5.0',
    private: true,
    dependencies: { '@fixture/producer': '0.1.0' },
  });
  await writeFile(
    join(root, '.changeset/upgrade.md'),
    "---\n'@fixture/producer': minor\n---\nUpgrade producer.\n",
  );
  const cli = fileURLToPath(
    new URL('../../../node_modules/@changesets/cli/bin.js', import.meta.url),
  );
  const child = spawnSync(process.execPath, [cli, 'version'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const producer = JSON.parse(
    await readFile(join(root, 'packages/producer/package.json'), 'utf8'),
  );
  const consumer = JSON.parse(
    await readFile(join(root, 'packages/consumer/package.json'), 'utf8'),
  );
  assert.equal(producer.version, '0.2.0');
  assert.equal(consumer.version, '0.5.1');
  assert.equal(consumer.dependencies['@fixture/producer'], '0.2.0');
});
