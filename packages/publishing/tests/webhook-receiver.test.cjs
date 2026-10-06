const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildGitHubLifePostPlan,
  buildMobilePublication,
} = require('../src/internal/planning.cjs');
const {
  loadGitHubRepositoryState,
  publishFilesToGitHub,
} = require('../src/internal/github.cjs');

for (const failedStage of ['blobs', 'trees', 'commits', 'refs']) {
  test(`publication stops after ${failedStage} rejection without later writes or automatic retry`, async () => {
    const calls = [];
    const failure = new Error(`injected ${failedStage} failure`);
    const request = async (method, pathname, body) => {
      const stage = pathname.match(/\/git\/(blobs|trees|commits|refs)/)[1];
      calls.push({ stage, method, body });
      if (stage === failedStage) throw failure;
      return { sha: `${stage}-sha` };
    };
    await assert.rejects(
      publishFilesToGitHub(
        [
          {
            repoPath: 'packages/site/src/content/life/probe.md',
            content: Buffer.from('synthetic'),
          },
        ],
        'synthetic publication',
        {
          headCommitSha: 'head',
          baseTreeSha: 'tree',
          existingPaths: new Set(),
          posts: [],
        },
        request,
      ),
      (error) => error === failure,
    );
    const stages = ['blobs', 'trees', 'commits', 'refs'];
    assert.deepEqual(
      calls.map((call) => call.stage),
      stages.slice(0, stages.indexOf(failedStage) + 1),
    );
    if (failedStage === 'refs') {
      assert.equal(calls.at(-1).method, 'PATCH');
      assert.equal(calls.at(-1).body.force, false);
    }
  });
}

test('truncated repository trees are rejected before reading blobs or planning writes', async () => {
  const calls = [];
  const request = async (method, pathname) => {
    calls.push(method);
    if (pathname.includes('/git/ref/')) return { object: { sha: 'head' } };
    if (pathname.includes('/git/commits/')) return { tree: { sha: 'tree' } };
    if (pathname.includes('/git/trees/')) return { truncated: true, tree: [] };
    throw new Error('unexpected request after truncated tree');
  };
  await assert.rejects(loadGitHubRepositoryState(request), /tree is truncated/);
  assert.deepEqual(calls, ['GET', 'GET', 'GET']);
});

test('Publishing package root exposes one task entry and starts nothing on import', () => {
  assert.deepEqual(Object.keys(require('../src/api/index.cjs')), [
    'startServer',
  ]);
});

test('overwrites the GitHub post with the same title and preserves its date', () => {
  const plan = buildGitHubLifePostPlan({
    posts: [
      {
        repoPath: 'packages/site/src/content/life/2026-06-19-answer.md',
        content: [
          '---',
          'title: "答案"',
          'description: "old"',
          'date: 2026-06-19',
          '---',
          '',
          'Old content',
          '',
        ].join('\n'),
      },
    ],
    title: '答案',
    markdown: 'New content',
    date: '2026-06-20',
  });

  assert.equal(
    plan.repoPath,
    'packages/site/src/content/life/2026-06-19-answer.md',
  );
  assert.match(plan.frontmatter, /date: 2026-06-19/);
  assert.match(plan.frontmatter, /New content/);
  assert.deepEqual(plan.duplicateRepoPaths, []);
});

test('creates a new GitHub post when no title match exists', () => {
  const plan = buildGitHubLifePostPlan({
    posts: [],
    title: '新的文章',
    markdown: 'Fresh content',
    date: '2026-06-20',
    randomSuffix: 101,
  });

  assert.equal(
    plan.repoPath,
    'packages/site/src/content/life/2026-06-20-post-101.md',
  );
  assert.match(plan.frontmatter, /date: 2026-06-20/);
  assert.match(plan.frontmatter, /Fresh content/);
});

test('keeps one GitHub post and deletes other posts with the same title', () => {
  const plan = buildGitHubLifePostPlan({
    posts: [
      {
        repoPath: 'packages/site/src/content/life/2026-06-10-answer.md',
        content: '---\ntitle: "答案"\ndate: 2026-06-10\n---\n\nOld\n',
      },
      {
        repoPath: 'packages/site/src/content/life/2026-06-20-answer.md',
        content: '---\ntitle: "答案"\ndate: 2026-06-20\n---\n\nNewer\n',
      },
    ],
    title: '答案',
    markdown: 'Updated content',
    date: '2026-06-20',
  });

  assert.equal(
    plan.repoPath,
    'packages/site/src/content/life/2026-06-20-answer.md',
  );
  assert.deepEqual(plan.duplicateRepoPaths, [
    'packages/site/src/content/life/2026-06-10-answer.md',
  ]);
});

