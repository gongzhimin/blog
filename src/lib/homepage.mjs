export function getPostDate(post) {
  return post.data.pubDatetime ?? post.data.date;
}

export function formatCatalogDate(date, pattern) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return pattern
    .replaceAll("YYYY", String(year))
    .replaceAll("MM", month)
    .replaceAll("DD", day);
}

export function buildCatalogEntries(posts, basePath, options) {
  return [...posts]
    .sort((a, b) => getPostDate(b).valueOf() - getPostDate(a).valueOf())
    .slice(0, options.wideMaximumEntries)
    .map((post, index) => {
      const date = getPostDate(post);

      return {
        title: post.data.title,
        href: `${basePath}/${post.id}`,
        date: formatCatalogDate(date, options.wideDateFormat),
        compactDate: formatCatalogDate(date, options.compactDateFormat),
        narrowHidden: index >= options.narrowMaximumEntries,
      };
    });
}
