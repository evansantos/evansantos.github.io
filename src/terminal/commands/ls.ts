import { defineCommand } from '../core/types.js';

const ROOT_LISTING = [
  'blog/',
  'projects/',
  'talks/',
  'uses',
  'about',
  'now',
  'resume',
].join('  ');

export default defineCommand({
  name:     'ls',
  describe: 'list directory contents',
  run(args, ctx) {
    const { cwd, lang } = ctx.state;
    const target = args[0] ?? cwd;

    if (target === '~' || (target === cwd && cwd === '~')) {
      return { type: 'echo', text: ROOT_LISTING };
    }

    if (target === 'blog' || (target === cwd && cwd === 'blog')) {
      const posts = ctx.store.posts(lang);
      return { type: 'post-list', items: posts };
    }

    if (target === 'projects' || (target === cwd && cwd === 'projects')) {
      const projects = ctx.store.projects();
      if (projects.length === 0) {
        return { type: 'echo', text: '(empty)' };
      }
      return { type: 'project-list', items: projects };
    }

    if (target === 'talks' || (target === cwd && cwd === 'talks')) {
      const talks = ctx.store.talks();
      if (talks.length === 0) {
        return { type: 'echo', text: '(empty)' };
      }
      return {
        type:    'table',
        columns: [
          { key: 'date',  label: 'date',  align: 'left' },
          { key: 'title', label: 'title', align: 'left' },
          { key: 'venue', label: 'venue', align: 'left' },
        ],
        rows: talks.map(t => [t.date, t.title, t.venue]),
      };
    }

    return {
      type:     'error',
      text:     `ls: ${target}: No such file or directory`,
      code:     'ENOENT',
      exitCode: 1,
    };
  },
});
