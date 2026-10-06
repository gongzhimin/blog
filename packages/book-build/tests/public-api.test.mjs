import test from 'node:test';
import assert from 'node:assert/strict';
import * as bookBuild from '../src/api/index.mjs';

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
