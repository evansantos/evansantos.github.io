import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) =>
    data.lang === 'pt' && !data.draft
  );

  const sorted = posts.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'evandro.dev — Blog',
    description: 'Escrevendo sobre React, TypeScript, agentes de IA e mais.',
    site: context.site!,
    items: sorted.map(post => {
      const slug = post.id.replace('pt/', '');
      return {
        title:       post.data.title,
        pubDate:     post.data.date as Date,
        description: post.data.dek,
        link:        `/pt/blog/${slug}/`,
      };
    }),
    customData: '<language>pt-br</language>',
  });
}
