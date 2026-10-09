import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as bookBuild from '../src/api/index.mjs';

// Malformed image parsing runs outside the test runner with bounded resources.
function renderLocalImage(bytes) {
  const directory = mkdtempSync(join(tmpdir(), 'myblog-image-regression-'));
  try {
    mkdirSync(join(directory, 'public'));
    writeFileSync(join(directory, 'public', 'sample.img'), bytes);
    const entry = new URL('../src/api/index.mjs', import.meta.url).href;
    return spawnSync(
      process.execPath,
      [
        '--max-old-space-size=128',
        '--input-type=module',
        '-e',
        `import { renderArticle } from ${JSON.stringify(entry)};
         console.log(renderArticle({body:'![sample](/sample.img)\\n\\nAfter image.',title:'Example'}));`,
      ],
      {
        cwd: directory,
        encoding: 'utf8',
        timeout: 2000,
        killSignal: 'SIGKILL',
        maxBuffer: 65536,
      },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('renderArticle rejects a zero-length ICNS entry without blocking or losing text', () => {
  const bytes = Buffer.alloc(16);
  bytes.write('icns');
  bytes.writeUInt32BE(16, 4);
  bytes.write('ic07', 8);
  const result = renderLocalImage(bytes);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<img src="\/sample.img" alt="sample">/);
  assert.match(result.stdout, /After image\./);
});

test('renderArticle rejects a zero-size JXL partial stream without blocking or losing text', () => {
  const bytes = Buffer.alloc(36);
  bytes.writeUInt32BE(12, 0);
  bytes.write('JXL ', 4);
  bytes.writeUInt32BE(16, 12);
  bytes.write('ftyp', 16);
  bytes.write('jxl ', 20);
  bytes.write('jxlp', 32);
  const result = renderLocalImage(bytes);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<img src="\/sample.img" alt="sample">/);
  assert.match(result.stdout, /After image\./);
});

test('renderArticle still supplements dimensions for a valid local PNG', () => {
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6ioAAAAASUVORK5CYII=',
    'base64',
  );
  const result = renderLocalImage(bytes);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<img width="1" height="1" src="\/sample.img"/);
  assert.match(result.stdout, /After image\./);
});

test('Book Build exposes task operations through one package-root module', () => {
  assert.deepEqual(Object.keys(bookBuild).sort(), [
    'buildBook',
    'createBookTheme',
    'renderArticle',
  ]);
});

test('renderArticle removes the duplicate title and renders the remaining Markdown', () => {
  const html = bookBuild.renderArticle({
    body: '# Chapter title\n\n**Article body**',
    title: 'Chapter title',
  });

  assert.match(html, /<strong>Article body<\/strong>/);
  assert.doesNotMatch(html, /<h1>/);
});

test('createBookTheme transforms explicit CSS sources without filesystem access', () => {
  const theme = bookBuild.createBookTheme('classic-paper', {
    fontsCSS: '.fonts{}',
    bookContentCSS: '.sj-book .book-content{color:black}',
    codeHighlightCSS: '.hljs{color:blue}',
    bookTocCSS: '.sj-book .table-contents{color:gray}',
    katexCSS: '.katex{font-size:1em}',
  });

  assert.equal(theme.id, 'classic-paper');
  assert.match(theme.styles.visualCSS, /\.fonts\{\}/);
  assert.match(theme.measurement.articleCSS, /#__bap_inner\{color:black\}/);
  assert.throws(
    () => bookBuild.createBookTheme('classic-paper', {}),
    /Missing theme CSS source: fontsCSS/,
  );
});

test('theme optional KaTeX CSS defaults to empty and inherited theme names are rejected', () => {
  const sources = Object.freeze({
    fontsCSS: '.fonts{}',
    bookContentCSS: '.sj-book .book-content{}',
    codeHighlightCSS: '.hljs{}',
    bookTocCSS: '.sj-book .table-contents{}',
  });
  const theme = bookBuild.createBookTheme(undefined, sources);
  assert.equal(theme.id, 'classic-paper');
  assert.doesNotMatch(theme.styles.visualCSS, /undefined/);
  assert.doesNotMatch(theme.measurement.articleCSS, /undefined/);
  for (const id of ['__proto__', 'constructor', 'toString', 'missing'])
    assert.throws(
      () => bookBuild.createBookTheme(id, sources),
      /Unknown book theme/,
    );
  for (const invalid of [null, [], 'css'])
    assert.throws(
      () => bookBuild.createBookTheme('classic-paper', invalid),
      /sources must be an object/,
    );
  assert.throws(
    () =>
      bookBuild.createBookTheme('classic-paper', { ...sources, katexCSS: 42 }),
    /katexCSS must be a string/,
  );
  assert.throws(
    () => bookBuild.createBookTheme('plain-manuscript', sources),
    /surfaceCSS/,
  );
});
