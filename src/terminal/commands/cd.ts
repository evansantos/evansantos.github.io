import { defineCommand } from '../core/types.js';

const VALID_CWD = ['blog', 'projects', 'talks', 'uses'] as const;

export default defineCommand({
  name:     'cd',
  describe: 'change directory (blog, projects, talks, uses, ~)',
  run(args, ctx) {
    const target = args[0];

    if (!target || target === '~' || target === '/') {
      ctx.setState({ cwd: '~' });
      return { type: 'echo', text: '/home/evandro' };
    }

    if (target === '..') {
      ctx.setState({ cwd: '~' });
      return { type: 'echo', text: '/home/evandro' };
    }

    if (VALID_CWD.includes(target as typeof VALID_CWD[number])) {
      ctx.setState({ cwd: target });
      return { type: 'echo', text: `/home/evandro/${target}` };
    }

    return {
      type:     'error',
      text:     `cd: ${target}: No such file or directory`,
      code:     'ENOENT',
      hint:     `available: ${VALID_CWD.join(', ')}`,
      exitCode: 1,
    };
  },
  complete(partial) {
    return VALID_CWD.filter(d => d.startsWith(partial));
  },
});
