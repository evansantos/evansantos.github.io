# Milestone 5 — Discovery & Unlocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 5 hidden themes (`sandwich`, `night`, `lazy`, `konami`, `hacker`) with documented unlock paths, persistent unlock state, locked-theme hints, a Konami input listener, a Matrix rain canvas for `hacker`, and a WCAG contrast gate covering all 11 themes.

**Architecture:** A new `themes/unlocks.ts` module is the single source of truth for the hidden tuple and per-theme `isUnlocked(theme, state)` predicates. `ShellState` gains an `unlocked: string[]` array which persists in the existing `evandro.state.v1` blob via `useTheme.ts`. UI side-effects (Konami key listener, uptime call counter, Matrix rain canvas) are bolted onto `Shell.tsx` as discrete React hooks/components — pure logic stays out of the view.

**Tech Stack:** Astro 5, React 19, TypeScript strict, Poku 2 (test), happy-dom, plain CSS variables. No new runtime dependencies.

---

## Architecture decisions

### Boundaries

- **`themes/registry.ts`** — unchanged tuple of 6 visible themes; remains the canonical "always available" list. `isVisibleTheme` is unchanged.
- **`themes/unlocks.ts`** *(new)* — exports `HIDDEN_THEMES` tuple, `HiddenTheme` type, `isHiddenTheme`, `ALL_THEMES` (visible + hidden, frozen), `isKnownTheme`, `UnlockCondition` discriminated union, `UNLOCK_CONDITIONS` map, and `isUnlocked(theme, state, env)` pure function.
- **`hooks/useTheme.ts`** — extended (not split) with `loadUnlocked()` / `saveUnlocked()` / `addUnlocked()` and an extended `useStorageSync` that also propagates `unlocked[]` cross-tab. The shared key `evandro.state.v1` already accommodates extra fields (M4 confirmed `saveTheme` preserves siblings).
- **`hooks/useKonami.ts`** *(new)* — pure DOM listener; takes `onMatch: () => void`. No knowledge of themes or state.
- **`components/HackerRain.tsx`** *(new)* — pure presentation; mounts a `<canvas>`, listens to `prefers-reduced-motion`, returns `null` if reduced motion is on. Lifetime is bound to `theme === 'hacker'` via parent conditional render.
- **`commands/theme.ts`** — extended to know about hidden themes via `unlocks.ts` only. Lock checks happen at the command boundary; the underlying state field still accepts any string (consistent with M4's `theme: string`).
- **`commands/sudo.ts`** *(new)* — handles only `sudo make me a sandwich`; everything else returns a canonical XKCD-style error.
- **`commands/uptime.ts`** — extended to bump a per-session counter held in module scope and call `ctx.setState` to merge `unlocked` after the third call. Counter resets on full page reload (which is the spec-intended behaviour for "session").

### Trade-offs

- **Unlock-side-effects in commands vs in Shell.** Chosen: commands call `ctx.setState({ unlocked: [...] })` directly. Trade-off: each command must dedupe. Gain: no event bus, no command→Shell coupling, side effects testable through `setState` spies. Konami stays in Shell because it's a DOM key listener, not a command.
- **Module-level counter for uptime.** Trade-off: not testable in parallel (shared state). Gain: zero plumbing through `ShellState`/`ctx`; resets naturally on reload. Tests reset it via an exported `__resetUptimeCount` symbol guarded by a comment.
- **`night` is environmental, not user-action.** `isUnlocked('night', state, env)` reads `env.now` (injectable for tests). The theme command is the only caller that asks "can I switch to this?"; the `unlocked[]` array does NOT contain `night` because it is time-of-day gated, not unlocked-then-permanent. Listing prints `[10pm-6am]` instead of `[locked]`.
- **`hacker` predicate.** Computed: requires the other 4 hidden themes present in `unlocked[]`. Once those 4 are unlocked, `hacker` is implicitly available — no separate flag. `unlocked[]` therefore stores at most: `['sandwich', 'lazy', 'konami']` plus optionally `'hacker'` if we want a "first time discovered" hint (we don't store it; it's derivable).

### Data flow

```
┌── localStorage 'evandro.state.v1' { theme, unlocked[], ... } ──┐
│                                                                 │
│  loadUnlocked()  ── lazy useReducer init ──▶  shell.unlocked   │
│  saveUnlocked()  ◀── effect on shell.unlocked changes ─────────┘
│  useStorageSync() ── cross-tab propagation ──▶ dispatch        │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────────┐
                ▼             ▼                 ▼
       useKonami()   uptime command      sudo command
       (Shell)       (++count, set)     (set sandwich)
                              │
                              ▼
                    theme command checks
                    isUnlocked(t, state, env)
                              │
                              ▼
                  data-theme="hacker" ──▶ <HackerRain/>
                  (suppressed if prefers-reduced-motion)
```

---

## File map

### New files (13)

| Path | Purpose |
|---|---|
| `src/terminal/themes/styles/sandwich.css` | sandwich theme variables |
| `src/terminal/themes/styles/night.css` | night theme variables |
| `src/terminal/themes/styles/lazy.css` | lazy theme variables |
| `src/terminal/themes/styles/konami.css` | konami theme variables |
| `src/terminal/themes/styles/hacker.css` | hacker theme variables + canvas hooks |
| `src/terminal/themes/unlocks.ts` | HIDDEN_THEMES, isUnlocked, conditions |
| `src/terminal/hooks/useKonami.ts` | 10-key sequence listener hook |
| `src/terminal/components/HackerRain.tsx` | matrix rain canvas component |
| `src/terminal/commands/sudo.ts` | sandwich unlock command |
| `tests/unit/theme-unlocks.test.ts` | unlocks predicate + tuple tests |
| `tests/unit/useKonami.test.ts` | Konami hook tests |
| `tests/unit/commands/sudo.test.ts` | sudo command tests |
| `tests/unit/commands/uptime.test.ts` | uptime call-counter tests |

### Modified files (8)

| Path | Change |
|---|---|
| `src/terminal/themes/styles/index.css` | add 5 hidden theme imports |
| `src/terminal/core/types.ts` | `ShellState.unlocked: string[]` |
| `src/terminal/hooks/useTheme.ts` | loadUnlocked / saveUnlocked / extended sync |
| `src/terminal/commands/theme.ts` | locked-theme handling, hint, listing, random |
| `src/terminal/commands/uptime.ts` | session counter + lazy unlock |
| `src/terminal/Shell.tsx` | INIT_STATE.unlocked, useKonami, persist effect, HackerRain mount |
| `tests/unit/theme-contrast.test.ts` | iterate ALL_THEMES (11) |
| `tests/unit/useTheme.test.ts` | loadUnlocked / saveUnlocked tests |
| `tests/unit/commands/theme.test.ts` | locked behaviour, listing format |

---

## Tasks

### Task 1 — Hidden theme CSS files

Create the 5 hidden theme stylesheets and register them in the index barrel. Pure CSS variables, no JS.

- [ ] **1.1** Create `src/terminal/themes/styles/sandwich.css`:

```css
:root,
[data-theme="sandwich"] {
  --t-bg:          #f4e4bc;
  --t-bg-alt:      #e8d4a0;
  --t-fg:          #3d2817;
  --t-fg-muted:    #3d281780;
  --t-fg-dim:      #3d281733;
  --t-accent:      #b8651a;
  --t-error:       #a02020;
  --t-warning:     #c47b00;
  --t-success:     #5a7a2a;
  --t-border:      #3d281720;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

- [ ] **1.2** Create `src/terminal/themes/styles/night.css`:

```css
:root,
[data-theme="night"] {
  --t-bg:          #08080f;
  --t-bg-alt:      #12121e;
  --t-fg:          #c8c8e0;
  --t-fg-muted:    #c8c8e080;
  --t-fg-dim:      #c8c8e033;
  --t-accent:      #6a8cff;
  --t-error:       #ff5577;
  --t-warning:     #ffaa55;
  --t-success:     #66dd99;
  --t-border:      #c8c8e020;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

- [ ] **1.3** Create `src/terminal/themes/styles/lazy.css`:

```css
:root,
[data-theme="lazy"] {
  --t-bg:          #2a2520;
  --t-bg-alt:      #353029;
  --t-fg:          #e8d8b8;
  --t-fg-muted:    #e8d8b880;
  --t-fg-dim:      #e8d8b833;
  --t-accent:      #d4a060;
  --t-error:       #d05060;
  --t-warning:     #e8b840;
  --t-success:     #88c070;
  --t-border:      #e8d8b820;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   1rem;
  --t-line-height: 1.7;
}
```

- [ ] **1.4** Create `src/terminal/themes/styles/konami.css`:

```css
:root,
[data-theme="konami"] {
  --t-bg:          #1a0a2e;
  --t-bg-alt:      #2a1545;
  --t-fg:          #ffe066;
  --t-fg-muted:    #ffe06680;
  --t-fg-dim:      #ffe06633;
  --t-accent:      #ff5577;
  --t-error:       #ff3344;
  --t-warning:     #ffaa00;
  --t-success:     #66ff99;
  --t-border:      #ffe06620;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

- [ ] **1.5** Create `src/terminal/themes/styles/hacker.css`:

```css
:root,
[data-theme="hacker"] {
  --t-bg:          #000000;
  --t-bg-alt:      #050505;
  --t-fg:          #00ff41;
  --t-fg-muted:    #00ff4180;
  --t-fg-dim:      #00ff4133;
  --t-accent:      #66ff99;
  --t-error:       #ff2244;
  --t-warning:     #ffcc00;
  --t-success:     #00ff41;
  --t-border:      #00ff4120;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}

[data-theme="hacker"] .terminal__hacker-rain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.35;
}

[data-theme="hacker"] .terminal__log,
[data-theme="hacker"] .terminal__input-row,
[data-theme="hacker"] .terminal__status,
[data-theme="hacker"] .terminal__pager {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  [data-theme="hacker"] .terminal__hacker-rain { display: none; }
}
```

- [ ] **1.6** Update `src/terminal/themes/styles/index.css` to:

```css
@import './amber.css';
@import './nord.css';
@import './solarized.css';
@import './paper.css';
@import './synthwave.css';
@import './matrix.css';
@import './sandwich.css';
@import './night.css';
@import './lazy.css';
@import './konami.css';
@import './hacker.css';
```

- [ ] **1.7** Verify build picks up new files: `pnpm typecheck` (expect: no errors). Then commit:

```
feat(themes): add 5 hidden theme stylesheets (sandwich/night/lazy/konami/hacker)
```

---

### Task 2 — `unlocks.ts` (TDD)

Build the unlock module behind a test. This is the architectural seam — every other task depends on it.

- [ ] **2.1** Create `tests/unit/theme-unlocks.test.ts` (RED):

```ts
import { test } from 'poku';
import assert from 'node:assert/strict';
import {
  HIDDEN_THEMES,
  ALL_THEMES,
  isHiddenTheme,
  isKnownTheme,
  isUnlocked,
} from '../../src/terminal/themes/unlocks.js';

test('HIDDEN_THEMES is the canonical 5-tuple in spec order', () => {
  assert.deepEqual(
    [...HIDDEN_THEMES],
    ['sandwich', 'night', 'lazy', 'konami', 'hacker'],
  );
});

test('ALL_THEMES has 11 entries: visible first, then hidden', () => {
  assert.equal(ALL_THEMES.length, 11);
  assert.equal(ALL_THEMES[0], 'matrix');
  assert.equal(ALL_THEMES[6], 'sandwich');
  assert.equal(ALL_THEMES[10], 'hacker');
});

test('isHiddenTheme correctly classifies', () => {
  assert.equal(isHiddenTheme('sandwich'), true);
  assert.equal(isHiddenTheme('hacker'), true);
  assert.equal(isHiddenTheme('matrix'), false);
  assert.equal(isHiddenTheme('dracula'), false);
});

test('isKnownTheme accepts all 11 and rejects others', () => {
  for (const t of ALL_THEMES) assert.equal(isKnownTheme(t), true);
  assert.equal(isKnownTheme('dracula'), false);
  assert.equal(isKnownTheme(''), false);
});

test('visible themes are always unlocked regardless of state', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('matrix',    { unlocked: [] }, env), true);
  assert.equal(isUnlocked('synthwave', { unlocked: [] }, env), true);
});

