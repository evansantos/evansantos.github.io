import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'resume',
  describe: 'CV / resume',
  run(args, ctx) {
    if (args.includes('--print')) {
      return { type: 'navigate', href: '/evandro-cv.pdf', target: '_blank' };
    }
    const { body } = ctx.store.resume();
    return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Resume' };
  },
});
