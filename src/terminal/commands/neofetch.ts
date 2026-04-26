import { defineCommand } from '../core/types.js';

const LAUNCH_YEAR = 2014;

export default defineCommand({
  name:     'neofetch',
  describe: 'identity card',
  run(_args, ctx) {
    const years = new Date().getFullYear() - LAUNCH_YEAR;
    return {
      type: 'neofetch',
      data: {
        name:     'evandro santos',
        title:    'Senior Front-End / Full-Stack Engineer',
        location: 'Brooklyn, NYC',
        lang:     ctx.state.lang,
        theme:    ctx.state.theme,
        found:    `${ctx.state.found}/11`,
        uptime:   `${years} year${years === 1 ? '' : 's'} (since ${LAUNCH_YEAR})`,
        shell:    'evandosh 1.0',
      },
    };
  },
});
