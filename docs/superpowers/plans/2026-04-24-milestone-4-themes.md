# Milestone 4 — Themes

**Date:** 2026-04-24
**Status:** Ready for execution
**Depends on:** M1 (foundation), M2 (terminal skeleton), M3 (search & pager)

---

## Goal

Ship a complete theme system for evandro.dev with 6 curated themes (matrix, amber, nord, solarized, paper, synthwave), a first-class `theme` command, cross-tab persistence, accessible colour contrast, and a CI gate that prevents regressions.

### Success criteria (verifiable)

1. `theme`, `theme <name>`, `theme next`, `theme random`, `theme reset` all work and persist across reloads.
2. Switching themes does not flash default colours on refresh (FOUC script already reads `evandro.state.v1`).
3. Opening the site in two tabs and changing the theme in one updates the other within ~1 tick (storage event).
4. Tab-completion now completes: command names (token 1), directory names after `cd`, post slugs after `cat|head|tail|wc`, and theme/subcommand names after `theme`.
5. All six themes pass WCAG AA (`fg/bg ≥ 4.5`, `accent/bg ≥ 3.0`) — enforced by `tests/unit/theme-contrast.test.ts`.
6. Built HTML has zero `critical` axe-core violations — enforced by `tests/a11y/axe.test.ts` and a CI step.
7. `prefers-reduced-motion: reduce` disables the 250ms fade.
8. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:a11y`, `pnpm build` all green.

---

## Architecture

### Data flow

```
┌─────────────────────────────────────────────────────────────┐
│  localStorage  'evandro.state.v1'  { theme, found, ... }    │
└─────┬──────────────────────────────────────────────▲────────┘
      │ loadTheme() on mount (lazy useReducer init)  │
      │ storage event (cross-tab)                    │ saveTheme() on state.shell.theme change
      ▼                                              │
┌─────────────────────────────────────────────────────────────┐
│  Shell state  (useReducer)   shell.theme: string            │
└─────┬──────────────────────────────────┬────────────────────┘
      │ data-theme={shell.theme}         │ ctx.setState({theme})
      ▼                                  ▲
