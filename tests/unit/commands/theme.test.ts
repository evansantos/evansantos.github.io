import { test } from 'poku';
import assert from 'node:assert/strict';
import theme from '../../../src/terminal/commands/theme.js';
import { Store } from '../../../src/terminal/core/content.js';
import type { ShellState, Context } from '../../../src/terminal/core/types.js';

function mkCtx(initial: Partial<ShellState> = {}): {
  ctx: Context;
  getState: () => ShellState;
} {
  let state: ShellState = {
    cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false,
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
  assert.match(text, /found: 0\/11/);
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
