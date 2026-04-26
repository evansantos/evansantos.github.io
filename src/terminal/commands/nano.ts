import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'nano',
  describe: 'open nano',
  run() {
    return {
      type: 'echo',
      text: 'opening nano in nano... [no seriously, use: cat <file>]',
    };
  },
});
