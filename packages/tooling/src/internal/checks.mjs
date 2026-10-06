import path from 'node:path';
import ts from 'typescript';

/**
 * @typedef {Object} ModuleDefinition
 * @property {string} id 模块唯一标识符
 * @property {string} root 模块根目录
 * @property {string[]} owns 模块拥有的路径前缀
 * @property {string[]} dependencies 允许依赖的模块标识符列表
 * @property {string[]} entries 模块暴露的公共 API 文件路径
 * @property {string[]} [applicationEntries] 本模块 cli/ 下的明确可执行文件路径
 * @property {string[]} tests 模块测试文件列表
 */

/**
 * 根据文件路径查找其所属的工程模块。
 *
 * @param {string} file 目标文件的相对路径
 * @param {ModuleDefinition[]} modules 模块清单列表
 * @returns {ModuleDefinition | undefined} 命中的模块定义，未归属任何模块时返回 undefined
 */
function owner(file, modules) {
  return modules.find((module) =>
    module.owns.some((prefix) =>
      prefix.endsWith('/') ? file.startsWith(prefix) : file === prefix,
    ),
  );
}

/**
 * 基于 TypeScript AST 静态解析源码中的模块导入语句，检测越权跨模块依赖与私有实现导入。
 * 针对 .astro 文件，自动提取 frontmatter 及 <script> 标签中的代码段分别递归校验。
 * 决策背景：采用 AST 语法解析而非正则表达式或文本搜索，彻底避免将注释、多行模板字符串中的词汇误判为真实 import。
 *
 * @param {string} file 待检查的文件路径
 * @param {string} source 文件源码文本
 * @param {ModuleDefinition[]} modules 模块契约配置列表
 * @returns {string[]} 检测到的非法依赖错误描述列表，为空表示检查通过
 */
export function dependencyErrors(file, source, modules) {
  if (file.endsWith('.astro')) {
    const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] || '';
    const scripts = [
      ...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi),
    ].map((match) => match[1]);
    return [frontmatter, ...scripts].flatMap((block) =>
      dependencyErrors(file.replace(/\.astro$/, '.ts'), block, modules),
    );
  }
  const errors = [];
  const from = owner(file, modules);
  if (!from) return [`${file}: code has no module owner`];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function check(specifier) {
    if (!specifier || !ts.isStringLiteralLike(specifier)) {
      errors.push(
        `${file}: computed module imports require an explicit static boundary`,
      );
      return;
    }
    const target = specifier.text;
    if (!target.startsWith('.')) {
      const to = modules.find(
        (module) =>
          module.packageName &&
          (target === module.packageName ||
            target.startsWith(module.packageName + '/')),
      );
      if (to) {
        if (to.id !== from.id && !from.dependencies.includes(to.id))
          errors.push(
            `${file}: ${from.id} cannot depend on ${to.id} (${target})`,
          );
        if (target !== to.packageName)
          errors.push(
            `${file}: package imports must use the root export (${target})`,
          );
      } else if (
        modules.some(
          (module) =>
            module.packageName?.startsWith('@') &&
            target.startsWith(module.packageName.split('/')[0] + '/'),
        )
      ) {
        errors.push(`${file}: unknown workspace package (${target})`);
      }
      if (/^(?:@\/|~\/|#|src\/|scripts\/|public\/)/.test(target))
        errors.push(
          `${file}: project alias imports must use explicit relative API paths`,
        );
      if (target.startsWith('astro:') && from.id !== 'site')
        errors.push(`${file}: Astro content belongs to site`);
      return;
    }
    const resolved = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), target.split('?')[0]),
    );
    const to = owner(resolved, modules);
    if (!to && /\.(?:mjs|cjs|js|ts|astro)$/.test(resolved)) {
      errors.push(`${file}: ${resolved} code has no module owner`);
      return;
    }
    if (to && to.id !== from.id) {
      if (!from.dependencies.includes(to.id))
        errors.push(
          `${file}: ${from.id} cannot depend on ${to.id} (${target})`,
        );
      else
        errors.push(
          `${file}: cross-package imports must use the package name, not a relative path (${target})`,
        );
    }
  }
  function visit(node) {
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const name = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : ts.isStringLiteralLike(node.argumentExpression)
          ? node.argumentExpression.text
          : null;
      const receiver = node.expression;
      if (
        name === 'BookRuntime' &&
        from.id !== 'book-runtime' &&
        ts.isIdentifier(receiver) &&
        ['window', 'globalThis'].includes(receiver.text)
      ) {
        const parent = node.parent;
        const member = ts.isPropertyAccessExpression(parent)
          ? parent.name.text
          : ts.isElementAccessExpression(parent) &&
              ts.isStringLiteralLike(parent.argumentExpression)
            ? parent.argumentExpression.text
            : null;
        if (parent.expression !== node || member !== 'API')
          errors.push(`${file}: do not capture the private Runtime namespace`);
      }
      if (
        ts.isPropertyAccessExpression(receiver) ||
        ts.isElementAccessExpression(receiver)
      ) {
        const namespace = ts.isPropertyAccessExpression(receiver)
          ? receiver.name.text
          : ts.isStringLiteralLike(receiver.argumentExpression)
            ? receiver.argumentExpression.text
            : null;
        const host = receiver.expression;
        if (
          ts.isIdentifier(host) &&
          ['window', 'globalThis'].includes(host.text) &&
          namespace === 'BookRuntime' &&
          from.id !== 'book-runtime' &&
          name !== 'API'
        )
          errors.push(
            `${file}: Runtime browser globals must use the public API namespace`,
          );
      }
    }
    if (
      from.id !== 'book-runtime' &&
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isIdentifier(node.initializer) &&
      ['window', 'globalThis'].includes(node.initializer.text) &&
      ts.isObjectBindingPattern(node.name)
    ) {
      for (const element of node.name.elements) {
        const key = element.propertyName || element.name;
        if (
          (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) &&
          key.text === 'BookRuntime'
        )
          errors.push(
            `${file}: do not destructure the private Runtime namespace`,
          );
      }
    }
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) check(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      check(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return errors;
}

/**
 * 校验全仓模块拓扑配置的完整性、归属正交性与依赖无环性。
 * 检查项包含：模块 ID 唯一性、所有权路径无重叠、公共导出位于 api/、依赖关系存在且构成有向无环图（DAG）。
 *
 * @param {ModuleDefinition[]} modules 模块清单
 * @returns {string[]} 检测到的拓扑错误信息列表，为空表示检查通过
 */
export function moduleErrors(modules) {
  const errors = [];
  const names = new Set();
  for (const module of modules) {
    const sourceRoot = module.sourceRoot || module.root;
    if (names.has(module.id)) errors.push(`duplicate module ${module.id}`);
    names.add(module.id);
    for (const file of module.applicationEntries || [])
      if (
        !file.startsWith(sourceRoot + '/cli/') ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:mjs|cjs|js)$/.test(
          file.slice((sourceRoot + '/cli/').length),
        )
      )
        errors.push(
          `${module.id}: application entry must be an exact file inside its cli/: ${file}`,
        );
    for (const prefix of module.owns || []) {
      if (prefix !== module.root + '/')
        errors.push(`${module.id}: ownership must stay under its root`);
      for (const other of modules) {
        if (other === module) continue;
        if (
          (other.owns || []).some(
            (p) => p === prefix || (p.endsWith('/') && prefix.startsWith(p)),
          )
        )
          errors.push(`${module.id}: overlapping ownership ${prefix}`);
      }
    }
    for (const file of module.entries || [])
      if (!file.startsWith(sourceRoot + '/api/'))
        errors.push(`${module.id}: public entry must be inside api/: ${file}`);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(module) {
    if (visiting.has(module.id)) {
      errors.push(`dependency cycle at ${module.id}`);
      return;
    }
    if (visited.has(module.id)) return;
    visiting.add(module.id);
    for (const name of module.dependencies) {
      const target = modules.find((item) => item.id === name);
      if (!target) errors.push(`${module.id}: missing dependency ${name}`);
      else visit(target);
    }
    for (const file of module.entries) {
      if (owner(file, modules)?.id !== module.id)
        errors.push(`${module.id}: entry ${file} has another owner`);
    }
    visiting.delete(module.id);
    visited.add(module.id);
  }
  modules.forEach(visit);
  return errors;
}

/**
 * 校验 Markdown 文本中的相对超链接，确保目标文件实际存在于文件系统中（防死链）。
 * 会过滤掉代码块（``` / ~~~）与内联反引号（`...`）内的字符，避免将代码片段误认为超链接。
 *
 * @param {string} file 当前文档文件相对路径
 * @param {string} markdown 文档源码内容
 * @param {(targetPath: string) => Promise<boolean>} exists 判断文件是否存在的异步谓词函数
 * @returns {Promise<string[]>} 不存在的无效链接列表
 */
export async function linkErrors(file, markdown, exists) {
  const errors = [];
  const text = markdown
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '');
  const destinations = [
    ...text.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g),
  ].map((match) => match[1] || match[2]);
  for (const target of destinations) {
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(target)) continue;
    const destination = decodeURIComponent(target.split('#')[0]);
    if (
      destination &&
      !(await exists(
        path.posix.normalize(
          path.posix.join(path.posix.dirname(file), destination),
        ),
      ))
    )
      errors.push(`${file}: ${target}`);
  }
  return errors;
}

