import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) =>
    data.lang === 'en' && !data.draft
  );

  const sorted = posts.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'evandro.dev — Blog',
    description: 'Writing about React, TypeScript, AI agents, and more.',
    site: context.site!,
    items: sorted.map(post => {
      const slug = post.id.replace('en/', '');
      return {
        title:       post.data.title,
        pubDate:     post.data.date as Date,
        description: post.data.dek,
        link:        `/en/blog/${slug}/`,
      };
    }),
    customData: '<language>en-us</language>',
  });
}
