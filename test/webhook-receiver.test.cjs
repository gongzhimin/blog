const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildGitHubLifePostPlan,
  loadGitHubRepositoryState,
  buildMobilePublication,
  publishFilesToGitHub,
} = require('../scripts/webhook-receiver.cjs');

test('overwrites the GitHub post with the same title and preserves its date', () => {
  const plan = buildGitHubLifePostPlan({
    posts: [
      {
        repoPath: 'src/content/life/2026-06-19-answer.md',
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

  assert.equal(plan.repoPath, 'src/content/life/2026-06-19-answer.md');
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

  assert.equal(plan.repoPath, 'src/content/life/2026-06-20-post-101.md');
  assert.match(plan.frontmatter, /date: 2026-06-20/);
  assert.match(plan.frontmatter, /Fresh content/);
});

test('keeps one GitHub post and deletes other posts with the same title', () => {
  const plan = buildGitHubLifePostPlan({
    posts: [
      {
        repoPath: 'src/content/life/2026-06-10-answer.md',
        content: '---\ntitle: "答案"\ndate: 2026-06-10\n---\n\nOld\n',
      },
      {
        repoPath: 'src/content/life/2026-06-20-answer.md',
        content: '---\ntitle: "答案"\ndate: 2026-06-20\n---\n\nNewer\n',
      },
    ],
    title: '答案',
    markdown: 'Updated content',
    date: '2026-06-20',
  });

  assert.equal(plan.repoPath, 'src/content/life/2026-06-20-answer.md');
  assert.deepEqual(plan.duplicateRepoPaths, [
    'src/content/life/2026-06-10-answer.md',
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
            path: 'src/content/life/existing.md',
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
          '---\ntitle: "答案"\ndate: 2026-06-19\n---\n\nOld\n'
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
      repoPath: 'src/content/life/existing.md',
      content: '---\ntitle: "答案"\ndate: 2026-06-19\n---\n\nOld\n',
    },
  ]);
  assert.equal(
    calls.some(([, pathname]) => pathname.includes('blog-blob')),
    false
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
          repoPath: 'src/content/life/existing.md',
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
      'src/content/life/existing.md',
    ]
  );
  assert.match(
    publication.files[1].content.toString('utf8'),
    /\/images\/mobile\/img-456-123\.png/
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
        repoPath: 'src/content/life/existing.md',
        content: Buffer.from('updated'),
      },
      {
        repoPath: 'src/content/life/server-only.md',
        delete: true,
      },
    ],
    'docs: mobile post [答案]',
    {
      headCommitSha: 'old-commit',
      baseTreeSha: 'old-tree',
      existingPaths: new Set(['src/content/life/existing.md']),
      posts: [],
    },
    request
  );

  const treeRequest = requests.find(
    ({ pathname }) => pathname.endsWith('/git/trees')
  );
  assert.deepEqual(treeRequest.body.tree, [
    {
      path: 'src/content/life/existing.md',
      mode: '100644',
      type: 'blob',
      sha: 'new-blob',
    },
  ]);
});
