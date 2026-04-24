import { assert } from 'poku';
import cat from '../../../src/terminal/commands/cat.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const longBody = Array(35).fill('A paragraph of text.').join('\n\n');

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-23T00:00:00.000Z',
  posts: [
    { slug: 'debouncing', lang: 'en', title: 'Debouncing', date: '2025-03-10',
      tags: ['react'], dek: 'x', readingTime: 3, featured: false, draft: false, body: 'Short body.' },
    { slug: 'long-post', lang: 'en', title: 'Long Post', date: '2025-04-01',
      tags: [], dek: 'y', readingTime: 10, featured: false, draft: false, body: longBody },
  ],
  projects: [],
  talks: [],
  uses: { body: 'Uses content.' },
  now: { updated: '2026-04-23', location: 'Brooklyn', building: 'x', reading: 'x', listening: 'x', learning: 'x', lookingFor: 'x', body: 'Now content.' },
  about: { en: { body: 'About EN.' }, pt: { body: '' } },
  resume: { body: 'Resume content.' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: () => {},
};

// cat blog/debouncing (short — post-view)
const r1 = await cat.run(['blog/debouncing'], ctx);
assert.strictEqual(r1.type, 'post-view', 'short post returns post-view');
if (r1.type === 'post-view') {
  assert.strictEqual(r1.post.slug, 'debouncing', 'post-view has correct slug');
}

// cat blog/long-post (>30 blocks — pager)
const r2 = await cat.run(['blog/long-post'], ctx);
assert.strictEqual(r2.type, 'pager', 'post with >30 blocks returns pager');
if (r2.type === 'pager') {
  assert.ok(r2.blocks.length > 30, 'pager has >30 blocks');
  assert.strictEqual(r2.title, 'Long Post', 'pager title matches post title');
}

// cat nonexistent
const r3 = await cat.run(['blog/missing'], ctx);
assert.strictEqual(r3.type, 'error', 'missing post returns error');
if (r3.type === 'error') {
  assert.strictEqual(r3.code, 'ENOENT', 'error code ENOENT');
}

// cat uses
const r4 = await cat.run(['uses'], ctx);
assert.strictEqual(r4.type, 'pager', 'cat uses returns pager');

// cat about
const r5 = await cat.run(['about'], ctx);
assert.strictEqual(r5.type, 'pager', 'cat about returns pager');

console.log('commands/cat: all tests passed');
