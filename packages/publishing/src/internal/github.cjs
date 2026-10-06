/**
 * @file github.cjs — 基于 GitHub Git Database REST API 的低级别版本库交互驱动。
 *
 * 职能：
 * 1. 查询目标分支 HEAD Commit 与当前工作区 Git Tree；
 * 2. 读取 packages/site/src/content/life/*.md 历史博文 Blob 内容用于增量更新规划；
 * 3. 构造新 Blob、Tree、Commit 并通过非强制快进模式（force: false）更新分支引用。
 */
const GITHUB_REPO = process.env.BLOG_GITHUB_REPO || 'gongzhimin/blog';
const GITHUB_BRANCH = process.env.BLOG_GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.BLOG_GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';
const LIFE_POST_PREFIX = 'packages/site/src/content/life/';

/**
 * 将 Buffer 或字符串转换为 Base64 编码字符串。
 *
 * @param {Buffer | string} buffer
 * @returns {string}
 */
function toBase64(buffer) {
  return Buffer.isBuffer(buffer)
    ? buffer.toString('base64')
    : Buffer.from(buffer).toString('base64');
}

/**
 * 组装 GitHub 仓库级 REST API 的相对请求路径。
 *
 * @param {string} pathname 路径（如 '/git/trees'）
 * @returns {string} 完整的仓库 API 相对路径
 * @throws {Error} 当环境变量 BLOG_GITHUB_REPO 未包含 owner/repo 格式时抛出
 */
function repositoryApiPath(pathname) {
  const [owner, repo] = GITHUB_REPO.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid BLOG_GITHUB_REPO: ${GITHUB_REPO}`);
  }

  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${pathname}`;
}

/**
 * 执行经过 Bearer Token 认证的 GitHub REST API HTTP 请求。
 *
 * @param {'GET' | 'POST' | 'PATCH'} method HTTP 请求方法
 * @param {string} pathname 相对路径
 * @param {Record<string, unknown>} [body] JSON 请求体
 * @returns {Promise<any>} 解析后的响应体对象
 * @throws {Error} 当缺少 GITHUB_TOKEN 或 GitHub 响应状态码为非 2xx 时抛出
 */
async function githubRequest(method, pathname, body) {
  if (!GITHUB_TOKEN) {
    throw new Error('Missing BLOG_GITHUB_TOKEN');
  }

  const response = await fetch(`${GITHUB_API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && payload.message
        ? payload.message
        : text || `GitHub API error (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

/**
 * 读取远端 GitHub 仓库的当前 HEAD 状态与 life 集合博文列表。
 *
 * @param {typeof githubRequest} [request=githubRequest] 可注入的 HTTP 请求驱动函数（用于单测）
 * @returns {Promise<{headCommitSha: string, baseTreeSha: string, existingPaths: Set<string>, posts: Array<{repoPath: string, content: string}>}>}
 */
async function loadGitHubRepositoryState(request = githubRequest) {
  const ref = await request(
    'GET',
    repositoryApiPath(`/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`),
  );
  const headCommitSha = ref.object.sha;
  const headCommit = await request(
    'GET',
    repositoryApiPath(`/git/commits/${headCommitSha}`),
  );
  const baseTreeSha = headCommit.tree.sha;
  const tree = await request(
    'GET',
    repositoryApiPath(`/git/trees/${baseTreeSha}?recursive=1`),
  );

  if (tree.truncated) {
    throw new Error('GitHub repository tree is truncated');
  }

  const treeEntries = Array.isArray(tree.tree) ? tree.tree : [];
  const lifeEntries = treeEntries.filter(
    (entry) =>
      entry.type === 'blob' &&
      entry.path.startsWith(LIFE_POST_PREFIX) &&
      entry.path.endsWith('.md'),
  );
  const posts = await Promise.all(
    lifeEntries.map(async (entry) => {
      const blob = await request(
        'GET',
        repositoryApiPath(`/git/blobs/${entry.sha}`),
      );
      if (blob.encoding !== 'base64') {
        throw new Error(`Unsupported GitHub blob encoding: ${blob.encoding}`);
      }

      return {
        repoPath: entry.path,
        content: Buffer.from(
          blob.content.replace(/\s/g, ''),
          'base64',
        ).toString('utf8'),
      };
    }),
  );

  return {
    headCommitSha,
    baseTreeSha,
    existingPaths: new Set(treeEntries.map((entry) => entry.path)),
    posts,
  };
}

/**
 * 将变更文件列表提交至 GitHub 并前移分支指针。
 *
 * 决策背景与不变量：
 * 1. 使用 Git 底层 Data API（Blob -> Tree -> Commit -> Ref），绕过工作区 Clone；
 * 2. 严格禁止强制推送（force: false），确保 Git 分支只能执行快进提交（Fast-Forward）；
 *    外部写入或独立服务器可能推进分支，上游拒绝非快进更新时错误向调用者传播。
 *    HTTP 实例队列不覆盖此函数的直接调用，也不提供自动重试。
 *
 * @param {Array<{repoPath: string, content?: string | Buffer, delete?: boolean}>} files 待创建或删除的文件清单
 * @param {string} commitMessage 提交日志信息
 * @param {Object} [repositoryState] 预先查询的仓库 HEAD 状态（可选，缺省时自动查询）
 * @param {typeof githubRequest} [request=githubRequest] 请求驱动函数
 * @returns {Promise<void>}
 */
async function publishFilesToGitHub(
  files,
  commitMessage,
  repositoryState,
  request = githubRequest,
) {
  const state = repositoryState || (await loadGitHubRepositoryState(request));
  const validFiles = files.filter(
    (file) => !file.delete || state.existingPaths.has(file.repoPath),
  );
  const treeEntries = [];

  for (const file of validFiles) {
    if (file.delete) {
      treeEntries.push({
        path: file.repoPath,
        mode: '100644',
        type: 'blob',
        sha: null,
      });
      continue;
    }

    const blob = await request('POST', repositoryApiPath('/git/blobs'), {
      content: toBase64(file.content),
      encoding: 'base64',
    });
    treeEntries.push({
      path: file.repoPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const tree = await request('POST', repositoryApiPath('/git/trees'), {
    base_tree: state.baseTreeSha,
    tree: treeEntries,
  });
  const commit = await request('POST', repositoryApiPath('/git/commits'), {
    message: commitMessage,
    tree: tree.sha,
    parents: [state.headCommitSha],
  });
  await request(
    'PATCH',
    repositoryApiPath(`/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`),
    {
      sha: commit.sha,
      // 只允许快进；上游冲突状态经 transport 抛错，由 HTTP 层映射为 400。
      force: false,
    },
  );
}

module.exports = {
  githubRequest,
  loadGitHubRepositoryState,
  publishFilesToGitHub,
};