test('sandwich requires unlocked[] entry', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('sandwich', { unlocked: [] }, env), false);
  assert.equal(isUnlocked('sandwich', { unlocked: ['sandwich'] }, env), true);
});

test('lazy requires unlocked[] entry', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('lazy', { unlocked: [] }, env), false);
  assert.equal(isUnlocked('lazy', { unlocked: ['lazy'] }, env), true);
});

test('konami requires unlocked[] entry', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('konami', { unlocked: [] }, env), false);
  assert.equal(isUnlocked('konami', { unlocked: ['konami'] }, env), true);
});

test('night is unlocked between 22:00 and 05:59 local', () => {
  const state = { unlocked: [] };
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 22, 0)  }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 23, 30) }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 25,  0, 0)  }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 25,  5, 59) }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 25,  6, 0)  }), false);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 12, 0)  }), false);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 21, 59) }), false);
});

test('hacker requires the other 4 hidden themes to be unlocked', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('hacker', { unlocked: [] },                                       env), false);
  assert.equal(isUnlocked('hacker', { unlocked: ['sandwich', 'lazy', 'konami'] },           env), false);
  // night counts as "unlocked" for the hacker gate when it is currently night
  const nightEnv = { now: new Date(2026, 3, 25, 23, 0) };
  assert.equal(isUnlocked('hacker', { unlocked: ['sandwich', 'lazy', 'konami'] },           nightEnv), true);
  // or when night appears in unlocked[] explicitly (forward-compat; we never write it, but accept it)
  assert.equal(isUnlocked('hacker', { unlocked: ['sandwich', 'lazy', 'konami', 'night'] }, env), true);
});

