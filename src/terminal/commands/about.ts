import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'about',
  describe: 'who is evan (long form)',
  run(_args, ctx) {
    const { body } = ctx.store.about(ctx.state.lang);
    return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'About' };
  },
});
