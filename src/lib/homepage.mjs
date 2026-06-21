export function getPostDate(post) {
  return post.data.pubDatetime ?? post.data.date;
}

export function formatCatalogDate(date, compact = false) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return compact ? `${month}.${day}` : `${year}.${month}.${day}`;
}

export function buildCatalogEntries(posts, basePath) {
  return [...posts]
    .sort((a, b) => getPostDate(b).valueOf() - getPostDate(a).valueOf())
    .slice(0, 6)
    .map((post, index) => {
      const date = getPostDate(post);

      return {
        title: post.data.title,
        href: `${basePath}/${post.id}`,
        date: formatCatalogDate(date),
        compactDate: formatCatalogDate(date, true),
        mobileHidden: index >= 3,
      };
    });
}