test('isUnlocked returns false for unknown theme names', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('dracula', { unlocked: [] }, env), false);
});
```

Run: `pnpm test tests/unit/theme-unlocks.test.ts`. Expect: failure (`unlocks.ts` does not exist).

- [ ] **2.2** Create `src/terminal/themes/unlocks.ts` (GREEN):

```ts
import { VISIBLE_THEMES, isVisibleTheme } from './registry.js';

export const HIDDEN_THEMES = [
  'sandwich',
  'night',
  'lazy',
  'konami',
  'hacker',
] as const;

export type HiddenTheme = typeof HIDDEN_THEMES[number];

export function isHiddenTheme(x: string): x is HiddenTheme {
  return (HIDDEN_THEMES as readonly string[]).includes(x);
}

export const ALL_THEMES = [...VISIBLE_THEMES, ...HIDDEN_THEMES] as const;
export type KnownTheme = typeof ALL_THEMES[number];

export function isKnownTheme(x: string): x is KnownTheme {
  return isVisibleTheme(x) || isHiddenTheme(x);
}

export type UnlockCondition =
  | { kind: 'always' }
  | { kind: 'flag';     hint: string }
  | { kind: 'time';     startHour: number; endHour: number; hint: string }
  | { kind: 'composite'; requires: readonly HiddenTheme[]; hint: string };

export const UNLOCK_CONDITIONS: Record<HiddenTheme, UnlockCondition> = {
  sandwich: { kind: 'flag', hint: 'try: sudo make me a sandwich' },
  night:    { kind: 'time', startHour: 22, endHour: 6,
              hint: 'come back between 10pm and 6am local time' },
  lazy:     { kind: 'flag', hint: 'run uptime three times in a session' },
  konami:   { kind: 'flag', hint: 'up up down down left right left right b a' },
  hacker:   { kind: 'composite',
              requires: ['sandwich', 'night', 'lazy', 'konami'],
              hint: 'unlock the other four hidden themes first' },
};

export interface UnlockState {
  unlocked: readonly string[];
}

export interface UnlockEnv {
  now: Date;
}

function inNightWindow(d: Date, startHour: number, endHour: number): boolean {
  const h = d.getHours();
  const m = d.getMinutes();
  // Window wraps midnight: [startHour:00 .. endHour:59]
  if (startHour > endHour) {
    return h >= startHour || h < endHour || (h === endHour - 1 && m <= 59);
  }
  return h >= startHour && h < endHour;
}

