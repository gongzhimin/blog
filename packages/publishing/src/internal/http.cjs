const http = require('node:http');
const { buildMobilePublication } = require('./planning.cjs');
const {
  loadGitHubRepositoryState,
  publishFilesToGitHub,
} = require('./github.cjs');

/**
 * 创建未监听的发布服务器；调用者负责 listen/close。
 * 队列由此实例持有，只串行化已通过 JSON body.token 鉴权的发布任务。
 *
 * @param {object} [options] 服务配置
 * @param {string} [options.token=process.env.BLOG_WEBHOOK_TOKEN] 非空白共享 token，保留原值比较
 * @param {Parameters<typeof loadGitHubRepositoryState>[0]} [options.request] GitHub 请求驱动
 * @returns {import('node:http').Server} 创建时不绑定端口，不发起 GitHub 请求
 * @throws {Error} token 缺失、全为空白或不是字符串时抛出
 */
function createWebhookServer({
  token = process.env.BLOG_WEBHOOK_TOKEN,
  request,
} = {}) {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('Missing required BLOG_WEBHOOK_TOKEN');
  }
  let pendingPublish = Promise.resolve();

  return http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/webhook') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const rawData = JSON.parse(body);
        const data = {};
        for (const key in rawData) {
          data[key.trim()] = rawData[key];
        }

        if (data.token !== token) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        const executePublish = async () => {
          const repositoryState = await loadGitHubRepositoryState(request);
          const publication = buildMobilePublication({
            data,
            repositoryState,
          });
          await publishFilesToGitHub(
            publication.files,
            publication.commitMessage,
            repositoryState,
            request,
          );
        };

        const currentTask = pendingPublish.then(executePublish, executePublish);
        pendingPublish = currentTask;
        await currentTask;

        res.statusCode = 200;
        res.end('Success');
      } catch (error) {
        console.error('WEBHOOK ERROR:', error);
        res.statusCode = 400;
        res.end(error && error.message ? error.message : 'Error');
      }
    });
  });
}

function startServer() {
  if (!process.env.BLOG_WEBHOOK_TOKEN) {
    throw new Error('Missing required BLOG_WEBHOOK_TOKEN environment variable');
  }

  const server = createWebhookServer();
  return server.listen(9000, '127.0.0.1');
}

module.exports = { createWebhookServer, startServer };