┌────────────────────────┐      ┌────────────────────────────┐
│  <div data-theme="…">  │      │  theme command             │
│  CSS vars cascade      │      │  (list/switch/next/random) │
└────────────────────────┘      └────────────────────────────┘
```

### Boundaries

- **`themes/styles/*.css`** — pure CSS, one file per theme, one `[data-theme="x"]` selector each. No JS coupling.
- **`themes/registry.ts`** — single source of truth for the ordered visible-theme tuple. Import from both the command and the tests.
- **`hooks/useTheme.ts`** — the *only* module that reads/writes `localStorage` for theme. Exposes `loadTheme`, `saveTheme`, `useStorageSync`.
- **`commands/theme.ts`** — pure command; mutates state via `ctx.setState`, never touches `localStorage` directly.
- **`Shell.tsx`** — composes the above: lazy-inits state from storage, persists on change, subscribes to storage events.

### Trade-offs accepted

- **One CSS file per theme + one index.css barrel.** Costs a handful of extra inlined imports at build time; gains file-level isolation and a trivial `git diff` when tweaking colours. Rejected alternative: a single `themes.css` mega-file (harder to review, merge conflicts).
- **Storage schema is shared (`evandro.state.v1`) across theme, lang, unlocks.** Tradeoff: one corrupt JSON wipes all persisted UI state. Accepted because M1 already ships FOUC based on this exact key — splitting now would fork persistence.
- **`VISIBLE_THEMES` is a tuple of 6, not an open registry.** Future hidden/unlockable themes will live in a separate `HIDDEN_THEMES` tuple introduced by a later milestone; `theme` command lists only visible ones.

---

## Tech stack

- Astro 5 + React 19 + TypeScript strict
- Test runner: Poku (TS-native, `.js` import extensions)
- A11y: axe-core 4.10 + happy-dom (already a devDep)
- No new runtime dependencies. One new devDep: `axe-core`.

---

## File map

### New files (13)

| Path | Purpose |
|---|---|
| `src/terminal/themes/styles/amber.css` | amber theme variables |
| `src/terminal/themes/styles/nord.css` | nord theme variables |
| `src/terminal/themes/styles/solarized.css` | solarized dark theme variables |
| `src/terminal/themes/styles/paper.css` | paper (light) theme variables |
| `src/terminal/themes/styles/synthwave.css` | synthwave theme variables |
| `src/terminal/themes/styles/index.css` | imports all 6 theme stylesheets |
| `src/terminal/themes/registry.ts` | `VISIBLE_THEMES` tuple + `VisibleTheme` type |
| `src/terminal/commands/theme.ts` | `theme` command |
| `src/terminal/hooks/useTheme.ts` | `loadTheme`, `saveTheme`, `useStorageSync` |
| `tests/unit/theme-registry.test.ts` | registry shape tests |
| `tests/unit/useTheme.test.ts` | hook + persistence tests |
| `tests/unit/commands/theme.test.ts` | command tests |
| `tests/unit/theme-contrast.test.ts` | WCAG AA CI gate |
| `tests/a11y/axe.test.ts` | axe-core smoke on built HTML |

### Modified files (6)

| Path | Change |
|---|---|
| `src/terminal/Shell.tsx` | lazy init, persist effect, storage sync, extended tab-complete, `index.css` import |
| `src/terminal/commands/index.ts` | register `theme` command |
| `src/terminal/commands/help.ts` | add `theme` line to help text |
| `src/styles/terminal.css` | append 250ms transition + reduced-motion override |
| `package.json` | add `axe-core` devDep + `test:a11y` script |
| `.github/workflows/ci.yml` | add `A11y audit` step after Build |

---

## Execution plan (8 tasks)

Tasks 1 and 2 have no TDD cycle (pure CSS + type constants). Task 3 onwards is strict RED → GREEN → REFACTOR.

Each task is independently mergeable. Recommended order = listed order. Escalate after 2 consecutive failures.

---

### Task 1 — Theme CSS files + barrel

**Type:** Pure CSS, no tests.
**Verification:** `pnpm typecheck` + `pnpm build`.

#### Step 1.1 — Create `src/terminal/themes/styles/amber.css`

```css
:root,
[data-theme="amber"] {
  --t-bg:          #0f0a00;
  --t-bg-alt:      #1a1200;
  --t-fg:          #ffb300;
  --t-fg-muted:    #ffb30080;
  --t-fg-dim:      #ffb30033;
  --t-accent:      #ff6600;
  --t-error:       #ff4444;
  --t-warning:     #ffdd00;
  --t-success:     #40bf40;
  --t-border:      #ffb30020;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

> Note: the `:root` selector is retained (same as `matrix.css`) so a theme file loaded in isolation still styles correctly. In practice, `data-theme` wins because it's more specific, and the per-theme `:root` block is effectively dead for non-matrix themes — but it keeps the files symmetric and individually testable.

#### Step 1.2 — Create `src/terminal/themes/styles/nord.css`

```css
:root,
[data-theme="nord"] {
  --t-bg:          #2e3440;
  --t-bg-alt:      #3b4252;
  --t-fg:          #d8dee9;
  --t-fg-muted:    #d8dee980;
  --t-fg-dim:      #d8dee933;
  --t-accent:      #88c0d0;
  --t-error:       #bf616a;
  --t-warning:     #ebcb8b;
  --t-success:     #a3be8c;
  --t-border:      #4c566a;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

#### Step 1.3 — Create `src/terminal/themes/styles/solarized.css`

```css
:root,
[data-theme="solarized"] {
  --t-bg:          #002b36;
  --t-bg-alt:      #073642;
  --t-fg:          #93a1a1;
  --t-fg-muted:    #93a1a180;
  --t-fg-dim:      #93a1a133;
  --t-accent:      #2aa198;
  --t-error:       #dc322f;
  --t-warning:     #b58900;
  --t-success:     #859900;
  --t-border:      #073642;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

#### Step 1.4 — Create `src/terminal/themes/styles/paper.css`

```css
:root,
[data-theme="paper"] {
  --t-bg:          #f5f0e8;
  --t-bg-alt:      #ebe5d8;
  --t-fg:          #1a1a1a;
  --t-fg-muted:    #1a1a1a80;
  --t-fg-dim:      #1a1a1a33;
  --t-accent:      #8b3a3a;
  --t-error:       #cc2222;
  --t-warning:     #885500;
  --t-success:     #2a6022;
  --t-border:      #1a1a1a20;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

#### Step 1.5 — Create `src/terminal/themes/styles/synthwave.css`

```css
:root,
[data-theme="synthwave"] {
  --t-bg:          #0d0221;
  --t-bg-alt:      #1a0a3a;
  --t-fg:          #f0e6ff;
  --t-fg-muted:    #f0e6ff80;
  --t-fg-dim:      #f0e6ff33;
  --t-accent:      #ff6eff;
  --t-error:       #ff4466;
  --t-warning:     #ffcc00;
  --t-success:     #00ffaa;
  --t-border:      #f0e6ff20;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

#### Step 1.6 — Create `src/terminal/themes/styles/index.css`

```css
@import './matrix.css';
@import './amber.css';
@import './nord.css';
@import './solarized.css';
@import './paper.css';
@import './synthwave.css';
```

#### Step 1.7 — Verify

```
pnpm typecheck
```

Expected output: no errors (TypeScript surface unchanged).

```
pnpm build
```

Expected: build succeeds, `dist/` contains compiled CSS. Spot-check with:

```
grep -c "data-theme=" dist/_astro/*.css
```

Expected: `>= 6` matches.

---

### Task 2 — Theme registry

**Type:** Pure types/constants. Test added in Task 3.

#### Step 2.1 — Create `src/terminal/themes/registry.ts`

```typescript
/**
 * Ordered tuple of themes visible in the `theme` command listing and
 * participating in `theme next` / `theme random`. Hidden/unlockable
 * themes will live in a future HIDDEN_THEMES tuple.
 */