export function isUnlocked(
  theme: string,
  state: UnlockState,
  env: UnlockEnv = { now: new Date() },
): boolean {
  if (isVisibleTheme(theme)) return true;
  if (!isHiddenTheme(theme)) return false;

  const cond = UNLOCK_CONDITIONS[theme];
  switch (cond.kind) {
    case 'always':
      return true;
    case 'flag':
      return state.unlocked.includes(theme);
    case 'time':
      return inNightWindow(env.now, cond.startHour, cond.endHour);
    case 'composite':
      return cond.requires.every(req => {
        const reqCond = UNLOCK_CONDITIONS[req];
        if (reqCond.kind === 'time') {
          // satisfied if currently in window OR explicitly recorded
          return inNightWindow(env.now, reqCond.startHour, reqCond.endHour)
              || state.unlocked.includes(req);
        }
        return state.unlocked.includes(req);
      });
  }
}
```

Run: `pnpm test tests/unit/theme-unlocks.test.ts`. Expect: all pass.

- [ ] **2.3** Type/lint sweep: `pnpm typecheck && pnpm lint`. Expect: clean.

- [ ] **2.4** Commit:

```
feat(themes): add unlocks module with HIDDEN_THEMES tuple and isUnlocked predicate
```

---

### Task 3 — Extend `ShellState` with `unlocked: string[]`

This is the breaking-change wave. Every test that constructs `ShellState` must add the field.

- [ ] **3.1** Edit `src/terminal/core/types.ts`. Replace the `ShellState` interface (lines 123-129) with:

```ts
export interface ShellState {
  cwd:      string;   // '~' | 'blog' | 'projects' | 'talks' | 'uses'
  lang:     Lang;
  theme:    string;
  found:    number;   // unlocked theme count (derived from unlocked.length + visible count)
  unlocked: string[]; // hidden themes the user has discovered (M5+)
  degraded: boolean;
}
```

- [ ] **3.2** Run `pnpm typecheck`. Capture the failing files (expect ~6-10 sites). Update each:
  - `src/terminal/Shell.tsx` — `INIT_STATE.shell` literal: add `unlocked: []`.
  - `tests/unit/commands/theme.test.ts` — the `mkCtx` initial state literal: add `unlocked: []`.
  - Any other test that constructs a `ShellState` literal — add `unlocked: []`.

For Shell.tsx specifically, replace line 114:
```ts
shell:   { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
```
with:
```ts
shell:   { cwd: '~', lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false },
```

- [ ] **3.3** Run `pnpm typecheck && pnpm test`. Expect: all green (no behavioural changes yet).

- [ ] **3.4** Commit:

```
refactor(shell): add unlocked: string[] to ShellState (no behaviour change)
```

---

### Task 4 — `useKonami` hook (TDD)

- [ ] **4.1** Create `tests/unit/useKonami.test.ts` (RED):

```ts
import { test, beforeEach, afterEach } from 'poku';
import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

const React = (await import('react')).default;
const { renderHook, cleanup } = await import('@pokujs/react');
const { useKonami, KONAMI_SEQUENCE } = await import('../../src/terminal/hooks/useKonami.js');

afterEach(() => cleanup());

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

test('KONAMI_SEQUENCE is the canonical 10-key list', () => {
  assert.deepEqual(KONAMI_SEQUENCE, [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a',
  ]);
});

test('useKonami fires onMatch on the full sequence', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 1);
});

test('useKonami does not fire on partial sequence', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  for (const k of KONAMI_SEQUENCE.slice(0, 9)) press(k);
  assert.equal(calls, 0);
});

test('useKonami resets buffer on a wrong key', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  press('ArrowUp'); press('ArrowUp'); press('z'); // reset
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 1);
});

test('useKonami fires twice across two complete sequences', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  for (const k of KONAMI_SEQUENCE) press(k);
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 2);
});

test('useKonami unsubscribes on unmount', () => {
  let calls = 0;
  const { unmount } = renderHook(() => useKonami(() => { calls++; }));
  unmount();
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 0);
});

test('useKonami matches Arrow keys case-sensitively but b/a literally', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  const seq = [...KONAMI_SEQUENCE];
  // last two are literally 'b','a'; uppercase B/A should NOT trigger
  for (const k of seq.slice(0, 8)) press(k);
  press('B'); press('A');
  assert.equal(calls, 0);
});
```

Run: `pnpm test tests/unit/useKonami.test.ts`. Expect: failure (hook does not exist).

- [ ] **4.2** Create `src/terminal/hooks/useKonami.ts` (GREEN):

```ts
import { useEffect, useRef } from 'react';

export const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
] as const;

