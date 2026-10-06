import yaml from 'js-yaml';

export const chapters = {
  index: ['阅读路径', '资料清单', '维护规则'],
  decision: ['背景', '备选方案', '决定', '后果', '再评估条件'],
  record: ['范围', '实施记录', '验证证据', '剩余限制'],
  readme: [
    '用途与边界',
    '能力与限制',
    '内部结构',
    '依赖与数据流',
    '主要接口',
    '最小使用示例',
    '配置',
    '测试与验证',
    '文档导航',
  ],
  architecture: [
    '问题与目标',
    '范围与约束',
    '系统上下文',
    '模块与依赖',
    '数据与契约',
    '运行与部署',
    '设计取舍',
    '风险与验证',
  ],
  module: [
    '问题与目标',
    '范围与约束',
    '内部组成',
    '数据与接口',
    '关键流程',
    '设计取舍',
    '失败与边界',
    '验证与演进',
  ],
  algorithm: [
    '问题定义',
    '输入与输出',
    '数据结构',
    '算法步骤',
    '边界与失败',
    '复杂度',
    '正确性依据',
    '测试案例',
  ],
  interface: [
    '适用范围',
    '接口清单',
    '输入与配置',
    '输出与副作用',
    '错误与边界',
    '兼容与示例',
    '验证与关联',
  ],
  testing: [
    '目标与范围',
    '测试分层',
    '环境与数据',
    '用例与断言',
    '执行步骤',
    '通过与退出条件',
    '证据与限制',
  ],
  guide: [
    '目标与适用条件',
    '前置条件',
    '输入与配置',
    '操作步骤',
    '结果核对',
    '失败与恢复',
    '关联资料',
  ],
  tutorial: [
    '学习目标',
    '准备环境',
    '练习输入',
    '练习步骤',
    '预期结果',
    '排错与清理',
    '后续阅读',
  ],
  standard: [
    '目的与范围',
    '规则与要求',
    '执行流程',
    '正反例',
    '例外与限制',
    '检查与验收',
    '关联资料',
  ],
};

/**
 * 解析 Markdown 文件的 YAML 头部元数据（Frontmatter）。
 *
 * @param {string} source Markdown 源码文本
 * @returns {Record<string, any>} 解析后的元数据对象
 * @throws {Error} 当缺少 frontmatter 分隔符或 YAML 格式不合法时抛出
 */
export function metadata(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('missing frontmatter');
  const value = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid metadata');
  return value;
}

/**
 * 校验文档的九字段元数据、固定章节结构、纯文本图表规范以及单一主标题约束。
 * 检查元数据及字段顺序、日期、类型章节，并拒绝 Mermaid 围栏、
 * 当前资料的已知过时清单引用和 shell 示例中的危险恢复模式。
 * 不证明技术语义或所有命令安全；历史资料仍接受结构检查但跳过定向风险扫描。
 *
 * @param {string} file 文档路径
 * @param {string} source 文档源码文本
 * @returns {string[]} 检测到的文档规范违规信息列表
 */
