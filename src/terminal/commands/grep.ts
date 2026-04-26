import { defineCommand } from '../core/types.js';
import type { GrepMatch } from '../core/types.js';

const EXCERPT_WINDOW = 80;

export default defineCommand({
  name:     'grep',
  describe: 'search post content',
  run(args, ctx) {
    const pattern = args[0];
    if (!pattern) {
      return { type: 'error', text: 'grep: missing pattern', exitCode: 1 };
    }

    let re: RegExp;
    try {
      re = new RegExp(pattern, 'gi');
    } catch {
      return { type: 'error', text: `grep: invalid pattern: ${pattern}`, exitCode: 1 };
    }

    const { store, state } = ctx;
    const posts = store.posts(state.lang);
    const matches: GrepMatch[] = [];

    for (const post of posts) {
      // Search title first
      re.lastIndex = 0;
      const titleMatch = re.exec(post.title);
      if (titleMatch) {
        const start      = Math.max(0, titleMatch.index - EXCERPT_WINDOW);
        const end        = Math.min(post.title.length, titleMatch.index + titleMatch[0].length + EXCERPT_WINDOW);
        const excerpt    = post.title.slice(start, end);
        const matchStart = titleMatch.index - start;
        const matchEnd   = matchStart + titleMatch[0].length;
        matches.push({ slug: post.slug, title: post.title, excerpt, matchStart, matchEnd });
        continue;
      }

      // Search body
      re.lastIndex = 0;
      const bodyMatch = re.exec(post.body);
      if (bodyMatch) {
        const start      = Math.max(0, bodyMatch.index - EXCERPT_WINDOW);
        const end        = Math.min(post.body.length, bodyMatch.index + bodyMatch[0].length + EXCERPT_WINDOW);
        const excerpt    = post.body.slice(start, end);
        const matchStart = bodyMatch.index - start;
        const matchEnd   = matchStart + bodyMatch[0].length;
        matches.push({ slug: post.slug, title: post.title, excerpt, matchStart, matchEnd });
      }
    }

    return { type: 'grep-result', matches };
  },
});