export const VISIBLE_THEMES = [
  'matrix',
  'amber',
  'nord',
  'solarized',
  'paper',
  'synthwave',
] as const;

export type VisibleTheme = typeof VISIBLE_THEMES[number];

export function isVisibleTheme(x: string): x is VisibleTheme {
  return (VISIBLE_THEMES as readonly string[]).includes(x);
}
```

#### Step 2.2 — Verify

```
pnpm typecheck
```

Expected: no errors.

---

### Task 3 — Registry test (TDD)

#### Step 3.1 — RED: create `tests/unit/theme-registry.test.ts`

```typescript
import { test } from 'poku';
import assert from 'node:assert/strict';
import { VISIBLE_THEMES, isVisibleTheme } from '../../src/terminal/themes/registry.js';

test('VISIBLE_THEMES contains exactly the 6 M4 themes in canonical order', () => {
  assert.deepEqual(
    [...VISIBLE_THEMES],
    ['matrix', 'amber', 'nord', 'solarized', 'paper', 'synthwave'],
  );
});

test('VISIBLE_THEMES has no duplicates', () => {
  assert.equal(new Set(VISIBLE_THEMES).size, VISIBLE_THEMES.length);
});

test('isVisibleTheme accepts known themes', () => {
  for (const t of VISIBLE_THEMES) {
    assert.equal(isVisibleTheme(t), true, `expected isVisibleTheme(${t}) true`);
  }
});

test('isVisibleTheme rejects unknown themes', () => {
  assert.equal(isVisibleTheme('dracula'), false);
  assert.equal(isVisibleTheme(''), false);
  assert.equal(isVisibleTheme('MATRIX'), false); // case-sensitive
});
```

Run:

```
pnpm test tests/unit/theme-registry.test.ts
```

Expected: **PASS** (the registry was authored in Task 2; this test retroactively locks the contract).

> If strict RED-first is required, comment out the tuple body in `registry.ts` temporarily, watch the test fail, then uncomment. The registry is data, not behaviour, so the pragmatic ordering is acceptable.

---

### Task 4 — `theme` command (TDD)

#### Step 4.1 — RED: create `tests/unit/commands/theme.test.ts`

```typescript
import { test } from 'poku';
import assert from 'node:assert/strict';
import theme from '../../../src/terminal/commands/theme.js';
import { Store } from '../../../src/terminal/core/content.js';
import type { ShellState, CommandContext } from '../../../src/terminal/core/types.js';

