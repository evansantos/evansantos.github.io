import { defineCommand } from '../core/types.js';

const LAUNCH_YEAR = 2014;

export default defineCommand({
  name:     'uptime',
  describe: 'site uptime since 2014',
  run() {
    const years = new Date().getFullYear() - LAUNCH_YEAR;
    return {
      type: 'echo',
      text: `up ${years} year${years === 1 ? '' : 's'} — online since ${LAUNCH_YEAR}`,
    };
  },
});
