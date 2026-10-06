import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';

/** Reject explicit test suppression; strings and comments are not test calls. */
export function testPolicyErrors(file, source) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const names = new Set(['test', 'it', 'describe', 't', 'context']);
  for (const statement of ast.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const item of statement.importClause.namedBindings.elements) {
        if (
          ['test', 'it', 'describe'].includes(
            item.propertyName?.text || item.name.text,
          )
        )
          names.add(item.name.text);
      }
    }
  }
  const errors = ast.parseDiagnostics.map(
    (item) =>
      `${file}: invalid test syntax: ${ts.flattenDiagnosticMessageText(item.messageText, ' ')}`,
  );
  function parts(expression) {
    if (ts.isIdentifier(expression)) return [expression.text];
    if (ts.isPropertyAccessExpression(expression))
      return [...parts(expression.expression), expression.name.text];
    if (
      ts.isElementAccessExpression(expression) &&
      ts.isStringLiteralLike(expression.argumentExpression)
    )
      return [
        ...parts(expression.expression),
        expression.argumentExpression.text,
      ];
    return [];
  }
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const chain = parts(node.expression);
      if (names.has(chain[0])) {
        for (const member of chain.slice(1)) {
          if (['only', 'skip', 'todo', 'fixme', 'fail'].includes(member))
            errors.push(`${file}: prohibited test.${member}`);
        }
        for (const argument of node.arguments.filter(
          ts.isObjectLiteralExpression,
        )) {
          for (const property of argument.properties) {
            const name = property.name
              ?.getText(ast)
              .replace(/^['"]|['"]$/g, '');
            if (
              ['only', 'skip', 'todo'].includes(name) &&
              (!ts.isPropertyAssignment(property) ||
                property.initializer.kind !== ts.SyntaxKind.FalseKeyword)
            )
              errors.push(`${file}: prohibited test option ${name}`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return errors;
}

async function walk(root, directory) {
  const result = [];
  for (const entry of await readdir(join(root, directory), {
    withFileTypes: true,
  })) {
    if (
      ['node_modules', '.git', 'dist', '.astro', 'vendor'].includes(entry.name)
    )
      continue;
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...(await walk(root, file)));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}

/** Discover actual tests recursively and compare them with the ownership registry. */
export async function collectTestPlan(root, modules) {
  const errors = [];
  const files = [
    ...(await walk(root, 'packages')),
    ...(await walk(root, 'tests')),
  ]
    .filter((file) => /\.(?:test|spec)\.[^/]+$/.test(file))
    .sort();
  const registered = new Set(modules.flatMap((module) => module.tests));
  const actual = new Set(files);
  const node = [];
  const browser = [];
  for (const file of files) {
    const isNode =
      /\.test\.(?:mjs|cjs)$/.test(file) &&
      (file.startsWith('tests/integration/') ||
        modules.some((module) => file.startsWith(module.testRoot + '/')));
    const isBrowser = /^tests\/e2e\/[^/]+\.spec\.mjs$/.test(file);
    if (!isNode && !isBrowser)
      errors.push(`${file}: unsupported test path or extension`);
    if (!registered.has(file)) errors.push(`${file}: unregistered test`);
    errors.push(
      ...testPolicyErrors(file, await readFile(join(root, file), 'utf8')),
    );
    if (isNode) node.push(file);
    if (isBrowser) browser.push(file);
  }
  for (const file of registered)
    if (!actual.has(file)) errors.push(`${file}: missing registered test`);
  for (const module of modules) {
    if (!node.some((file) => file.startsWith(module.testRoot + '/')))
      errors.push(`${module.id}: no module tests discovered`);
  }
  if (!node.some((file) => file.startsWith('tests/integration/')))
    errors.push('no integration tests discovered');
  if (!browser.length) errors.push('no browser tests discovered');
  return { node, browser, errors };
}

/** Runtime suppression is rejected even when a dynamic option bypasses the AST check. */
export function nodeResultErrors(output, status) {
  const errors =
    status === 0 ? [] : [`Node test process exited with status ${status}`];
  const clean = output.replace(/\u001b\[[\d;]*m/g, '');
  for (const name of ['tests', 'fail', 'cancelled', 'skipped', 'todo']) {
    const matches = [
      ...clean.matchAll(new RegExp(`^.*\\b${name} (\\d+)\\s*$`, 'gm')),
    ];
    const value = matches.at(-1)?.[1];
    if (value === undefined)
      errors.push(`Node test summary is missing ${name}`);
    else if (name === 'tests' ? Number(value) === 0 : Number(value) !== 0)
      errors.push(`Node test summary rejects ${name}=${value}`);
  }
  return errors;
}
