import { defineCommand } from '../core/types.js';

const LAUNCH_YEAR = 2014;
const LAZY_UNLOCK_THRESHOLD = 3;

let callCount = 0;

/** Test-only helper. Resets the in-memory session counter. */
export function __resetUptimeCount(): void {
  callCount = 0;
}

export default defineCommand({
  name:     'uptime',
  describe: 'site uptime since 2014',
  run(_args, ctx) {
    callCount++;
    const years = new Date().getFullYear() - LAUNCH_YEAR;
    const base  = `up ${years} year${years === 1 ? '' : 's'} — online since ${LAUNCH_YEAR}`;

    if (callCount >= LAZY_UNLOCK_THRESHOLD && !ctx.state.unlocked.includes('lazy')) {
      ctx.setState({ unlocked: [...ctx.state.unlocked, 'lazy'] });
      return { type: 'echo', text: `${base}\n(theme "lazy" unlocked — try: theme lazy)` };
    }
    return { type: 'echo', text: base };
  },
});
