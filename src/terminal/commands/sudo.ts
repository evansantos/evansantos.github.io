import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'sudo',
  describe: 'simulate elevated privileges (try: sudo make me a sandwich)',
  run(args, ctx) {
    const phrase = args.join(' ').toLowerCase();
    if (phrase === 'make me a sandwich') {
      const current = ctx.state.unlocked;
      const next = current.includes('sandwich') ? current : [...current, 'sandwich'];
      ctx.setState({ unlocked: next });
      return {
        type: 'echo',
        text: 'okay. 🥪  (theme "sandwich" unlocked — try: theme sandwich)',
      };
    }
    return {
      type:     'error',
      text:     `sudo: ${args[0] ?? '(empty)'}: command not found`,
      hint:     'this is a static site — there is no root. try: sudo make me a sandwich',
      code:     'EPERM',
      exitCode: 1,
    };
  },
});
