import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'date',
  describe: 'current date and time',
  run() {
    return { type: 'echo', text: new Date().toString() };
  },
});
