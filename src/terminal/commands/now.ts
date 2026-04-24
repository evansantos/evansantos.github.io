import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'now',
  describe: 'what evan is doing right now',
  run(_args, ctx) {
    const { body } = ctx.store.now();
    return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Now' };
  },
});