test('loads life posts from the current GitHub tree', async () => {
  const calls = [];
  const request = async (method, pathname) => {
    calls.push([method, pathname]);

    if (pathname.includes('/git/ref/heads/')) {
      return { object: { sha: 'commit-sha' } };
    }
    if (pathname.endsWith('/git/commits/commit-sha')) {
      return { tree: { sha: 'tree-sha' } };
    }
    if (pathname.endsWith('/git/trees/tree-sha?recursive=1')) {
      return {
        tree: [
          {
            path: 'packages/site/src/content/life/existing.md',
            type: 'blob',
            sha: 'life-blob',
          },
          {
            path: 'src/content/blog/ignored.md',
            type: 'blob',
            sha: 'blog-blob',
          },
        ],
      };
    }
    if (pathname.endsWith('/git/blobs/life-blob')) {
      return {
        encoding: 'base64',
        content: Buffer.from(
          '---\ntitle: "答案"\ndate: 2026-06-19\n---\n\nOld\n',
        ).toString('base64'),
      };
    }

    throw new Error(`Unexpected GitHub request: ${method} ${pathname}`);
  };

  const state = await loadGitHubRepositoryState(request);

  assert.equal(state.headCommitSha, 'commit-sha');
  assert.equal(state.baseTreeSha, 'tree-sha');
  assert.deepEqual(state.posts, [
    {
      repoPath: 'packages/site/src/content/life/existing.md',
      content: '---\ntitle: "答案"\ndate: 2026-06-19\n---\n\nOld\n',
    },
  ]);
  assert.equal(
    calls.some(([, pathname]) => pathname.includes('blog-blob')),
    false,
  );
});

test('builds one atomic GitHub publication for markdown and embedded images', () => {
  const image = Buffer.from('image-bytes').toString('base64');
  const publication = buildMobilePublication({
    data: {
      html: [
        '<h1>答案</h1>',
        `<p>Updated</p><img src="data:image/png;base64,${image}">`,
      ].join(''),
    },
    repositoryState: {
      posts: [
        {
          repoPath: 'packages/site/src/content/life/existing.md',
          content: '---\ntitle: "答案"\ndate: 2026-06-19\n---\n\nOld\n',
        },
      ],
    },
    date: '2026-06-20',
    randomSuffix: 123,
    imageTimestamp: 456,
  });

  assert.equal(publication.commitMessage, 'docs: mobile post [答案]');
  assert.deepEqual(
    publication.files.map((file) => file.repoPath),
    [
      'public/images/mobile/img-456-123.png',
      'packages/site/src/content/life/existing.md',
    ],
  );
  assert.match(
    publication.files[1].content.toString('utf8'),
    /\/images\/mobile\/img-456-123\.png/,
  );
});

