import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'rm',
  describe: 'remove files',
  run() {
    return {
      type: 'error',
      text: 'rm: operation not permitted — this site is all I have',
      exitCode: 1,
    };
  },
});
