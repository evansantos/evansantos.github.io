import { assert } from 'poku';
import rm     from '../../../src/terminal/commands/rm.js';
import vim    from '../../../src/terminal/commands/vim.js';
import nano   from '../../../src/terminal/commands/nano.js';
import emacs  from '../../../src/terminal/commands/emacs.js';
import exit   from '../../../src/terminal/commands/exit.js';
import quit   from '../../../src/terminal/commands/quit.js';
import logout from '../../../src/terminal/commands/logout.js';
import cat    from '../../../src/terminal/commands/cat.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-26T00:00:00.000Z',
  posts: [], projects: [], talks: [],
  uses: { body: '' },
  now:  { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false },
  setState: () => {},
};

// ─── rm ──────────────────────────────────────────────────────────────────────
const rmRes = await Promise.resolve(rm.run(['-rf', '/'], ctx));
assert.strictEqual(rmRes.type, 'error', 'rm returns error');
if (rmRes.type === 'error') {
  assert.ok(/operation not permitted/i.test(rmRes.text), 'rm denies politely');
  assert.ok(/all I have/i.test(rmRes.text),               'rm includes signature line');
  assert.strictEqual(rmRes.exitCode, 1,                   'rm exits with code 1');
}

// ─── vim / nano / emacs ──────────────────────────────────────────────────────
for (const editor of [vim, nano, emacs]) {
  const r = await Promise.resolve(editor.run([], ctx));
  assert.strictEqual(r.type, 'echo', `${editor.name} returns echo`);
  if (r.type === 'echo') {
    assert.ok(r.text.includes(editor.name),     `${editor.name} mentions itself`);
    assert.ok(/use:\s+cat/i.test(r.text),        `${editor.name} hints at cat`);
  }
}

// ─── exit / quit / logout ────────────────────────────────────────────────────
for (const cmd of [exit, quit, logout]) {
  const r = await Promise.resolve(cmd.run([], ctx));
  assert.strictEqual(r.type, 'echo', `${cmd.name} returns echo`);
  if (r.type === 'echo') {
    assert.ok(/no exit/i.test(r.text), `${cmd.name} replies with no-exit line`);
    assert.ok(r.text.includes('~'),    `${cmd.name} mentions ~`);
  }
}

// ─── cat .bashrc ─────────────────────────────────────────────────────────────
const bashrc = await cat.run(['.bashrc'], ctx);
assert.strictEqual(bashrc.type, 'echo', 'cat .bashrc returns echo (not error)');
if (bashrc.type === 'echo') {
  assert.ok(/alias/i.test(bashrc.text), 'cat .bashrc shows aliases');
}

console.log('commands/jokes: all tests passed');
