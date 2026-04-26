import { assert } from 'poku';
import cd from '../../../src/terminal/commands/cd.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

let cwd = '~';
const ctx: Context = {
  store:    new Store(null),
  state:    { cwd, lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false },
  setState: (update) => { if (update.cwd) cwd = update.cwd; },
};

// cd blog
const r1 = cd.run(['blog'], ctx);
const res1 = r1 instanceof Promise ? await r1 : r1;
assert.strictEqual(res1.type, 'echo', 'cd blog returns echo');
assert.strictEqual(cwd, 'blog', 'setState called with cwd: blog');

// cd ~ (go home)
ctx.state = { ...ctx.state, cwd: 'blog' };
const r2 = cd.run(['~'], ctx);
const res2 = r2 instanceof Promise ? await r2 : r2;
assert.strictEqual(res2.type, 'echo', 'cd ~ returns echo');
assert.strictEqual(cwd, '~', 'setState called with cwd: ~');

// cd .. from blog
ctx.state = { ...ctx.state, cwd: 'blog' };
cwd = 'blog';
const r3 = cd.run(['..'], ctx);
const res3 = r3 instanceof Promise ? await r3 : r3;
assert.strictEqual(cwd, '~', 'cd .. from blog goes to ~');

// cd invalid
ctx.state = { ...ctx.state, cwd: '~' };
const r4 = cd.run(['nonexistent'], ctx);
const res4 = r4 instanceof Promise ? await r4 : r4;
assert.strictEqual(res4.type, 'error', 'cd nonexistent returns error');
if (res4.type === 'error') {
  assert.strictEqual(res4.code, 'ENOENT', 'error code is ENOENT');
}

console.log('commands/cd: all tests passed');
