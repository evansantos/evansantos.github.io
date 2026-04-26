import { defineCommand } from '../core/types.js';
import { parseFlags } from '../core/flags.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

const DEFAULT_N = 10;

export default defineCommand({
  name:     'tail',
  describe: 'show last N blocks of a post',
  async run(args, ctx) {
    const { flags, positional } = parseFlags(args);
    const slug = positional[0];

    if (!slug) {
      return { type: 'error', text: 'tail: missing operand', exitCode: 1 };
    }

    const n = typeof flags['n'] === 'string' ? parseInt(flags['n'], 10) : DEFAULT_N;

    const post = await ctx.store.loadPost(ctx.state.lang, slug);
    if (!post) {
      return {
        type: 'error', text: `tail: ${slug}: No such file or directory`,
        code: 'ENOENT', exitCode: 1,
      };
    }

    const allBlocks   = parseMarkdownBlocks(post.body);
    const sliced      = allBlocks.slice(-n);
    const trimmedBody = sliced.map(b => b.raw).join('\n\n');

    return { type: 'post-view', post: { ...post, body: trimmedBody } };
  },
});
