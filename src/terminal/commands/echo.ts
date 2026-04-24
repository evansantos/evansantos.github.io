import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'echo',
  describe: 'repeat text',
  run(args) {
    return { type: 'echo', text: args.join(' ') };
  },
});
