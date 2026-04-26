import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'exit',
  describe: 'exit shell',
  run() {
    return { type: 'echo', text: 'there is no exit. only ~' };
  },
});
