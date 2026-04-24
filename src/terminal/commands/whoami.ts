import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'whoami',
  describe: 'who is this',
  run() {
    return { type: 'echo', text: 'evandro' };
  },
});