function mkCtx(initial: Partial<ShellState> = {}): {
  ctx: CommandContext;
  getState: () => ShellState;
} {
  let state: ShellState = {
    cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false,
    ...initial,
  };
  const ctx: CommandContext = {
    store: new Store(null),
    state,
    setState: (update) => {
      state = { ...state, ...update };
      ctx.state = state;
    },
  };
  return { ctx, getState: () => state };
}

test('theme (no args) lists all visible themes and marks current', () => {
  const { ctx } = mkCtx({ theme: 'nord' });
  const result = theme.run([], ctx);
  assert.equal(result.type, 'echo');
  const text = (result as { type: 'echo'; text: string }).text;
  assert.match(text, /matrix/);
  assert.match(text, /amber/);
  assert.match(text, /nord/);
  assert.match(text, /solarized/);
  assert.match(text, /paper/);
  assert.match(text, /synthwave/);
  assert.match(text, /▶\s+nord/);
  assert.match(text, /current: nord/);
  assert.match(text, /found: 0\/11/);
});

test('theme <name> switches to a valid theme', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix' });
  const result = theme.run(['amber'], ctx);
  assert.equal(getState().theme, 'amber');
  assert.equal(result.type, 'echo');
  assert.match((result as { text: string }).text, /theme → amber/);
});

test('theme <name> rejects unknown theme and does not mutate state', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix' });
  const result = theme.run(['dracula'], ctx);
  assert.equal(getState().theme, 'matrix');
  assert.equal(result.type, 'error');
});

test('theme next cycles to the next visible theme', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix' });
  theme.run(['next'], ctx);
  assert.equal(getState().theme, 'amber');
});

test('theme next wraps from last to first', () => {
  const { ctx, getState } = mkCtx({ theme: 'synthwave' });
  theme.run(['next'], ctx);
  assert.equal(getState().theme, 'matrix');
});

test('theme random picks a different theme', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix' });
  for (let i = 0; i < 20; i++) {
    ctx.setState({ theme: 'matrix' });
    theme.run(['random'], ctx);
    assert.notEqual(getState().theme, 'matrix');
  }
});

test('theme reset returns to matrix', () => {
  const { ctx, getState } = mkCtx({ theme: 'synthwave' });
  theme.run(['reset'], ctx);
  assert.equal(getState().theme, 'matrix');
});
```

Run:

```
pnpm test tests/unit/commands/theme.test.ts
```

Expected: **FAIL** — `Cannot find module '.../commands/theme.js'`.

#### Step 4.2 — GREEN: create `src/terminal/commands/theme.ts`

```typescript
import { defineCommand } from '../core/types.js';
import { VISIBLE_THEMES, isVisibleTheme } from '../themes/registry.js';

