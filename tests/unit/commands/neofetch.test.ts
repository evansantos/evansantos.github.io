import { assert } from 'poku';
import neofetch from '../../../src/terminal/commands/neofetch.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'pt', theme: 'amber', found: 3, unlocked: [], degraded: false },
  setState: () => {},
};

const r = await Promise.resolve(neofetch.run([], ctx));
assert.strictEqual(r.type, 'neofetch', 'returns neofetch result');
if (r.type === 'neofetch') {
  const d = r.data;
  assert.strictEqual(d.name,     'evandro santos',         'name');
  assert.ok(d.title.length > 0,                            'title set');
  assert.strictEqual(d.location, 'Brooklyn, NYC',          'location');
  assert.strictEqual(d.lang,     'pt',                     'lang reflects state');
  assert.strictEqual(d.theme,    'amber',                  'theme reflects state');
  assert.strictEqual(d.found,    '3/11',                   'found counter');
  assert.strictEqual(d.shell,    'evandosh 1.0',           'shell label');
  assert.ok(/year/i.test(d.uptime),                        'uptime mentions years');
}

console.log('commands/neofetch: all tests passed');
