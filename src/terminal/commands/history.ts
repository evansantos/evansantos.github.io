import { defineCommand } from '../core/types.js';

const STORAGE_KEY = 'evandro.history.v1';

export default defineCommand({
  name:     'history',
  describe: 'show command history',
  run() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const entries: string[] = raw ? JSON.parse(raw) : [];
      if (entries.length === 0) {
        return { type: 'echo', text: 'no history yet' };
      }
      const lines = entries
        .map((e, i) => `  ${String(i + 1).padStart(3)}  ${e}`)
        .join('\n');
      return { type: 'echo', text: lines };
    } catch {
      return { type: 'echo', text: 'no history yet' };
    }
  },
});
