import { assert } from 'poku';
import lang from '../../../src/terminal/commands/lang.js';
import type { Context, ShellState } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

let capturedState: Partial<ShellState> = {};

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: (update) => { capturedState = update; },
};

// No args — show current
const showResult = lang.run([], ctx);
const resolved = showResult instanceof Promise ? await showResult : showResult;
assert.strictEqual(resolved.type, 'echo', 'lang with no args returns echo');
if (resolved.type === 'echo') {
  assert.ok(resolved.text.includes('en'), 'shows current language');
}

// Switch to pt
capturedState = {};
const ptResult = lang.run(['pt'], ctx);
const ptResolved = ptResult instanceof Promise ? await ptResult : ptResult;
assert.strictEqual(ptResolved.type, 'echo', 'lang pt returns echo');
assert.deepStrictEqual(capturedState, { lang: 'pt' }, 'setState called with lang: pt');

// Invalid lang
const badResult = lang.run(['fr'], ctx);
const badResolved = badResult instanceof Promise ? await badResult : badResult;
assert.strictEqual(badResolved.type, 'error', 'invalid lang returns error');

console.log('commands/lang: all tests passed');
