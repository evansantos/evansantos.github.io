import { defineCommand } from '../core/types.js';
import { BIO_TEXT } from '../data/bio.js';

export default defineCommand({
  name:     'bio',
  describe: 'short press-kit bio',
  run(args) {
    if (args.includes('--copy')) {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(BIO_TEXT);
      }
      return { type: 'echo', text: 'copied to clipboard.' };
    }
    return { type: 'echo', text: BIO_TEXT };
  },
});