export function documentErrors(file, source) {
  const errors = [];
  if (/^ {0,3}(?:`{3,}|~{3,})mermaid\b/im.test(source))
    errors.push(file + ': diagrams must use ASCII text');
  let meta;
  try {
    meta = metadata(source);
  } catch (error) {
    return [file + ': ' + error.message];
  }
  const fields = [
    'id',
    'type',
    'status',
    'created',
    'modified',
    'scope',
    'owner',
    'parent',
    'related',
  ];
  if (JSON.stringify(Object.keys(meta)) !== JSON.stringify(fields))
    errors.push(file + ': metadata field order must be ' + fields.join(' / '));
  if (
    meta.status !== 'historical' &&
    /\bengineering\.modules\.json\b/.test(source)
  )
    errors.push(
      file + ': obsolete manifest path; use packages/tooling/src/modules.json',
    );
  if (meta.status !== 'historical' && /\]\(\s*<?file:\/\//i.test(source))
    errors.push(
      file + ': machine-local file URL; use repository-relative links',
    );
  for (const key of fields) {
    if (key === 'related') {
      if (
        !Array.isArray(meta[key]) ||
        meta[key].some((v) => typeof v !== 'string' || !v)
      )
        errors.push(file + ': invalid related');
    } else if (typeof meta[key] !== 'string' || !meta[key].trim())
      errors.push(file + ': invalid ' + key);
  }
  for (const key of Object.keys(meta))
    if (!fields.includes(key)) errors.push(file + ': unknown metadata ' + key);
  if (
    typeof meta.id !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.id)
  )
    errors.push(file + ': invalid id');
  if (typeof meta.parent !== 'string' || !meta.parent.endsWith('.md'))
    errors.push(file + ': parent must be a document path');
  for (const key of ['created', 'modified']) {
    const value = meta[key];
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    )
      errors.push(file + ': invalid ' + key);
  }
  if (meta.created > meta.modified)
    errors.push(file + ': modified precedes created');
  if (!['active', 'draft', 'deprecated', 'historical'].includes(meta.status))
    errors.push(file + ': invalid status');
  const extraTypes = ['index', 'decision', 'record', 'agent'];
  if (meta.type === 'redirect')
    errors.push(file + ': redirect documents are forbidden');
  if (!chapters[meta.type] && !extraTypes.includes(meta.type))
    errors.push(file + ': invalid type');
  let fence = null;
  let shell = false;
  const body = source
    .split('\n')
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        // Check command-position examples, not prose or commented prohibitions.
        // This is a targeted guard, not a shell parser or general safety proof.
        if (
          shell &&
          meta.status !== 'historical' &&
          /^\s*(?:sudo\s+)?git\s+(?:clean\b|reset\b[^\n]*--hard\b|checkout\s+--(?:\s|$))/.test(
            line,
          )
        )
          errors.push(file + ': unsafe recovery command in shell example');
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = null;
        return 'code';
      }
      if (marker) {
        fence = marker[1];
        shell = /^(?:sh|bash|shell)\s*$/.test(marker[2].trim());
        return 'code';
      }
      return line;
    })
    .join('\n');
  const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  if ([...body.matchAll(/^# (.+)$/gm)].length !== 1)
    errors.push(file + ': expected exactly one main title');
  for (const match of body.matchAll(
    /^## (.+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm,
  )) {
    if (!match[2].trim()) errors.push(file + ': empty section ' + match[1]);
  }
  if (
    chapters[meta.type] &&
    JSON.stringify(headings) !== JSON.stringify(chapters[meta.type])
  )
    errors.push(file + ': chapters must be ' + chapters[meta.type].join(' / '));
  return errors;
}

/**
 * 校验模块级文档的目录存放规范、文档类型匹配度、归属职责范围及上位文档归属。
 * 检查项包括：文档目录与类型的严格映射（如 algorithms -> algorithm）、scope 必须匹配所属模块、
 * parent 上位文档必须属于本模块的 README 或内部受控文档。
 *
 * @param {string} file 待检查的文件相对路径
 * @param {string} source 文件源码文本
 * @param {import('./checks.mjs').ModuleDefinition[]} modules 模块清单定义
 * @returns {string[]} 检测到的模块文档违背规则列表
 */
export function moduleDocumentErrors(file, source, modules) {
  const module = modules.find((m) => file.startsWith(m.root + '/'));
  if (!module) return [];
  let meta;
  try {
    meta = metadata(source);
  } catch {
    return [];
  }
  const relative = file.slice(module.root.length + 1);
  const exact = { 'README.md': 'readme', 'docs/README.md': 'index' };
  const directories = {
    explanation: 'module',
    algorithms: 'algorithm',
    reference: 'interface',
    guides: 'guide',
    tutorials: 'tutorial',
    testing: 'testing',
  };
  const expected =
    exact[relative] ||
    (relative.startsWith('docs/') && directories[relative.split('/')[1]]);
  const errors = [];
  if (!expected) errors.push(file + ': invalid module documentation directory');
  else if (meta.type !== expected)
    errors.push(file + ': directory requires type ' + expected);
  if (![module.id, module.root].includes(meta.scope))
    errors.push(file + ': scope does not match module ownership');
  if (
    file !== module.root + '/README.md' &&
    meta.parent !== module.root + '/README.md' &&
    !meta.parent?.startsWith(module.root + '/docs/')
  )
    errors.push(file + ': parent must belong to the module');
  return errors;
}

/**
 * 遍历所有文档的 parent 指针，检测文档层级关系中的循环引用闭环。
 * 不变量：全仓仅允许根目录 README.md 以自身为 parent（自环根节点），其他任何文档均必须构成无环树。
 *
 * @param {Map<string, { parent: string }>} documents 全仓文档路径与其元数据映射字典
 * @returns {string[]} 检测到的循环父级错误信息列表
 */
export function parentErrors(documents) {
  const errors = [];
  for (const [file] of documents) {
    const seen = new Set();
    let current = file;
    while (documents.has(current)) {
      if (current === 'README.md' && documents.get(current).parent === current)
        break;
      if (seen.has(current)) {
        errors.push(file + ': parent cycle at ' + current);
        break;
      }
      seen.add(current);
      current = documents.get(current).parent;
    }
  }
  return errors;
}
