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
  const result = sudo.run(['make', 'me', 'a', 'sandwich'], ctx) as { type: 'echo'; text: string };
  assert.equal(result.type, 'echo');
  assert.match(result.text, /sandwich/i);
  assert.deepEqual(getState().unlocked, ['sandwich']);
});

test('sudo make me a sandwich is idempotent', () => {
  const { ctx, getState } = mkCtx({ unlocked: ['sandwich'] });
  sudo.run(['make', 'me', 'a', 'sandwich'], ctx);
  assert.deepEqual(getState().unlocked, ['sandwich']);
});

test('sudo without args returns the canonical error', () => {
  const { ctx, getState } = mkCtx();
  const result = sudo.run([], ctx) as { type: string };
  assert.equal(result.type, 'error');
  assert.deepEqual(getState().unlocked, []);
});

test('sudo make me a coffee returns error and does not unlock', () => {
  const { ctx, getState } = mkCtx();
  const result = sudo.run(['make', 'me', 'a', 'coffee'], ctx) as { type: string };
  assert.equal(result.type, 'error');
  assert.deepEqual(getState().unlocked, []);
});

test('sudo preserves other unlocked entries when adding sandwich', () => {
  const { ctx, getState } = mkCtx({ unlocked: ['konami'] });
  sudo.run(['make', 'me', 'a', 'sandwich'], ctx);
  assert.deepEqual(getState().unlocked.sort(), ['konami', 'sandwich']);
});