export default defineCommand({
  name:     'theme',
  describe: 'list, switch, cycle, or randomize the terminal theme',
  run(args, ctx) {
    const sub = args[0];

    // theme (no args) → listing
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

    // theme next
    if (sub === 'next') {
      const i = VISIBLE_THEMES.indexOf(ctx.state.theme as typeof VISIBLE_THEMES[number]);
      const idx = i === -1 ? 0 : (i + 1) % VISIBLE_THEMES.length;
      const next = VISIBLE_THEMES[idx];
      ctx.setState({ theme: next });
      return { type: 'echo', text: `theme → ${next}` };
    }

    // theme random
    if (sub === 'random') {
      const candidates = VISIBLE_THEMES.filter(t => t !== ctx.state.theme);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      ctx.setState({ theme: pick });
      return { type: 'echo', text: `theme → ${pick}` };
    }

    // theme reset
    if (sub === 'reset') {
      ctx.setState({ theme: 'matrix' });
      return { type: 'echo', text: 'theme → matrix' };
    }

    // theme <name>
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
```

Run:

```
pnpm test tests/unit/commands/theme.test.ts
pnpm typecheck
```

Expected: all 7 tests **PASS**, typecheck clean.

#### Step 4.3 — Register command in `src/terminal/commands/index.ts`

Add `import theme from './theme.js';` in the import block, and append `theme` to `cmdList`:

```typescript
import theme   from './theme.js';
// ...
const cmdList: Command[] = [
  help, whoami, pwd, date, echo, clear, uptime, lang, history,
  cd, ls, tree, cat,
  grep, find, head, tail, wc,
  now, about, contact, rss,
  theme,
];
```

#### Step 4.4 — Update `src/terminal/commands/help.ts`

Insert a line after the `lang` entry, before the blank separator line:

```typescript
  '  lang [en|pt]      show or switch language',
  '  theme [name|next|random|reset]  switch colour theme',
  '',
```

Run:

```
pnpm test tests/unit/commands/help.test.ts
```

Expected: **PASS**. If the help test uses an exact-string match, update its expected string. Then rerun full suite:

```
pnpm test
```

Expected: all green.

---

### Task 5 — `useTheme` hook (TDD)

#### Step 5.1 — RED: create `tests/unit/useTheme.test.ts`

```typescript
import { test, beforeEach } from 'poku';
import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

const { loadTheme, saveTheme } = await import('../../src/terminal/hooks/useTheme.js');

const KEY = 'evandro.state.v1';

beforeEach(() => {
  localStorage.clear();
});

test('loadTheme returns "matrix" when localStorage is empty', () => {
  assert.equal(loadTheme(), 'matrix');
});

test('loadTheme returns stored theme string', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'nord' }));
  assert.equal(loadTheme(), 'nord');
});

test('loadTheme returns "matrix" when stored JSON is malformed', () => {
  localStorage.setItem(KEY, '{not-json');
  assert.equal(loadTheme(), 'matrix');
});

test('loadTheme returns "matrix" when theme field is missing', () => {
  localStorage.setItem(KEY, JSON.stringify({ found: 3 }));
  assert.equal(loadTheme(), 'matrix');
});

test('loadTheme returns "matrix" when theme field is non-string', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 42 }));
  assert.equal(loadTheme(), 'matrix');
});

test('saveTheme writes theme into localStorage', () => {
  saveTheme('amber');
  const raw = localStorage.getItem(KEY);
  assert.ok(raw);
  assert.equal(JSON.parse(raw!).theme, 'amber');
});

test('saveTheme preserves other fields in the state blob', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'matrix', found: 7, unlocked: ['x'] }));
  saveTheme('synthwave');
  const parsed = JSON.parse(localStorage.getItem(KEY)!);
  assert.equal(parsed.theme, 'synthwave');
  assert.equal(parsed.found, 7);
  assert.deepEqual(parsed.unlocked, ['x']);
});

test('saveTheme tolerates malformed JSON by overwriting with a fresh blob', () => {
  localStorage.setItem(KEY, '{garbage');
  saveTheme('paper'); // must not throw
  const parsed = JSON.parse(localStorage.getItem(KEY)!);
  assert.equal(parsed.theme, 'paper');
});
```

Run:

```
pnpm test tests/unit/useTheme.test.ts
```

Expected: **FAIL** — module not found.

#### Step 5.2 — GREEN: create `src/terminal/hooks/useTheme.ts`

```typescript
import { useEffect } from 'react';

const STATE_KEY = 'evandro.state.v1';

export function loadTheme(): string {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return 'matrix';
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'theme' in parsed) {
      const t = (parsed as { theme: unknown }).theme;
      if (typeof t === 'string') return t;
    }
    return 'matrix';
  } catch {
    return 'matrix';
  }
}

export function saveTheme(theme: string): void {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    let existing: Record<string, unknown> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
          existing = parsed as Record<string, unknown>;
        }
      } catch {
        // malformed — start fresh
      }
    }
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...existing, theme }));
  } catch {
    // Safari private mode / quota exceeded — best-effort silent fail
  }
}

/**
 * Subscribes to cross-tab storage events and invokes onThemeChange with
 * the new theme string whenever another tab updates the shared state blob.
 */
