import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'clear',
  describe: 'clear terminal',
  run() {
    return { type: 'clear' };
  },
});
