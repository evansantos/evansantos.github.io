import { assert } from 'poku';
import help from '../../../src/terminal/commands/help.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: () => {},
};

const result = help.run([], ctx);
assert.ok(
  result instanceof Promise || (typeof result === 'object' && 'type' in result),
  'help returns a Result'
);
const resolved = result instanceof Promise ? await result : result;
assert.strictEqual(resolved.type, 'echo', 'help returns echo result');
if (resolved.type === 'echo') {
  assert.ok(resolved.text.includes('help'), 'help output mentions help command');
  assert.ok(resolved.text.includes('ls'), 'help output mentions ls command');
}

console.log('commands/help: all tests passed');
