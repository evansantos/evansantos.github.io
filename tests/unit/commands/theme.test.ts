import { test } from 'poku';
import assert from 'node:assert/strict';
import theme from '../../../src/terminal/commands/theme.js';
import { Store } from '../../../src/terminal/core/content.js';
import type { ShellState, Context } from '../../../src/terminal/core/types.js';
import { HIDDEN_THEMES } from '../../../src/terminal/themes/unlocks.js';

function mkCtx(initial: Partial<ShellState> = {}): {
  ctx: Context;
  getState: () => ShellState;
} {
  let state: ShellState = {
    cwd: '~', lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false,
    ...initial,
  };
  const ctx: Context = {
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
  const result = theme.run([], ctx) as { type: 'echo'; text: string };
  assert.equal(result.type, 'echo');
  const text = result.text;
  assert.match(text, /matrix/);
  assert.match(text, /amber/);
  assert.match(text, /nord/);
  assert.match(text, /solarized/);
  assert.match(text, /paper/);
  assert.match(text, /synthwave/);
  assert.match(text, /▶\s+nord/);
  assert.match(text, /current: nord/);
  assert.match(text, /found: 6\/11/);
});

test('theme <name> switches to a valid theme', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix' });
  const result = theme.run(['amber'], ctx) as { type: 'echo'; text: string };
  assert.equal(getState().theme, 'amber');
  assert.equal(result.type, 'echo');
  assert.match(result.text, /theme → amber/);
});

test('theme <name> rejects unknown theme and does not mutate state', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix' });
  const result = theme.run(['dracula'], ctx) as { type: string };
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

// --- New M5 tests ---

test('theme listing includes hidden themes with [locked] markers when not unlocked', () => {
  const { ctx } = mkCtx({ unlocked: [] });
  const result = theme.run([], ctx) as { type: 'echo'; text: string };
  for (const h of HIDDEN_THEMES) {
    if (h === 'night') continue;
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
  assert.match(result.text, /found: 8\/11/);
});

test('theme <locked> shows hint and does not switch', () => {
  const { ctx, getState } = mkCtx({ theme: 'matrix', unlocked: [] });
  const result = theme.run(['sandwich'], ctx) as { type: string; hint?: string };
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
