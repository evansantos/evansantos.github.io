import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'pwd',
  describe: 'print working directory',
  run(_args, ctx) {
    const { cwd } = ctx.state;
    return { type: 'echo', text: cwd === '~' ? '/home/evandro' : `/home/evandro/${cwd}` };
  },
});
