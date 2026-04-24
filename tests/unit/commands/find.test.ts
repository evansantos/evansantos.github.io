import { assert } from 'poku';
import find from '../../../src/terminal/commands/find.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-24T00:00:00.000Z',
  posts: [
    { slug: 'ai-embeddings', lang: 'en', title: 'AI Embeddings',
      date: '2025-06-01', tags: ['ai', 'ml'], dek: 'x',
      readingTime: 5, featured: false, draft: false, body: '' },
    { slug: 'postgres-tips', lang: 'en', title: 'Postgres Tips',
      date: '2025-02-15', tags: ['postgres'], dek: 'x',
      readingTime: 3, featured: false, draft: false, body: '' },
    { slug: 'ai-agents-pt', lang: 'pt', title: 'Agentes AI',
      date: '2025-07-10', tags: ['ai'], dek: 'x',
      readingTime: 4, featured: false, draft: false, body: '' },
    { slug: 'react-perf', lang: 'en', title: 'React Performance',
      date: '2024-11-20', tags: ['react', 'performance'], dek: 'x',
      readingTime: 6, featured: false, draft: false, body: '' },
    { slug: 'draft-ai', lang: 'en', title: 'Draft AI',
      date: '2025-08-01', tags: ['ai'], dek: 'x',
      readingTime: 2, featured: false, draft: true, body: '' },
  ],
  projects: [], talks: [],
  uses: { body: '' },
  now: { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: () => {},
};

// find blog (no filters) -> all EN non-draft posts
const r1 = await find.run(['blog'], ctx);
assert.strictEqual(r1.type, 'post-list', 'find blog returns post-list');
if (r1.type === 'post-list') {
  assert.strictEqual(r1.items.length, 3, 'find blog returns 3 EN posts (draft excluded)');
}

// find blog -tag ai -> EN posts tagged ai
const r2 = await find.run(['blog', '-tag', 'ai'], ctx);
assert.strictEqual(r2.type, 'post-list', 'find blog -tag ai returns post-list');
if (r2.type === 'post-list') {
  assert.strictEqual(r2.items.length, 1, 'only 1 EN post tagged ai (ai-embeddings)');
  assert.strictEqual(r2.items[0].slug, 'ai-embeddings', 'correct post slug');
}

// find blog -lang pt -> PT posts
const r3 = await find.run(['blog', '-lang', 'pt'], ctx);
assert.strictEqual(r3.type, 'post-list', 'find blog -lang pt returns post-list');
if (r3.type === 'post-list') {
  assert.strictEqual(r3.items.length, 1, 'find -lang pt returns 1 pt post');
  assert.strictEqual(r3.items[0].lang, 'pt', 'post lang is pt');
}

// find blog -tag ai -lang en
const r4 = await find.run(['blog', '-tag', 'ai', '-lang', 'en'], ctx);
assert.strictEqual(r4.type, 'post-list', 'find blog -tag ai -lang en returns post-list');
if (r4.type === 'post-list') {
  assert.strictEqual(r4.items.length, 1, '-tag ai -lang en -> 1 post');
  assert.strictEqual(r4.items[0].slug, 'ai-embeddings', 'slug is ai-embeddings');
}

// find blog -after 2025-05-01 -> posts after date
const r5 = await find.run(['blog', '-after', '2025-05-01'], ctx);
assert.strictEqual(r5.type, 'post-list', 'find -after returns post-list');
if (r5.type === 'post-list') {
  const slugs = r5.items.map(p => p.slug);
  assert.ok(slugs.includes('ai-embeddings'), '-after includes ai-embeddings (2025-06-01)');
  assert.ok(!slugs.includes('postgres-tips'), '-after excludes postgres-tips (2025-02-15)');
  assert.ok(!slugs.includes('react-perf'), '-after excludes react-perf (2024-11-20)');
}

// find blog -before 2025-03-01 -> posts strictly before date
const r6 = await find.run(['blog', '-before', '2025-03-01'], ctx);
assert.strictEqual(r6.type, 'post-list', 'find -before returns post-list');
if (r6.type === 'post-list') {
  const slugs = r6.items.map(p => p.slug);
  assert.ok(slugs.includes('react-perf'), '-before includes react-perf (2024-11-20)');
  assert.ok(slugs.includes('postgres-tips'), '-before includes postgres-tips (2025-02-15)');
  assert.ok(!slugs.includes('ai-embeddings'), '-before excludes ai-embeddings (2025-06-01)');
}

// find blog -name ai* glob
const r7 = await find.run(['blog', '-name', 'ai*'], ctx);
assert.strictEqual(r7.type, 'post-list', 'find -name glob returns post-list');
if (r7.type === 'post-list') {
  assert.strictEqual(r7.items.length, 1, '-name ai* matches 1 EN post');
  assert.strictEqual(r7.items[0].slug, 'ai-embeddings', '-name ai* slug correct');
}

// find with no directory -> error
const r8 = await find.run([], ctx);
assert.strictEqual(r8.type, 'error', 'find with no args returns error');

console.log('commands/find: all tests passed');
