import { defineCommand } from '../core/types.js';
import { VISIBLE_THEMES } from '../themes/registry.js';
import {
  HIDDEN_THEMES,
  ALL_THEMES,
  isHiddenTheme,
  isKnownTheme,
  isUnlocked,
  UNLOCK_CONDITIONS,
} from '../themes/unlocks.js';

function unlockedCount(state: { unlocked: readonly string[] }): number {
  let n = VISIBLE_THEMES.length;
  for (const h of HIDDEN_THEMES) {
    if (state.unlocked.includes(h)) n++;
  }
  return n;
}

function listingMarker(theme: string, unlocked: readonly string[]): string {
  if (!isHiddenTheme(theme)) return '';
  if (unlocked.includes(theme)) return '';
  if (theme === 'night') return ' [10pm-6am]';
  return ' [locked]';
}

export default defineCommand({
  name:     'theme',
  describe: 'list, switch, cycle, or randomize the terminal theme (no args = list)',
  run(args, ctx) {
    const sub = args[0];
    const env = { now: new Date() };

    if (sub === undefined) {
      const lines: string[] = ['themes:'];
      for (const t of ALL_THEMES) {
        const cur    = t === ctx.state.theme ? '  ▶ ' : '    ';
        const marker = listingMarker(t, ctx.state.unlocked);
        lines.push(`${cur}${t}${marker}`);
      }
      lines.push('');
      lines.push(`current: ${ctx.state.theme}  ·  found: ${unlockedCount(ctx.state)}/11`);
      return { type: 'echo', text: lines.join('\n') };
    }

    if (sub === 'next') {
      const i = VISIBLE_THEMES.indexOf(ctx.state.theme as typeof VISIBLE_THEMES[number]);
      const idx = i === -1 ? 0 : (i + 1) % VISIBLE_THEMES.length;
      const next = VISIBLE_THEMES[idx];
      ctx.setState({ theme: next });
      return { type: 'echo', text: `theme → ${next}` };
    }

    if (sub === 'random') {
      const pool: string[] = [...VISIBLE_THEMES];
      for (const h of HIDDEN_THEMES) {
        if (isUnlocked(h, ctx.state, env)) pool.push(h);
      }
      const candidates = pool.filter(t => t !== ctx.state.theme);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      ctx.setState({ theme: pick });
      return { type: 'echo', text: `theme → ${pick}` };
    }

    if (sub === 'reset') {
      ctx.setState({ theme: 'matrix' });
      return { type: 'echo', text: 'theme → matrix' };
    }

    if (isKnownTheme(sub)) {
      if (isUnlocked(sub, ctx.state, env)) {
        ctx.setState({ theme: sub });
        return { type: 'echo', text: `theme → ${sub}` };
      }
      const cond = isHiddenTheme(sub) ? UNLOCK_CONDITIONS[sub] : null;
      const hint = cond && 'hint' in cond ? cond.hint : 'this theme is locked';
      return {
        type:     'error',
        text:     `theme: '${sub}' is locked`,
        hint,
        code:     'EPERM',
        exitCode: 1,
      };
    }

    return {
      type:     'error',
      text:     `theme: unknown theme '${sub}'`,
      hint:     `try: theme (no args) to list available themes`,
      code:     'EINVAL',
      exitCode: 1,
    };
  },
});
