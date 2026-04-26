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