test('publishes shortcut markdown without flattening its formatting', () => {
  const publication = buildMobilePublication({
    data: {
      markdown: [
        '# 格式测试',
        '',
        '这是 **粗体** 和 *斜体*。',
        '',
        '> 这是一段引用。',
        '',
        '- 第一项',
        '- 第二项',
      ].join('\n'),
    },
    repositoryState: {
      posts: [],
    },
    date: '2026-06-20',
    randomSuffix: 321,
  });

  assert.equal(publication.commitMessage, 'docs: mobile post [格式测试]');
  assert.equal(
    publication.files[0].repoPath,
    'packages/site/src/content/life/2026-06-20-post-321.md',
  );
  const content = publication.files[0].content.toString('utf8');
  assert.doesNotMatch(content, /^# 格式测试$/m);
  assert.match(content, /这是 \*\*粗体\*\* 和 \*斜体\*。/);
  assert.match(content, /^> 这是一段引用。$/m);
  assert.match(content, /^- 第一项$/m);
  assert.match(content, /^- 第二项$/m);
});

test('uses the first markdown text line as title when there is no heading', () => {
  const publication = buildMobilePublication({
    data: {
      markdown: '普通标题\n\n正文第一段\n\n正文第二段',
    },
    repositoryState: {
      posts: [],
    },
    date: '2026-06-20',
    randomSuffix: 654,
  });

  assert.equal(publication.commitMessage, 'docs: mobile post [普通标题]');
  const content = publication.files[0].content.toString('utf8');
  assert.doesNotMatch(content, /^普通标题$/m);
  assert.match(content, /正文第一段\n\n正文第二段/);
});

test('converts raw shortcut text directly to markdown without escaping syntax', () => {
  const publication = buildMobilePublication({
    data: {
      raw: [
        '答案',
        '',
        '在高空盘旋，',
        '拒不降落。',
        '',
        '> 这是一段引用。',
        '',
        '**TODO**: 保留粗体',
        '',
        '- 第一项',
        '- 第二项',
        '',
        '[链接](https://example.com)',
      ].join('\n'),
    },
    repositoryState: {
      posts: [],
    },
    date: '2026-06-20',
    randomSuffix: 789,
  });

  assert.equal(publication.commitMessage, 'docs: mobile post [答案]');
  const content = publication.files[0].content.toString('utf8');
  assert.match(content, /在高空盘旋，  \n拒不降落。/);
  assert.match(content, /^> 这是一段引用。$/m);
  assert.match(content, /^\*\*TODO\*\*: 保留粗体$/m);
  assert.match(content, /^- 第一项$/m);
  assert.match(content, /^- 第二项$/m);
  assert.match(content, /^\[链接\]\(https:\/\/example\.com\)$/m);
  assert.doesNotMatch(content, /\\>|\\\*\\\*/);
});

test('replaces raw image placeholders with uploaded mobile image files', () => {
  const firstImage = Buffer.from('first-image').toString('base64');
  const secondImage = Buffer.from('second-image').toString('base64');
  const publication = buildMobilePublication({
    data: {
      raw: [
        '海边',
        '',
        '今天去了海边。',
        '',
        '[图片: 海边的风]',
        '',
        '后来天暗下来。',
        '',
        '[图：傍晚的云]',
      ].join('\n'),
      images: [
        {
          filename: 'sea view.JPG',
          mime: 'image/jpeg',
          base64: firstImage,
        },
        {
          filename: 'cloud.png',
          mime: 'image/png',
          base64: secondImage,
        },
      ],
    },
    repositoryState: {
      posts: [],
    },
    date: '2026-07-04',
    randomSuffix: 12,
    imageTimestamp: 999,
  });

  assert.deepEqual(
    publication.files.map((file) => file.repoPath),
    [
      'public/images/mobile/2026/07/img-999-012.jpg',
      'public/images/mobile/2026/07/img-999-013.png',
      'packages/site/src/content/life/2026-07-04-post-12.md',
    ],
  );
  assert.equal(publication.files[0].content.toString('utf8'), 'first-image');
  assert.equal(publication.files[1].content.toString('utf8'), 'second-image');
  const content = publication.files[2].content.toString('utf8');
  assert.match(
    content,
    /!\[海边的风\]\(\/images\/mobile\/2026\/07\/img-999-012\.jpg\)/,
  );
  assert.match(
    content,
    /!\[傍晚的云\]\(\/images\/mobile\/2026\/07\/img-999-013\.png\)/,
  );
  assert.doesNotMatch(content, /\[图片/);
  assert.doesNotMatch(content, /\[图/);
});

test('rejects raw mobile images when placeholder count does not match image count', () => {
  assert.throws(
    () =>
      buildMobilePublication({
        data: {
          raw: ['海边', '', '[图片: 海边的风]', '', '[图: 傍晚的云]'].join(
            '\n',
          ),
          images: [
            {
              filename: 'sea.jpg',
              mime: 'image/jpeg',
              base64: Buffer.from('sea').toString('base64'),
            },
          ],
        },
        repositoryState: {
          posts: [],
        },
        date: '2026-07-04',
      }),
    /Image placeholder count \(2\) does not match image count \(1\)/,
  );
});

test('rejects malformed mobile image payloads', () => {
  assert.throws(
    () =>
      buildMobilePublication({
        data: {
          raw: ['海边', '', '[图片: 海边的风]'].join('\n'),
          images: {
            filename: 'sea.jpg',
            mime: 'image/jpeg',
            base64: Buffer.from('sea').toString('base64'),
          },
        },
        repositoryState: {
          posts: [],
        },
        date: '2026-07-04',
      }),
    /Mobile images must be an array/,
  );
});

test('does not submit deletion entries for paths missing from the GitHub tree', async () => {
  const requests = [];
  const request = async (method, pathname, body) => {
    requests.push({ method, pathname, body });
    if (pathname.endsWith('/git/blobs')) {
      return { sha: 'new-blob' };
    }
    if (pathname.endsWith('/git/trees')) {
      return { sha: 'new-tree' };
    }
    if (pathname.endsWith('/git/commits')) {
      return { sha: 'new-commit' };
    }
    if (pathname.includes('/git/refs/heads/')) {
      return {};
    }
    throw new Error(`Unexpected GitHub request: ${method} ${pathname}`);
  };

  await publishFilesToGitHub(
    [
      {
        repoPath: 'packages/site/src/content/life/existing.md',
        content: Buffer.from('updated'),
      },
      {
        repoPath: 'packages/site/src/content/life/server-only.md',
        delete: true,
      },
    ],
    'docs: mobile post [答案]',
    {
      headCommitSha: 'old-commit',
      baseTreeSha: 'old-tree',
      existingPaths: new Set(['packages/site/src/content/life/existing.md']),
      posts: [],
    },
    request,
  );

  const treeRequest = requests.find(({ pathname }) =>
    pathname.endsWith('/git/trees'),
  );
  assert.deepEqual(treeRequest.body.tree, [
    {
      path: 'packages/site/src/content/life/existing.md',
      mode: '100644',
      type: 'blob',
      sha: 'new-blob',
    },
  ]);
});
