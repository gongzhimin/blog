import "../model/book-types.mjs";

export function getPostDate(post) {
  return post.data.pubDatetime ?? post.data.date;
}

export function getBookEntryDate(entry) {
  return entry.date;
}

function toEntry(post, collection) {
  return {
    id: post.id,
    collection,
    title: post.data.title,
    date: getPostDate(post),
    body: post.body || "",
    bodyType: "markdown",
    metadata: post.data,
  };
}

export function createAstroBlogDocument({ lifePosts, blogPosts }) {
  const entries = [
    ...lifePosts
      .filter((post) => !post.data.draft)
      .map((post) => toEntry(post, "life")),
    ...blogPosts
      .filter((post) => !post.data.draft)
      .map((post) => toEntry(post, "blog")),
  ].sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return {
    id: "zhimin-blog",
    title: "Zhimin 的博客书",
    tocTitle: "目录",
    entries,
  };
}