export function useStorageSync(onThemeChange: (theme: string) => void): void {
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STATE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        if (parsed && typeof parsed === 'object' && 'theme' in parsed) {
          const t = (parsed as { theme: unknown }).theme;
          if (typeof t === 'string') onThemeChange(t);
        }
      } catch {
        // ignore malformed cross-tab writes
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [onThemeChange]);
}
```

Run:

```
pnpm test tests/unit/useTheme.test.ts
pnpm typecheck
```

Expected: all 8 tests **PASS**, typecheck clean.

---

### Task 6 — Shell.tsx integration

**Type:** Wiring. No new unit tests (hook + command are already covered). Existing tests must remain green.

#### Step 6.1 — Edit `src/terminal/Shell.tsx`

**6.1a** — Replace the import on line 12:

```typescript
// old
import './themes/styles/matrix.css';

// new
import './themes/styles/index.css';
```

**6.1b** — Add two new imports after the `useVimMode` import (line 9):

```typescript
import { loadTheme, saveTheme, useStorageSync } from './hooks/useTheme.js';
import { VISIBLE_THEMES } from './themes/registry.js';
```

**6.1c** — Replace line 119 (the `useReducer` call) with a lazy initializer:

```typescript
const [state, dispatch] = useReducer(reducer, undefined, () => ({
  ...INIT_STATE,
  shell: { ...INIT_STATE.shell, theme: loadTheme() },
}));
```

**6.1d** — Add two effects immediately after the "Focus input after pager exits" effect (i.e., after the closing `}, [state.loading, vim.vimState]);` on line 172) and before the `executeCommand` declaration:

```typescript
// Persist theme changes to localStorage
useEffect(() => {
  saveTheme(state.shell.theme);
}, [state.shell.theme]);

// Cross-tab theme sync
useStorageSync(useCallback((theme: string) => {
  dispatch({ type: 'SET_SHELL', update: { theme } });
}, []));
```

**6.1e** — Replace the current `handleTabComplete` (lines 225–229) with:

```typescript
const handleTabComplete = useCallback((partial: string): string | null => {
  if (!partial) return null;
  const parts = partial.split(/\s+/);

  // First token — command names
  if (parts.length === 1) {
    const names = Array.from(commands.keys()).sort();
    return names.find(n => n.startsWith(partial)) ?? null;
  }

  const [cmd, ...rest] = parts;
  const partialArg = rest[rest.length - 1] ?? '';

  if (cmd === 'cd') {
    const dirs = ['~', 'blog', 'projects', 'talks', 'uses'];
    const match = dirs.find(d => d.startsWith(partialArg));
    return match !== undefined ? `${cmd} ${match}` : null;
  }

  if (['cat', 'head', 'tail', 'wc'].includes(cmd)) {
    const slugs = state.store.posts(state.shell.lang).map(p => p.slug);
    const match = slugs.find(s => s.startsWith(partialArg));
    return match !== undefined ? `${cmd} ${match}` : null;
  }

  if (cmd === 'theme') {
    const names = [...VISIBLE_THEMES, 'next', 'random', 'reset'];
    const match = names.find(n => n.startsWith(partialArg));
    return match !== undefined ? `${cmd} ${match}` : null;
  }

  return null;
}, [state.store, state.shell.lang]);
```

#### Step 6.2 — Verify

```
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected: all green. Manual smoke in `pnpm dev`:

1. Refresh — terminal loads on matrix.
2. Type `theme amber` — colours flip amber, status bar shows `theme: amber`.
3. Refresh — still amber (persistence).
4. Open a second tab, run `theme nord` — the first tab updates to nord within one tick.
5. Type `th<TAB>` → completes to `theme`. Type `theme s<TAB>` → completes to `theme solarized` (first match by alphabetical start).
6. Type `cd b<TAB>` → completes to `cd blog`.
7. DevTools → emulate prefers-reduced-motion: reduce. Switch themes — no fade.

---

### Task 7 — CSS transition + reduced-motion

#### Step 7.1 — Append to `src/styles/terminal.css`

```css
/* ── Theme transition ─────────────────────────────────────────
   Smooth 250ms fade when CSS variables (colours) change. The
   universal selector is safe here because we limit to three
   colour properties — layout/paint cost is negligible.
   ─────────────────────────────────────────────────────────── */
*,
*::before,
*::after {
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    border-color 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
  }
}
```

