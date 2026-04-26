import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'emacs',
  describe: 'open emacs',
  run() {
    return {
      type: 'echo',
      text: 'opening emacs in emacs... [no seriously, use: cat <file>]',
    };
  },
});
