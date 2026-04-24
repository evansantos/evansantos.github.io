import { defineCommand } from '../core/types.js';
import { VISIBLE_THEMES, isVisibleTheme } from '../themes/registry.js';

export default defineCommand({
  name:     'theme',
  describe: 'list, switch, cycle, or randomize the terminal theme (no args = list)',
  run(args, ctx) {
    const sub = args[0];

    if (sub === undefined) {
      const lines: string[] = ['themes:'];
      for (const t of VISIBLE_THEMES) {
        const marker = t === ctx.state.theme ? '  ▶ ' : '    ';
        lines.push(`${marker}${t}`);
      }
      lines.push('');
      lines.push(`current: ${ctx.state.theme}  ·  found: ${ctx.state.found}/11`);
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
      const candidates = VISIBLE_THEMES.filter(t => t !== ctx.state.theme);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      ctx.setState({ theme: pick });
      return { type: 'echo', text: `theme → ${pick}` };
    }

    if (sub === 'reset') {
      ctx.setState({ theme: 'matrix' });
      return { type: 'echo', text: 'theme → matrix' };
    }

    if (isVisibleTheme(sub)) {
      ctx.setState({ theme: sub });
      return { type: 'echo', text: `theme → ${sub}` };
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
