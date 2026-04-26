import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

const PAGER_THRESHOLD = 30;

export default defineCommand({
  name:     'cat',
  describe: 'read a post or page',
  async run(args, ctx) {
    const target = args[0];

    if (!target) {
      return { type: 'error', text: 'cat: missing operand', exitCode: 1 };
    }

    const { store, state } = ctx;

    const [dir, ...rest] = target.split('/');
    const isFromBlog = dir === 'blog' || (state.cwd === 'blog' && rest.length === 0);
    const slug = dir === 'blog' ? rest.join('/') : target;

    if (isFromBlog || state.cwd === 'blog') {
      const actualSlug = state.cwd === 'blog' && dir !== 'blog' ? target : slug;
      const post = await store.loadPost(state.lang, actualSlug);

      if (!post) {
        const post2 = store.post('en', actualSlug);
        if (post2 && state.lang === 'pt') {
          const blocks = parseMarkdownBlocks(post2.body);
          const type = blocks.length > PAGER_THRESHOLD ? 'pager' : 'post-view';
          if (type === 'pager') {
            return { type: 'pager', blocks, title: `${post2.title} [en]` };
          }
          return { type: 'post-view', post: post2 };
        }
        return {
          type: 'error', text: `cat: ${actualSlug}: No such file or directory`,
          code: 'ENOENT', exitCode: 1,
        };
      }

      const blocks = parseMarkdownBlocks(post.body);
      if (blocks.length > PAGER_THRESHOLD) {
        return { type: 'pager', blocks, title: post.title };
      }
      return { type: 'post-view', post };
    }

    if (target === 'uses') {
      const { body } = store.uses();
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Uses' };
    }
    if (target === 'about') {
      const { body } = store.about(state.lang);
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'About' };
    }
    if (target === 'now') {
      const { body } = store.now();
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Now' };
    }
    if (target === 'resume') {
      const { body } = store.resume();
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Resume' };
    }

    return {
      type: 'error', text: `cat: ${target}: No such file or directory`,
      code: 'ENOENT', exitCode: 1,
    };
  },
  complete(partial, ctx) {
    const { cwd, lang } = ctx.state;
    if (cwd === 'blog' || partial.startsWith('blog/')) {
      const prefix = partial.startsWith('blog/') ? 'blog/' : '';
      const slug   = partial.replace(/^blog\//, '');
      return ctx.store.posts(lang)
        .filter(p => p.slug.startsWith(slug))
        .map(p => `${prefix}${p.slug}`);
    }
    return [];
  },
});
