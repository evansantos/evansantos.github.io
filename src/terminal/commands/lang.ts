import { defineCommand } from '../core/types.js';

const VALID_LANGS = ['en', 'pt'] as const;

export default defineCommand({
  name:     'lang',
  describe: 'show or switch language (en, pt)',
  run(args, ctx) {
    if (args.length === 0) {
      const { lang } = ctx.state;
      return {
        type: 'echo',
        text: `current: ${lang} | available: ${VALID_LANGS.join(', ')}`,
      };
    }

    const target = args[0];
    if (!VALID_LANGS.includes(target as 'en' | 'pt')) {
      return {
        type:     'error',
        text:     `lang: '${target}' is not a supported language`,
        hint:     `available: ${VALID_LANGS.join(', ')}`,
        exitCode: 1,
      };
    }

    ctx.setState({ lang: target as 'en' | 'pt' });

    try {
      const stored = JSON.parse(localStorage.getItem('evandro.state.v1') ?? '{}') as Record<string, unknown>;
      localStorage.setItem('evandro.state.v1', JSON.stringify({ ...stored, lang: target }));
    } catch { /* private mode */ }

    return {
      type: 'echo',
      text: `language set to ${target} — content queries now return ${target === 'pt' ? 'Portuguese' : 'English'} posts`,
    };
  },
});
