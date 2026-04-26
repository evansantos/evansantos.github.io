import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'vim',
  describe: 'open vim',
  run() {
    return {
      type: 'echo',
      text: 'opening vim in vim... [no seriously, use: cat <file>]',
    };
  },
});