export function useKonami(onMatch: () => void): void {
  const bufferRef = useRef<string[]>([]);
  const cbRef     = useRef(onMatch);
  cbRef.current = onMatch;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const expected = KONAMI_SEQUENCE[bufferRef.current.length];
      if (e.key === expected) {
        bufferRef.current.push(e.key);
        if (bufferRef.current.length === KONAMI_SEQUENCE.length) {
          bufferRef.current = [];
          cbRef.current();
        }
        return;
      }
      // wrong key — reset; if it matches the FIRST key, start over with it
      bufferRef.current = e.key === KONAMI_SEQUENCE[0] ? [e.key] : [];
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

Run: `pnpm test tests/unit/useKonami.test.ts`. Expect: all pass.

- [ ] **4.3** Commit:

```
feat(hooks): add useKonami sequence listener hook
```

---

### Task 5 — Persist `unlocked[]` (extend useTheme)

- [ ] **5.1** Extend `tests/unit/useTheme.test.ts`. Append after the existing tests:

```ts
const { loadUnlocked, saveUnlocked, addUnlocked } =
  await import('../../src/terminal/hooks/useTheme.js');

test('loadUnlocked returns [] when localStorage is empty', () => {
  assert.deepEqual(loadUnlocked(), []);
});

test('loadUnlocked returns array when stored', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'matrix', unlocked: ['sandwich', 'lazy'] }));
  assert.deepEqual(loadUnlocked(), ['sandwich', 'lazy']);
});

test('loadUnlocked filters non-strings and unknown themes silently', () => {
  localStorage.setItem(KEY, JSON.stringify({ unlocked: ['sandwich', 42, 'dracula', 'konami'] }));
  assert.deepEqual(loadUnlocked(), ['sandwich', 'konami']);
});

test('loadUnlocked returns [] when unlocked is not an array', () => {
  localStorage.setItem(KEY, JSON.stringify({ unlocked: 'sandwich' }));
  assert.deepEqual(loadUnlocked(), []);
});

test('loadUnlocked returns [] when JSON is malformed', () => {
  localStorage.setItem(KEY, '{garbage');
  assert.deepEqual(loadUnlocked(), []);
});

test('saveUnlocked writes the array and preserves theme', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'amber', unlocked: [] }));
  saveUnlocked(['sandwich']);
  const parsed = JSON.parse(localStorage.getItem(KEY)!);
  assert.equal(parsed.theme, 'amber');
  assert.deepEqual(parsed.unlocked, ['sandwich']);
});

test('addUnlocked dedupes and returns the new array', () => {
  saveUnlocked(['sandwich']);
  const next = addUnlocked('sandwich');
  assert.deepEqual(next, ['sandwich']);
  const next2 = addUnlocked('konami');
  assert.deepEqual(next2.sort(), ['konami', 'sandwich']);
});

test('addUnlocked rejects unknown hidden themes silently', () => {
  saveUnlocked([]);
  const next = addUnlocked('dracula');
  assert.deepEqual(next, []);
});
```

Run: `pnpm test tests/unit/useTheme.test.ts`. Expect: failure (functions missing).

- [ ] **5.2** Edit `src/terminal/hooks/useTheme.ts`. Add imports and new exports. Replace file contents with:

```ts
import { useEffect } from 'react';
import { isVisibleTheme } from '../themes/registry.js';
import { isHiddenTheme } from '../themes/unlocks.js';

const STATE_KEY = 'evandro.state.v1';

function readBlob(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

function writeBlob(blob: Record<string, unknown>): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(blob));
  } catch {
    // Safari private mode / quota exceeded — silent fail
  }
}

export function loadTheme(): string {
  const blob = readBlob();
  const t = blob.theme;
  if (typeof t === 'string' && isVisibleTheme(t)) return t;
  // Hidden themes are also valid persisted choices once unlocked
  if (typeof t === 'string' && isHiddenTheme(t)) return t;
  return 'matrix';
}

export function saveTheme(theme: string): void {
  writeBlob({ ...readBlob(), theme });
}

export function loadUnlocked(): string[] {
  const blob = readBlob();
  const arr = blob.unlocked;
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === 'string' && isHiddenTheme(x));
}

export function saveUnlocked(unlocked: readonly string[]): void {
  writeBlob({ ...readBlob(), unlocked: [...unlocked] });
}

export function addUnlocked(theme: string): string[] {
  if (!isHiddenTheme(theme)) return loadUnlocked();
  const current = loadUnlocked();
  if (current.includes(theme)) return current;
  const next = [...current, theme];
  saveUnlocked(next);
  return next;
}

export function useStorageSync(
  onThemeChange: (theme: string) => void,
  onUnlockedChange?: (unlocked: string[]) => void,
): void {
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STATE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        if (!parsed || typeof parsed !== 'object') return;
        const obj = parsed as Record<string, unknown>;
        const t = obj.theme;
        if (typeof t === 'string' && (isVisibleTheme(t) || isHiddenTheme(t))) {
          onThemeChange(t);
        }
        if (onUnlockedChange && Array.isArray(obj.unlocked)) {
          const u = obj.unlocked.filter(
            (x): x is string => typeof x === 'string' && isHiddenTheme(x),
          );
          onUnlockedChange(u);
        }
      } catch {
        // ignore malformed cross-tab writes
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [onThemeChange, onUnlockedChange]);
}
```

Run: `pnpm test tests/unit/useTheme.test.ts`. Expect: all pass.

- [ ] **5.3** `pnpm typecheck && pnpm lint`. Expect: clean.

- [ ] **5.4** Commit:

```
feat(theme-store): persist unlocked[] alongside theme in evandro.state.v1
```

---

### Task 6 — `sudo` command (TDD)

- [ ] **6.1** Create `tests/unit/commands/sudo.test.ts` (RED):

```ts
import { test } from 'poku';
import assert from 'node:assert/strict';
import sudo from '../../../src/terminal/commands/sudo.js';
import { Store } from '../../../src/terminal/core/content.js';
import type { ShellState, Context } from '../../../src/terminal/core/types.js';

function mkCtx(initial: Partial<ShellState> = {}): {
  ctx: Context; getState: () => ShellState;
} {
  let state: ShellState = {
    cwd: '~', lang: 'en', theme: 'matrix', found: 0,
    unlocked: [], degraded: false, ...initial,
  };
  const ctx: Context = {
    store: new Store(null),
    state,
    setState: (update) => { state = { ...state, ...update }; ctx.state = state; },
  };
  return { ctx, getState: () => state };
}

test('sudo make me a sandwich unlocks sandwich and confirms', () => {
  const { ctx, getState } = mkCtx();
  const result = sudo.run(['make', 'me', 'a', 'sandwich'], ctx) as {
    type: 'echo'; text: string;
  };
  assert.equal(result.type, 'echo');
  assert.match(result.text, /sandwich/i);
  assert.deepEqual(getState().unlocked, ['sandwich']);
});

test('sudo make me a sandwich is idempotent', () => {
  const { ctx, getState } = mkCtx({ unlocked: ['sandwich'] });
  sudo.run(['make', 'me', 'a', 'sandwich'], ctx);
  assert.deepEqual(getState().unlocked, ['sandwich']);
});

test('sudo without args returns the canonical xkcd error', () => {
  const { ctx, getState } = mkCtx();
  const result = sudo.run([], ctx) as { type: string; text: string };
  assert.equal(result.type, 'error');
  assert.deepEqual(getState().unlocked, []);
});

test('sudo make me a coffee returns error and does not unlock', () => {
  const { ctx, getState } = mkCtx();
  const result = sudo.run(['make', 'me', 'a', 'coffee'], ctx) as {
    type: string; text: string;
  };
  assert.equal(result.type, 'error');
  assert.deepEqual(getState().unlocked, []);
});

test('sudo preserves other unlocked entries when adding sandwich', () => {
  const { ctx, getState } = mkCtx({ unlocked: ['konami'] });
  sudo.run(['make', 'me', 'a', 'sandwich'], ctx);
  assert.deepEqual(getState().unlocked.sort(), ['konami', 'sandwich']);
});
```

Run: `pnpm test tests/unit/commands/sudo.test.ts`. Expect: failure.

- [ ] **6.2** Create `src/terminal/commands/sudo.ts` (GREEN):

```ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'sudo',
  describe: 'simulate elevated privileges (try: sudo make me a sandwich)',
  run(args, ctx) {
    const phrase = args.join(' ').toLowerCase();
    if (phrase === 'make me a sandwich') {
      const current = ctx.state.unlocked;
      const next = current.includes('sandwich') ? current : [...current, 'sandwich'];
      ctx.setState({ unlocked: next });
      return {
        type: 'echo',
        text: 'okay. 🥪  (theme "sandwich" unlocked — try: theme sandwich)',
      };
    }
    return {
      type:     'error',
      text:     `sudo: ${args[0] ?? '(empty)'}: command not found`,
      hint:     'this is a static site — there is no root. try: sudo make me a sandwich',
      code:     'EPERM',
      exitCode: 1,
    };
  },
});
```

- [ ] **6.3** Register in `src/terminal/commands/index.ts`. Add `import sudo from './sudo.js';` next to the other imports and add `sudo` to the `cmdList` array.

Run: `pnpm test tests/unit/commands/sudo.test.ts`. Expect: pass.

- [ ] **6.4** Commit:

```
feat(commands): add sudo command, unlocks sandwich theme on canonical phrase
```

---

### Task 7 — `uptime` session counter unlocks `lazy` (TDD)

- [ ] **7.1** Create `tests/unit/commands/uptime.test.ts` (RED):

```ts
import { test, beforeEach } from 'poku';
import assert from 'node:assert/strict';
import uptime, { __resetUptimeCount } from '../../../src/terminal/commands/uptime.js';
import { Store } from '../../../src/terminal/core/content.js';
import type { ShellState, Context } from '../../../src/terminal/core/types.js';

function mkCtx(initial: Partial<ShellState> = {}): {
  ctx: Context; getState: () => ShellState;
} {
  let state: ShellState = {
    cwd: '~', lang: 'en', theme: 'matrix', found: 0,
    unlocked: [], degraded: false, ...initial,
  };
  const ctx: Context = {
    store: new Store(null),
    state,
    setState: (update) => { state = { ...state, ...update }; ctx.state = state; },
  };
  return { ctx, getState: () => state };
}

beforeEach(() => __resetUptimeCount());

test('uptime first call returns echo and does NOT unlock lazy', () => {
  const { ctx, getState } = mkCtx();
  const result = uptime.run([], ctx) as { type: 'echo'; text: string };
  assert.equal(result.type, 'echo');
  assert.match(result.text, /up \d+ year/);
  assert.deepEqual(getState().unlocked, []);
});

test('uptime second call does NOT unlock lazy', () => {
  const { ctx, getState } = mkCtx();
  uptime.run([], ctx);
  uptime.run([], ctx);
  assert.deepEqual(getState().unlocked, []);
});

test('uptime third call unlocks lazy', () => {
  const { ctx, getState } = mkCtx();
  uptime.run([], ctx);
  uptime.run([], ctx);
  uptime.run([], ctx);
  assert.deepEqual(getState().unlocked, ['lazy']);
});

test('uptime fourth call is idempotent (lazy stays once)', () => {
  const { ctx, getState } = mkCtx();
  for (let i = 0; i < 4; i++) uptime.run([], ctx);
  assert.deepEqual(getState().unlocked, ['lazy']);
});

test('uptime preserves prior unlocks when adding lazy', () => {
  const { ctx, getState } = mkCtx({ unlocked: ['sandwich'] });
  for (let i = 0; i < 3; i++) uptime.run([], ctx);
  assert.deepEqual(getState().unlocked.sort(), ['lazy', 'sandwich']);
});
```

Run: `pnpm test tests/unit/commands/uptime.test.ts`. Expect: failure.

- [ ] **7.2** Replace `src/terminal/commands/uptime.ts`:

```ts
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
```

Run: `pnpm test tests/unit/commands/uptime.test.ts`. Expect: pass.

- [ ] **7.3** Commit:

```
feat(commands): uptime tracks session call count, unlocks lazy on 3rd call
```

---

### Task 8 — Extend `theme` command for hidden themes (TDD)

- [ ] **8.1** Extend `tests/unit/commands/theme.test.ts`. Update `mkCtx` (already has `unlocked: []` from Task 3) and append:

```ts
import { HIDDEN_THEMES } from '../../../src/terminal/themes/unlocks.js';

test('theme listing includes hidden themes with [locked] markers when not unlocked', () => {
  const { ctx } = mkCtx({ unlocked: [] });
  const result = theme.run([], ctx) as { type: 'echo'; text: string };
  for (const h of HIDDEN_THEMES) {
    if (h === 'night') continue; // night uses time-window marker, asserted separately
    assert.match(result.text, new RegExp(`${h}\\s+\\[locked\\]`));
  }
});

test('theme listing shows night with the time-window marker', () => {
  const { ctx } = mkCtx({ unlocked: [] });
  const result = theme.run([], ctx) as { type: 'echo'; text: string };
  assert.match(result.text, /night\s+\[10pm-6am\]/);
});

test('theme listing drops [locked] for unlocked hidden themes', () => {
  const { ctx } = mkCtx({ unlocked: ['sandwich'] });
  const result = theme.run([], ctx) as { type: 'echo'; text: string };
  assert.match(result.text, /sandwich(?!\s+\[locked\])/);
  assert.match(result.text, /konami\s+\[locked\]/);
});

test('theme found count reflects unlocked total + visible (out of 11)', () => {
  const { ctx } = mkCtx({ unlocked: ['sandwich', 'konami'] });
  const result = theme.run([], ctx) as { type: 'echo'; text: string };
  // 6 visible + 2 hidden unlocked = 8/11
  assert.match(result.text, /found: 8\/11/);
});

test('theme <locked> shows hint and does not switch', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix', unlocked: [] });
  const result = theme.run(['sandwich'], ctx) as { type: string; text: string; hint?: string };
  assert.equal(result.type, 'error');
  assert.equal(getState().theme, 'matrix');
  assert.match((result as { hint: string }).hint, /sudo make me a sandwich/);
});

test('theme konami before unlock shows the konami code hint', () => {
  const { ctx } = mkCtx({ unlocked: [] });
  const result = theme.run(['konami'], ctx) as { type: string; hint?: string };
  assert.equal(result.type, 'error');
  assert.match((result as { hint: string }).hint, /up up down down left right left right b a/);
});

test('theme <hidden> after unlock switches', () => {
  const { ctx, getState } = mkCtx({ unlocked: ['sandwich'] });
  const result = theme.run(['sandwich'], ctx) as { type: 'echo'; text: string };
  assert.equal(result.type, 'echo');
  assert.equal(getState().theme, 'sandwich');
});

test('theme random includes unlocked hidden themes', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const { ctx, getState } = mkCtx({ theme: 'matrix', unlocked: ['sandwich', 'lazy'] });
    theme.run(['random'], ctx);
    seen.add(getState().theme);
  }
  // probabilistically must hit at least one hidden theme across 200 picks
  assert.ok(seen.has('sandwich') || seen.has('lazy'),
    `expected random to pick from unlocked hidden themes, got ${[...seen].join(',')}`);
});

test('theme random excludes locked hidden themes', () => {
  for (let i = 0; i < 200; i++) {
    const { ctx, getState } = mkCtx({ theme: 'matrix', unlocked: [] });
    theme.run(['random'], ctx);
    assert.ok(!['sandwich', 'lazy', 'konami', 'hacker'].includes(getState().theme));
  }
});

test('theme hacker before unlock shows composite hint', () => {
  const { ctx } = mkCtx({ unlocked: [] });
  const result = theme.run(['hacker'], ctx) as { type: string; hint?: string };
  assert.equal(result.type, 'error');
  assert.match((result as { hint: string }).hint, /unlock the other four/);
});
```

Run: `pnpm test tests/unit/commands/theme.test.ts`. Expect: many failures.

- [ ] **8.2** Replace `src/terminal/commands/theme.ts`:

```ts
import { defineCommand } from '../core/types.js';
import { VISIBLE_THEMES, isVisibleTheme } from '../themes/registry.js';
import {
  HIDDEN_THEMES,
  ALL_THEMES,
  isHiddenTheme,
  isKnownTheme,
  isUnlocked,
  UNLOCK_CONDITIONS,
} from '../themes/unlocks.js';

function unlockedCount(state: { unlocked: readonly string[] }): number {
  // visible themes are always available; count visible + hidden entries that resolve unlocked
  let n = VISIBLE_THEMES.length;
  for (const h of HIDDEN_THEMES) {
    // pure-state check (no time env) — listing reflects persistent unlocks only
    if (state.unlocked.includes(h)) n++;
  }
  return n;
}

function listingMarker(theme: string, unlocked: readonly string[]): string {
  if (isVisibleTheme(theme)) return '';
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
      // locked
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
```

- [ ] **8.3** Update `Shell.tsx` tab completion (line ~265) to include all known theme names:

Replace:
```ts
if (cmd === 'theme') {
  const names = [...VISIBLE_THEMES, 'next', 'random', 'reset'];
  const match = names.find(n => n.startsWith(partialArg));
  return match !== undefined ? `${cmd} ${match}` : null;
}
```
with:
```ts
if (cmd === 'theme') {
  const names = [...ALL_THEMES, 'next', 'random', 'reset'];
  const match = names.find(n => n.startsWith(partialArg));
  return match !== undefined ? `${cmd} ${match}` : null;
}
```
And add `import { ALL_THEMES } from './themes/unlocks.js';` near the registry import.

Run: `pnpm test tests/unit/commands/theme.test.ts`. Expect: pass.

- [ ] **8.4** `pnpm typecheck && pnpm lint && pnpm test`. Expect: all green.

- [ ] **8.5** Commit:

```
feat(theme): list/switch/random handle hidden themes with lock hints
```

---

### Task 9 — Wire into Shell.tsx (Konami listener, persistence, HackerRain)

- [ ] **9.1** Create `src/terminal/components/HackerRain.tsx`:

```tsx
import { useEffect, useRef } from 'react';

interface Props { active: boolean; }

export default function HackerRain({ active }: Props): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14 * dpr;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = new Array<number>(cols).fill(1);
    const glyphs = 'アイウエオカキクケコサシスセソ0123456789ABCDEF';

    let last = 0;
    const tick = (t: number) => {
      if (t - last > 60) {
        last = t;
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff41';
        ctx.font = `${fontSize}px 'Courier New', monospace`;
        for (let i = 0; i < drops.length; i++) {
          const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;
  if (typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }
  return <canvas ref={canvasRef} className="terminal__hacker-rain" aria-hidden="true" />;
}
```

- [ ] **9.2** Edit `src/terminal/Shell.tsx`:

  1. Add imports near the top:
  ```ts
  import HackerRain from './components/HackerRain.js';
  import { useKonami } from './hooks/useKonami.js';
  import { loadTheme, saveTheme, loadUnlocked, saveUnlocked, useStorageSync }
    from './hooks/useTheme.js';
  import { ALL_THEMES } from './themes/unlocks.js';
  ```
  (replacing the existing `useTheme` import line and `VISIBLE_THEMES` import as needed)

  2. Update lazy reducer init (around line 121):
  ```ts
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...INIT_STATE,
    shell: {
      ...INIT_STATE.shell,
      theme:    loadTheme(),
      unlocked: loadUnlocked(),
    },
  }));
  ```

  3. Add a persistence effect for `unlocked` next to the existing `saveTheme` effect:
  ```ts
  useEffect(() => {
    saveUnlocked(state.shell.unlocked);
  }, [state.shell.unlocked]);
  ```

  4. Extend `useStorageSync` call:
  ```ts
  useStorageSync(
    useCallback((theme: string) => {
      dispatch({ type: 'SET_SHELL', update: { theme } });
    }, []),
    useCallback((unlocked: string[]) => {
      dispatch({ type: 'SET_SHELL', update: { unlocked } });
    }, []),
  );
  ```

  5. Wire Konami:
  ```ts
  useKonami(useCallback(() => {
    dispatch({
      type:   'SET_SHELL',
      update: {
        unlocked: state.shell.unlocked.includes('konami')
          ? state.shell.unlocked
          : [...state.shell.unlocked, 'konami'],
      },
    });
  }, [state.shell.unlocked]));
  ```

  6. Update the status line `found:` (line ~274) to use derived count:
  ```ts
  const foundCount = 6 + shell.unlocked.filter(
    u => ['sandwich', 'lazy', 'konami'].includes(u),
  ).length + (
    // hacker counts when prerequisites are met (composite, not stored)
    ['sandwich', 'lazy', 'konami'].every(r => shell.unlocked.includes(r)) ? 1 : 0
  );
  // night is environmental; not counted in `found` (matches spec — found = unlocked persistent)
  const statusText = `shell: unix · theme: ${shell.theme} · lang: ${shell.lang} · found: ${foundCount}/11`;
  ```

  7. Mount `HackerRain` inside the terminal div, before the conditional pager render:
  ```tsx
  <HackerRain active={shell.theme === 'hacker'} />
  ```

- [ ] **9.3** Run `pnpm typecheck && pnpm lint && pnpm test`. Expect: all green.

- [ ] **9.4** Manual smoke (the worker should `pnpm dev` and verify) — for the verification log only:
  - Type `sudo make me a sandwich` → echoed, then `theme sandwich` switches.
  - Run `uptime` 3× → 3rd output mentions lazy unlock.
  - Press Konami sequence anywhere → `theme konami` becomes available.
  - Set system clock to 23:00 (or rely on `Date` mock) → `theme night` switches.
  - With all 4 unlocked, `theme hacker` switches and canvas appears (unless prefers-reduced-motion).
  - Reload → all unlocks persist; `found: X/11` reflects state.

- [ ] **9.5** Commit:

```
feat(shell): wire Konami listener, unlock persistence, hacker rain canvas
```

---

### Task 10 — Extend WCAG contrast test to all 11 themes

- [ ] **10.1** Edit `tests/unit/theme-contrast.test.ts`. Replace the registry import:

```ts
import { ALL_THEMES } from '../../src/terminal/themes/unlocks.js';
```

And replace `for (const theme of VISIBLE_THEMES)` with:

```ts
for (const theme of ALL_THEMES) {
```

- [ ] **10.2** Run `pnpm test tests/unit/theme-contrast.test.ts`. Expect: 22 tests (11 themes × 2 assertions) all green. If any hidden theme fails, adjust its hex values in the corresponding `.css` file. Acceptable adjustment policy:
  - `sandwich`: darken `--t-fg` toward `#2a1a0c` if needed.
  - `night`: lighten `--t-fg` toward `#d4d4ee` if needed.
  - `lazy`: lighten `--t-fg` toward `#f0e0c0` if needed.
  - `konami`: deepen `--t-bg` toward `#0f0520` if needed.
  - `hacker`: bg is already `#000`, fg is bright matrix green — should pass.

- [ ] **10.3** `pnpm typecheck && pnpm lint && pnpm test`. Expect: all green.

- [ ] **10.4** Commit:

```
test(themes): extend WCAG contrast gate to all 11 themes
```

---

### Task 11 — Full verification

- [ ] **11.1** Run the full gate sequence:

```
pnpm typecheck
pnpm lint
pnpm test
pnpm test:a11y
pnpm build
```

Each must exit zero. Capture the output for the BUG report.

- [ ] **11.2** Spec compliance checklist (verify every line; do NOT mark complete unless verified):
  - [ ] All 11 themes present in `ALL_THEMES` and `themes/styles/index.css`.
  - [ ] `sudo make me a sandwich` unlocks sandwich; persists across reload.
  - [ ] `theme night` works only between 22:00 and 06:00 local; otherwise locked with `[10pm-6am]` hint.
  - [ ] Three `uptime` calls in one session unlock lazy; persists across reload; counter resets on reload.
  - [ ] Konami sequence anywhere on the page unlocks konami; persists across reload.
  - [ ] After all 4 above are unlocked, `theme hacker` switches and renders the canvas.
  - [ ] `theme konami` before unlock prints `up up down down left right left right b a` in the hint.
  - [ ] `found: X/11` increments on each unlock, reflects current state on reload.
  - [ ] Matrix rain canvas absent from DOM under `prefers-reduced-motion: reduce` (verify by toggling OS setting OR by checking that `HackerRain` returns `null` when `mq.matches`).
  - [ ] WCAG contrast test runs against all 11 themes and passes.
  - [ ] No hardcoded secrets, no new external dependencies, no commits without review.

- [ ] **11.3** Generate BUG report:

```
Build: PASS | Types: PASS | Lint: PASS
Tests: X/Y passed, 100% | Security: PASS | Diff: N files
Overall: READY
```

- [ ] **11.4** Final commit (only if any small fixes were applied during 11.x):

```
chore(m5): final verification pass — all 11 themes shipping
```

---

## Out of scope (deferred)

- Animated transitions for non-hacker theme entry beyond M4's existing 250ms fade.
- Sharing/syncing unlocks across devices (no backend).
- Achievements UI showing the unlock conditions before discovery (would defeat the discovery aspect).
- `night` being remembered as "unlocked" — by design it is environmental; the spec calls for it to be available *when* the time matches.