#### Step 7.2 — Verify

```
pnpm build
```

In `pnpm dev`, flip themes rapidly — expect a 250ms cross-fade on body background and text. Toggle Chrome DevTools "Emulate CSS media feature prefers-reduced-motion: reduce" and retry — transitions should be instant.

---

### Task 8 — Contrast + A11y gates

#### Step 8.1 — RED: create `tests/unit/theme-contrast.test.ts`

```typescript
import { test } from 'poku';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VISIBLE_THEMES } from '../../src/terminal/themes/registry.js';

const STYLES_DIR = new URL('../../src/terminal/themes/styles/', import.meta.url);

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = hexToLuminance(a);
  const l2 = hexToLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// Extracts {--t-fg, --t-bg, --t-accent} from a CSS file. Ignores alpha-suffixed
// variants like --t-fg-muted (8-digit hex) via the negative lookahead.
function parseVars(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(--t-fg|--t-bg|--t-accent):\s*(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/gm;
  for (const m of css.matchAll(re)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

for (const theme of VISIBLE_THEMES) {
  test(`theme "${theme}": fg/bg contrast >= 4.5 (WCAG AA body text)`, () => {
    const css = readFileSync(new URL(`${theme}.css`, STYLES_DIR), 'utf8');
    const vars = parseVars(css);
    assert.ok(vars['--t-fg'], `${theme}: --t-fg not found`);
    assert.ok(vars['--t-bg'], `${theme}: --t-bg not found`);
    const ratio = contrastRatio(vars['--t-fg'], vars['--t-bg']);
    assert.ok(
      ratio >= 4.5,
      `${theme}: fg ${vars['--t-fg']} on bg ${vars['--t-bg']} = ${ratio.toFixed(2)} (need >= 4.5)`,
    );
  });

  test(`theme "${theme}": accent/bg contrast >= 3.0 (WCAG AA large text)`, () => {
    const css = readFileSync(new URL(`${theme}.css`, STYLES_DIR), 'utf8');
    const vars = parseVars(css);
    assert.ok(vars['--t-accent'], `${theme}: --t-accent not found`);
    assert.ok(vars['--t-bg'], `${theme}: --t-bg not found`);
    const ratio = contrastRatio(vars['--t-accent'], vars['--t-bg']);
    assert.ok(
      ratio >= 3.0,
      `${theme}: accent ${vars['--t-accent']} on bg ${vars['--t-bg']} = ${ratio.toFixed(2)} (need >= 3.0)`,
    );
  });
}
```

Run:

```
pnpm test tests/unit/theme-contrast.test.ts
```

Expected: all 12 tests **PASS** (6 themes × 2 assertions). If any theme fails, STOP — the hex values in this plan were pre-verified, so a failure means a typo in the CSS file. Diff against the plan.

#### Step 8.2 — Add `axe-core` devDep and `test:a11y` script to `package.json`

Updated `devDependencies`:

```json
"devDependencies": {
  "@happy-dom/global-registrator": "^15.0.0",
  "@pokujs/react": "^1.5.1",
  "@types/node": "^25.6.0",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0",
  "axe-core": "^4.10.0",
  "happy-dom": "^15.0.0",
  "oxfmt": "0.2.0",
  "oxlint": "0.15.0",
  "poku": "^2.0.0",
  "tsx": "^4.21.0",
  "typescript": "^5.5.0"
}
```

Updated `scripts`:

```json
"scripts": {
  "predev": "tsx scripts/build-fixture.ts && tsx scripts/emit-csp-hash.ts",
  "prebuild": "tsx scripts/build-fixture.ts && tsx scripts/emit-csp-hash.ts",
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "format": "oxfmt src",
  "lint": "oxlint src",
  "test": "poku tests/unit",
  "test:a11y": "poku tests/a11y",
  "typecheck": "tsc --noEmit"
}
```

Install:

```
pnpm install
```

Expected: `axe-core` resolved, `pnpm-lock.yaml` updated.

