import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

test('Site snapshot CLI resolves its internal quote service and data relative to its own file', async () => {
  const cli = new URL('../src/cli/update-daily-quote.mjs', import.meta.url);
  const source = await readFile(cli, 'utf8');
  const ast = ts.createSourceFile(
    'update-daily-quote.mjs',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = ast.statements
    .filter(ts.isImportDeclaration)
    .map((node) => node.moduleSpecifier.text);
  assert.ok(imports.includes('../internal/quotes/daily-quote.mjs'));
  await access(new URL('../internal/quotes/daily-quote.mjs', cli));
  assert.match(
    source,
    /new URL\('\.\.\/data\/daily-quote\.json', import\.meta\.url\)/,
  );
  assert.equal(
    new URL('../data/daily-quote.json', cli).href,
    new URL('../src/data/daily-quote.json', import.meta.url).href,
  );
  assert.doesNotMatch(source, /scripts\/|\.\.\/src\/site/);
});

test('Site cover templates retain editable regions and resolve all local assets after relocation', async () => {
  for (const name of ['sprite-only.html', 'sprite-only-standalone.html']) {
    const url = new URL(
      '../src/tools/cover-generator/' + name,
      import.meta.url,
    );
    const dom = new JSDOM(await readFile(url, 'utf8'));
    try {
      assert.ok(dom.window.document.querySelector('#sprite'));
      assert.equal(
        dom.window.document.querySelectorAll('[contenteditable="true"]').length,
        4,
      );
      for (const element of dom.window.document.querySelectorAll(
        'image[href], link[href]',
      )) {
        const href = element.getAttribute('href');
        if (href.startsWith('data:')) continue;
        assert.ok(!href.includes('://'), 'cover assets must remain local');
        await access(new URL(href, url));
      }
    } finally {
      dom.window.close();
    }
  }
});
