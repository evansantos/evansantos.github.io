export interface ParsedFlags {
  flags:      Record<string, string | boolean>;
  positional: string[];
}

export function parseFlags(args: string[]): ParsedFlags {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    // --flag=value
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        flags[arg.slice(2)] = true;
      }
      i++;
      continue;
    }

    // -flag or -N (short flags)
    if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);

      // -3, -10 etc. -> flags.n = '3'
      if (/^\d+$/.test(key)) {
        flags['n'] = key;
        i++;
        continue;
      }

      // peek: if next arg exists and doesn't start with -, treat as value
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
      continue;
    }

    // positional
    positional.push(arg);
    i++;
  }

  return { flags, positional };
}

export function globToRegex(glob: string): RegExp {
  const escaped = glob
    .split('')
    .map(ch => {
      if (ch === '*') return '.*';
      if (ch === '?') return '.';
      return ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    })
    .join('');

  return new RegExp(`^${escaped}$`, 'i');
}
