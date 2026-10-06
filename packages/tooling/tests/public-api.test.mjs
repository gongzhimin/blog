import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as tooling from '../src/api/index.mjs';

test('Tooling root exposes one read-only repository inspection task', () => {
  assert.deepEqual(Object.keys(tooling), ['inspectRepository']);
});

test('inspectRepository returns diagnostics for an invalid checkout without throwing', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'tooling-inspection-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = tooling.inspectRepository({ root, mode: 'docs' });

  assert.equal(result.ok, false);
  assert.equal(result.mode, 'docs');
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.diagnostics.every((item) => typeof item === 'string'));
  assert.equal(tooling.inspectRepository({ root: '' }).ok, false);
});
