import { assert } from 'poku';
import ls from '../../../src/terminal/commands/ls.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-23T00:00:00.000Z',
  posts: [
    { slug: 'debouncing', lang: 'en', title: 'Debouncing', date: '2025-03-10',
      tags: ['react'], dek: 'x', readingTime: 3, featured: false, draft: false, body: '' },
    { slug: 'telemetry', lang: 'en', title: 'Telemetry', date: '2025-06-15',
      tags: ['observability'], dek: 'x', readingTime: 4, featured: false, draft: false, body: '' },
  ],
  projects: [],
  talks: [],
  uses: { body: '' },
  now: { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false },
  setState: () => {},
};

// ls from ~
const r1 = ls.run([], ctx);
const res1 = r1 instanceof Promise ? await r1 : r1;
assert.strictEqual(res1.type, 'echo', 'ls ~ returns echo listing directories');
if (res1.type === 'echo') {
  assert.ok(res1.text.includes('blog'), 'ls ~ includes blog');
  assert.ok(res1.text.includes('projects'), 'ls ~ includes projects');
}

// ls from blog (post list)
ctx.state = { ...ctx.state, cwd: 'blog' };
const r2 = ls.run([], ctx);
const res2 = r2 instanceof Promise ? await r2 : r2;
assert.strictEqual(res2.type, 'post-list', 'ls blog returns post-list');
if (res2.type === 'post-list') {
  assert.strictEqual(res2.items.length, 2, 'ls blog returns 2 EN posts');
}

console.log('commands/ls: all tests passed');
