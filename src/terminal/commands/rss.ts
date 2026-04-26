import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'rss',
  describe: 'open RSS feed in new tab',
  run() {
    return { type: 'navigate', href: '/rss.xml', target: '_blank' };
  },
});
