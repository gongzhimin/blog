const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const test = require('node:test');
const { createWebhookServer } = require('../src/internal/http.cjs');

test('HTTP factory rejects missing, empty and non-string webhook tokens', () => {
  const previousToken = process.env.BLOG_WEBHOOK_TOKEN;
  delete process.env.BLOG_WEBHOOK_TOKEN;
  try {
    for (const token of [undefined, '', ' ', '\t', null, 0, false, {}, []]) {
      assert.throws(
        () => createWebhookServer({ token }),
        /Missing required BLOG_WEBHOOK_TOKEN/,
      );
    }
    assert.throws(
      () => createWebhookServer(),
      /Missing required BLOG_WEBHOOK_TOKEN/,
    );
  } finally {
    if (previousToken === undefined) delete process.env.BLOG_WEBHOOK_TOKEN;
    else process.env.BLOG_WEBHOOK_TOKEN = previousToken;
  }
});

function deferred() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function githubFixture(onRequest = async () => {}) {
  let head = 'head-0';
  let nextObject = 0;
  return async (method, path, body) => {
    await onRequest(method, path, body);
    if (method === 'GET' && path.includes('/git/ref/heads/')) {
      return { object: { sha: head } };
    }
    if (method === 'GET' && path.includes('/git/commits/')) {
      return { tree: { sha: 'base-tree' } };
    }
    if (method === 'GET' && path.includes('/git/trees/')) {
      return { truncated: false, tree: [] };
    }
    if (method === 'POST') return { sha: `object-${++nextObject}` };
    if (method === 'PATCH') {
      assert.equal(body.force, false);
      head = body.sha;
      return { object: { sha: head } };
    }
    throw new Error(`Unexpected fixture request: ${method} ${path}`);
  };
}

async function listen(t, request) {
  const server = createWebhookServer({ token: 'offline-test', request });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server;
}

function send(
  server,
  { method = 'POST', path = '/webhook', body, headers = {} } = {},
) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        method,
        path,
        headers: { 'Content-Type': 'application/json', ...headers },
        agent: false,
      },
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          text += chunk;
        });
        response.on('end', () =>
          resolve({ status: response.statusCode, text }),
        );
        response.on('error', reject);
      },
    );
    request.on('error', reject);
    request.end(typeof body === 'string' ? body : JSON.stringify(body || {}));
  });
}

test('HTTP accepts JSON body.token and trims top-level field names', async (t) => {
  let refUpdates = 0;
  const server = await listen(
    t,
    githubFixture(async (method) => {
      if (method === 'PATCH') refUpdates += 1;
    }),
  );
  const response = await send(server, {
    body: { ' token ': 'offline-test', title: '练习', raw: '正文' },
  });
  assert.deepEqual(response, { status: 200, text: 'Success' });
  assert.equal(refUpdates, 1);
});

test('HTTP rejects wrong token and Authorization without body.token before GitHub access', async (t) => {
  let calls = 0;
  const server = await listen(t, async () => {
    calls += 1;
    throw new Error('Unexpected GitHub access');
  });
  for (const input of [
    { body: { token: 'wrong', raw: '正文' } },
    {
      headers: { Authorization: 'Bearer offline-test' },
      body: { raw: '正文' },
    },
  ]) {
    assert.deepEqual(await send(server, input), {
      status: 403,
      text: 'Forbidden',
    });
  }
  assert.equal(calls, 0);
});

test('HTTP returns 400 for malformed JSON, planning errors and GitHub rejection', async (t) => {
  t.mock.method(console, 'error', () => {});
  let calls = 0;
  const server = await listen(
    t,
    githubFixture(async () => {
      calls += 1;
    }),
  );
  assert.equal((await send(server, { body: '{' })).status, 400);
  assert.equal(calls, 0);
  const invalidPlan = await send(server, {
    body: {
      token: 'offline-test',
      title: '练习',
      raw: '正文',
      images: [{ mime: 'image/png', base64: 'ZA==' }],
    },
  });
  assert.equal(invalidPlan.status, 400);
  assert.match(invalidPlan.text, /image/i);
  const failingServer = await listen(t, async () => {
    throw new Error('fixture upstream failure');
  });
  assert.deepEqual(
    await send(failingServer, {
      body: { token: 'offline-test', raw: '标题\n正文' },
    }),
    { status: 400, text: 'fixture upstream failure' },
  );
});

test('HTTP returns 404 for wrong method, unknown path and query suffix', async (t) => {
  let calls = 0;
  const server = await listen(t, async () => {
    calls += 1;
  });
  for (const input of [
    { method: 'GET' },
    { path: '/missing' },
    { path: '/webhook?x=1' },
  ]) {
    assert.deepEqual(await send(server, input), {
      status: 404,
      text: 'Not Found',
    });
  }
  assert.equal(calls, 0);
});

for (const failFirst of [false, true]) {
  test(`HTTP serializes publication per server and continues after first ${failFirst ? 'failure' : 'success'}`, async (t) => {
    t.mock.method(console, 'error', () => {});
    const firstPatch = deferred();
    const releasePatch = deferred();
    const secondBodyReceived = deferred();
    let refsRead = 0;
    let patches = 0;
    const server = await listen(
      t,
      githubFixture(async (method, path) => {
        if (method === 'GET' && path.includes('/git/ref/heads/')) refsRead += 1;
        if (method === 'PATCH' && ++patches === 1) {
          firstPatch.resolve();
          await releasePatch.promise;
          if (failFirst) throw new Error('fixture first publication failed');
        }
      }),
    );
    t.after(() => releasePatch.resolve());
    const first = send(server, {
      body: { token: 'offline-test', title: '第一篇', raw: '正文' },
    });
    await firstPatch.promise;
    server.once('request', (request) =>
      request.once('end', () => secondBodyReceived.resolve()),
    );
    const second = send(server, {
      body: { token: 'offline-test', title: '第二篇', raw: '正文' },
    });
    await secondBodyReceived.promise;
    assert.equal(
      refsRead,
      1,
      'second publication must not read its snapshot while first PATCH is pending',
    );
    releasePatch.resolve();
    assert.equal((await first).status, failFirst ? 400 : 200);
    assert.equal((await second).status, 200);
    assert.equal(refsRead, 2);
    assert.equal(patches, 2);
  });
}
