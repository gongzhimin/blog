import { mkdtemp, cp, readFile, rm, mkdir, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repository = fileURLToPath(new URL('../../../../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'myblog-package-consumer-'));
function run(command, args, cwd) {
  const child = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (child.error || child.status !== 0)
    throw new Error(child.error?.message || child.stderr || child.stdout);
  return child.stdout;
}
try {
  const output = join(temp, 'tarballs');
  const consumer = join(temp, 'consumer');
  await mkdir(output);
  await mkdir(consumer);
  const packed = JSON.parse(
    run(
      'npm',
      [
        'pack',
        '--workspaces',
        '--json',
        '--ignore-scripts',
        '--pack-destination',
        output,
      ],
      repository,
    ),
  );
  const names = packed.map((item) => item.name);
  if (names.length !== 6 || new Set(names).size !== 6)
    throw new Error('Expected six unique workspace tarballs');
  await cp(
    join(repository, 'packages/tooling/tests/fixtures/isolated-consumer.mjs'),
    join(consumer, 'consumer.mjs'),
  );
  await cp(
    join(repository, 'packages/site/src/data/book-config.json'),
    join(consumer, 'config.json'),
  );
  await cp(
    join(repository, 'packages/tooling/tests/fixtures/public-api-contracts.ts'),
    join(consumer, 'contracts.mts'),
  );
  run(
    'npm',
    [
      'install',
      '--prefer-offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      ...packed.map((item) => join(output, item.filename)),
    ],
    consumer,
  );
  for (const name of names) {
    if ((await lstat(join(consumer, 'node_modules', name))).isSymbolicLink())
      throw new Error(name + ': workspace symlink is not a tarball consumer');
    const manifest = JSON.parse(
      await readFile(
        join(consumer, 'node_modules', name, 'package.json'),
        'utf8',
      ),
    );
    if (!manifest.private || Object.keys(manifest.exports).join() !== '.')
      throw new Error(name + ': unsafe package manifest');
  }
  process.stdout.write(
    run(
      process.execPath,
      [
        join(consumer, 'consumer.mjs'),
        join(consumer, 'config.json'),
        repository,
      ],
      consumer,
    ),
  );
  run(
    process.execPath,
    [
      join(consumer, 'node_modules/typescript/lib/tsc.js'),
      '--noEmit',
      '--strict',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--skipLibCheck',
      'false',
      join(consumer, 'contracts.mts'),
    ],
    consumer,
  );
  console.log(
    'Six packaged public declarations passed positive and negative compilation controls.',
  );
  const { modules } = JSON.parse(
    await readFile(
      join(repository, 'packages/tooling/src/modules.json'),
      'utf8',
    ),
  );
  const manifests = new Map();
  for (const module of modules) {
    const manifest = JSON.parse(
      await readFile(join(repository, module.root, 'package.json'), 'utf8'),
    );
    manifests.set(manifest.name, manifest);
  }
  const rootManifest = JSON.parse(
    await readFile(join(repository, 'package.json'), 'utf8'),
  );
  for (const name of names) {
    const selected = new Set();
    function select(current) {
      if (selected.has(current)) return;
      selected.add(current);
      for (const dependency of Object.keys(
        manifests.get(current).dependencies || {},
      ))
        if (manifests.has(dependency)) select(dependency);
    }
    select(name);
    const single = join(temp, name.split('/')[1]);
    await mkdir(single);
    await cp(
      join(
        repository,
        'packages/tooling/tests/fixtures/single-package-consumer.mjs',
      ),
      join(single, 'single.mjs'),
    );
    await cp(join(consumer, 'config.json'), join(single, 'config.json'));
    const tarballs = packed
      .filter((item) => selected.has(item.name))
      .map((item) => join(output, item.filename));
    const harness =
      name === '@myblog/book-runtime'
        ? ['jsdom@' + rootManifest.dependencies.jsdom]
        : name === '@myblog/publishing'
          ? ['typescript@' + rootManifest.dependencies.typescript]
          : [];
    run(
      'npm',
      [
        'install',
        '--prefer-offline',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        ...tarballs,
        ...harness,
      ],
      single,
    );
    for (const installed of selected)
      if (
        (await lstat(join(single, 'node_modules', installed))).isSymbolicLink()
      )
        throw new Error('Unexpected workspace symlink');
    if (name === '@myblog/publishing') {
      await cp(
        join(
          repository,
          'packages/tooling/tests/fixtures/publishing-contracts.mts',
        ),
        join(single, 'contracts.mts'),
      );
      run(
        process.execPath,
        [
          join(single, 'node_modules/typescript/lib/tsc.js'),
          '--noEmit',
          '--strict',
          '--module',
          'NodeNext',
          '--moduleResolution',
          'NodeNext',
          '--skipLibCheck',
          'false',
          join(single, 'contracts.mts'),
        ],
        single,
      );
      console.log(
        'Publishing-only public declarations passed without other workspace packages.',
      );
    }
    process.stdout.write(
      run(
        process.execPath,
        [
          join(single, 'single.mjs'),
          name,
          join(single, 'config.json'),
          repository,
        ],
        single,
      ),
    );
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