> **Approval required:** adding `axe-core` is a new devDep. Confirm with Evan before running `pnpm install` per global rule "No external services/paid deps without explicit approval." It's a standard, well-maintained a11y lib (Deque Systems), dev-only, no runtime impact — but the policy says ask first.

#### Step 8.3 — Create `tests/a11y/axe.test.ts`

```typescript
import { test } from 'poku';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

const HTML_PATH = resolve(process.cwd(), 'dist/index.html');

test('dist/index.html has zero critical axe violations', async () => {
  if (!existsSync(HTML_PATH)) {
    console.warn(`[a11y] ${HTML_PATH} not found — skipping. Run 'pnpm build' first.`);
    return; // soft-skip locally; CI runs build before test:a11y
  }

  GlobalRegistrator.register();

  // Parse built HTML via happy-dom's DOMParser. We intentionally avoid
  // document.write() — this is a trusted local file, but using DOMParser
  // keeps the approach portable and avoids triggering XSS-sensitive paths
  // in tooling (our hooks flag document.write, even in test contexts).
  const html = readFileSync(HTML_PATH, 'utf8');
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');

  // Swap document.documentElement contents with the parsed tree so axe
  // audits the real <html> node (axe.run requires an actual Document or
  // Element attached to a live document).
  document.documentElement.replaceWith(parsed.documentElement);

  const axe = (await import('axe-core')).default;
  const results = await axe.run(document, {
    // color-contrast is covered by tests/unit/theme-contrast.test.ts with
    // exact WCAG ratios; axe's approximation can disagree on CSS-var themes.
    rules: { 'color-contrast': { enabled: false } },
  });

  const critical = results.violations.filter(v => v.impact === 'critical');
  assert.equal(
    critical.length,
    0,
    `critical a11y violations:\n${critical.map(v => `- ${v.id}: ${v.help}`).join('\n')}`,
  );

  await GlobalRegistrator.unregister();
});
```

> **Why DOMParser instead of `document.write()`:** our tooling flags `document.write()` as XSS-sensitive. Even though this test only ever consumes a local, CI-built HTML file (not user input), using `DOMParser` + `replaceWith` is semantically equivalent, keeps the repo lint-clean, and avoids future audit noise.

Run:

```
pnpm build && pnpm test:a11y
```

Expected: **PASS** (zero critical violations). If violations surface, fix them in `src/pages/index.astro` or affected components before merge.

#### Step 8.4 — Add CI step to `.github/workflows/ci.yml`

Insert after the `Build` step, at the same indentation level:

```yaml
      - name: A11y audit
        run: pnpm test:a11y
```

The YAML should read (abbreviated):

```yaml
      - name: Build
        run: pnpm build
      - name: A11y audit
        run: pnpm test:a11y
```

#### Step 8.5 — Full verification

```
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:a11y
```

Expected: all green.

---

## Final acceptance checklist

Run through before handing to BUG:

- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm test` — all unit tests pass (existing + new: registry, theme cmd, useTheme, contrast)
- [ ] `pnpm build` — succeeds
- [ ] `pnpm test:a11y` — 0 critical violations
- [ ] Manual smoke: `theme`, `theme amber`, `theme next`, `theme random`, `theme reset`
- [ ] Manual smoke: refresh persists theme (no FOUC)
- [ ] Manual smoke: second tab receives update via storage event
- [ ] Manual smoke: `th<TAB>`, `theme s<TAB>`, `cd b<TAB>`, `cat <TAB>` all complete correctly
- [ ] Manual smoke: prefers-reduced-motion disables the fade
- [ ] All 6 themes look correct on a 1440×900 monitor and a 375×812 iPhone viewport
- [ ] Git diff scoped to the 19 files listed in the file map — no accidental changes

---

## Out of scope (deferred to later milestones)

- Hidden/unlockable themes (e.g., `dracula` tied to `found` milestones).
- `theme preview <name>` (transient preview without persistence).
- System-preference auto-theme (`@media (prefers-color-scheme)` → matrix/paper).
- Per-theme font overrides (all themes currently share the same mono stack).

These are intentional omissions — the current scope is "ship 6 accessible themes with a real command and a CI gate." Anything more is feature creep for M4.
