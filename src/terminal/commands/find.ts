import { defineCommand } from '../core/types.js';
import { parseFlags, globToRegex } from '../core/flags.js';
import type { Lang } from '../core/types.js';

export default defineCommand({
  name:     'find',
  describe: 'search posts by tag, language, date, or name glob',
  run(args, ctx) {
    const { flags, positional } = parseFlags(args);

    const dir = positional[0];
    if (!dir) {
      return { type: 'error', text: 'find: missing directory operand', exitCode: 1 };
    }

    if (dir !== 'blog' && dir !== '.') {
      return {
        type: 'error', text: `find: ${dir}: No such file or directory`,
        code: 'ENOENT', exitCode: 1,
      };
    }

    // Determine language scope
    let langFilter: Lang | undefined;
    if (typeof flags['lang'] === 'string') {
      const l = flags['lang'] as string;
      if (l !== 'en' && l !== 'pt') {
        return { type: 'error', text: `find: invalid -lang value: ${l}`, exitCode: 1 };
      }
      langFilter = l as Lang;
    }

    const effectiveLang: Lang = langFilter ?? ctx.state.lang;
    let posts = ctx.store.posts(effectiveLang);

    // -tag filter
    if (typeof flags['tag'] === 'string') {
      const tag = (flags['tag'] as string).toLowerCase();
      posts = posts.filter(p => p.tags.map(t => t.toLowerCase()).includes(tag));
    }

    // -name glob filter (matches against slug)
    if (typeof flags['name'] === 'string') {
      const nameRe = globToRegex(flags['name'] as string);
      posts = posts.filter(p => nameRe.test(p.slug));
    }

    // -after filter (inclusive)
    if (typeof flags['after'] === 'string') {
      const after = flags['after'] as string;
      posts = posts.filter(p => p.date >= after);
    }

    // -before filter (exclusive)
    if (typeof flags['before'] === 'string') {
      const before = flags['before'] as string;
      posts = posts.filter(p => p.date < before);
    }

    return {
      type:  'post-list',
      items: posts,
      meta:  {
        tag:  typeof flags['tag'] === 'string' ? flags['tag'] : undefined,
        lang: langFilter,
      },
    };
  },
});
