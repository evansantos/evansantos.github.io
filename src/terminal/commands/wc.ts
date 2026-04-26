import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'wc',
  describe: 'word/block count for a post',
  async run(args, ctx) {
    const slug = args[0];

    if (!slug) {
      return { type: 'error', text: 'wc: missing operand', exitCode: 1 };
    }

    const post = await ctx.store.loadPost(ctx.state.lang, slug);
    if (!post) {
      return {
        type: 'error', text: `wc: ${slug}: No such file or directory`,
        code: 'ENOENT', exitCode: 1,
      };
    }

    const blocks    = parseMarkdownBlocks(post.body);
    const wordCount = post.body.split(/\s+/).filter(Boolean).length;
    const charCount = post.body.length;

    return {
      type: 'echo',
      text: `${slug}: ${blocks.length} blocks  ${wordCount} words  ${charCount} chars  ~${post.readingTime} min read`,
    };
  },
});