/**
 * 根据权威 JSON Schema 和当前生产配置生成标准 Markdown 配置参考表格。
 *
 * @param {Record<string, any>} schema JSON Schema 规范定义对象
 * @param {Record<string, any>} config 当前配置实例对象
 * @param {string} [title='书籍配置参考'] 产物文档一级标题
 * @returns {string} 渲染完毕的 Markdown 表格与说明正文
 */
export function referenceMarkdown(schema, config, title = '书籍配置参考') {
  const rows = [];
  function walk(node, value, prefix = '') {
    for (const [key, field] of Object.entries(node.properties || {})) {
      const name = prefix ? `${prefix}.${key}` : key;
      const current = value?.[key];
      const constraints = [
        field.minimum !== undefined && `>= ${field.minimum}`,
        field.exclusiveMinimum !== undefined && `> ${field.exclusiveMinimum}`,
        field.maximum !== undefined && `<= ${field.maximum}`,
        field.enum && field.enum.join(', '),
      ]
        .filter(Boolean)
        .join('; ');
      const display =
        field.type === 'object' || field.type === 'array'
          ? '见配置'
          : (JSON.stringify(current) ?? '未配置');
      rows.push(
        `| \`${name}\` | ${field.type || 'any'} | ${(node.required || []).includes(key) ? '是' : '否'} | ${display.replaceAll('|', '\\|')} | ${constraints} | ${(field.description || '').replaceAll('|', '\\|').replaceAll('\n', ' ')} |`,
      );
      walk(field, current, name);
    }
  }
  walk(schema, config);
  return (
    `# ${title}\n\n状态：当前；由 Schema 和配置生成，请勿手工编辑。\n\n生成：\`npm run docs:generate\`。数值是当前配置，不是所有主题的默认值。\n\n<!-- prettier-ignore -->\n| 字段 | 类型 | 必填（相对父对象） | 当前值 | 约束 | 说明 |\n| --- | --- | --- | --- | --- | --- |\n` +
    rows.join('\n') +
    '\n'
  );
}
