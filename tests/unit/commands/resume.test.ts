import { assert } from 'poku';
import resume from '../../../src/terminal/commands/resume.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-26T00:00:00.000Z',
  posts: [], projects: [], talks: [],
  uses: { body: '' },
  now:  { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '# Evandro Santos\n\nSenior Engineer\n\n## Experience\n\nCox Enterprises — 2023-Present' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false },
  setState: () => {},
};

// resume → pager
const r1 = await Promise.resolve(resume.run([], ctx));
assert.strictEqual(r1.type, 'pager', 'resume returns pager');
if (r1.type === 'pager') {
  assert.strictEqual(r1.title, 'Resume', 'pager titled "Resume"');
  assert.ok(r1.blocks.length > 0, 'parsed at least one block');
}

// resume --print → navigate
const r2 = await Promise.resolve(resume.run(['--print'], ctx));
assert.strictEqual(r2.type, 'navigate', '--print returns navigate');
if (r2.type === 'navigate') {
  assert.strictEqual(r2.href,   '/evandro-cv.pdf',  'href = /evandro-cv.pdf');
  assert.strictEqual(r2.target, '_blank',           'opens in new tab');
}

console.log('commands/resume: all tests passed');
