import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const blogPosts = await getCollection('blog');
  const lifePosts = await getCollection('life');

  const allPosts = [...blogPosts, ...lifePosts].sort((a, b) => {
    const dateA = a.data.pubDatetime || a.data.date;
    const dateB = b.data.pubDatetime || b.data.date;
    return dateB.valueOf() - dateA.valueOf();
  });

  return rss({
    title: "Zhimin · Notes",
    description: 'Writing down moments worth keeping',
    site: context.site,
    items: allPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDatetime || post.data.date,
      description: post.data.description,
      link: `/${post.collection}/${post.id}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}