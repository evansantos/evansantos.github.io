import { assert } from 'poku';
import head from '../../../src/terminal/commands/head.js';
import tail from '../../../src/terminal/commands/tail.js';
import wc   from '../../../src/terminal/commands/wc.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const body = [
  '# Title',
  '',
  'First paragraph with some content.',
  '',
  'Second paragraph goes here.',
  '',
  'Third paragraph of text.',
  '',
  'Fourth paragraph details.',
  '',
  'Fifth paragraph concludes.',
].join('\n');

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-24T00:00:00.000Z',
  posts: [
    { slug: 'debouncing', lang: 'en', title: 'Debouncing', date: '2025-03-10',
      tags: ['react'], dek: 'x', readingTime: 3, featured: false, draft: false, body },
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

// head debouncing (default 10 blocks)
const h1 = await head.run(['debouncing'], ctx);
assert.strictEqual(h1.type, 'post-view', 'head default returns post-view');

// head -3 debouncing -> first 3 blocks
const h2 = await head.run(['-3', 'debouncing'], ctx);
assert.strictEqual(h2.type, 'post-view', 'head -3 returns post-view');
if (h2.type === 'post-view') {
  const { parseMarkdownBlocks } = await import('../../../src/terminal/core/markdown.js');
  const blocks = parseMarkdownBlocks(h2.post.body);
  assert.ok(blocks.length <= 3, 'head -3 gives at most 3 blocks');
}

// head missing slug -> error
const h3 = await head.run(['nonexistent-slug'], ctx);
assert.strictEqual(h3.type, 'error', 'head missing slug returns error');
if (h3.type === 'error') {
  assert.strictEqual(h3.code, 'ENOENT', 'head error code is ENOENT');
}

// head no args -> error
const h4 = await head.run([], ctx);
assert.strictEqual(h4.type, 'error', 'head no args returns error');

// tail debouncing (default 10 blocks)
const t1 = await tail.run(['debouncing'], ctx);
assert.strictEqual(t1.type, 'post-view', 'tail default returns post-view');

// tail -2 debouncing -> last 2 blocks
const t2 = await tail.run(['-2', 'debouncing'], ctx);
assert.strictEqual(t2.type, 'post-view', 'tail -2 returns post-view');
if (t2.type === 'post-view') {
  const { parseMarkdownBlocks } = await import('../../../src/terminal/core/markdown.js');
  const blocks = parseMarkdownBlocks(t2.post.body);
  assert.ok(blocks.length <= 2, 'tail -2 gives at most 2 blocks');
}

// tail missing -> error
const t3 = await tail.run(['nonexistent-slug'], ctx);
assert.strictEqual(t3.type, 'error', 'tail missing slug returns error');

// wc debouncing -> echo with word count info
const w1 = await wc.run(['debouncing'], ctx);
assert.strictEqual(w1.type, 'echo', 'wc returns echo');
if (w1.type === 'echo') {
  assert.ok(w1.text.includes('debouncing'), 'wc output includes slug');
  assert.ok(/\d+/.test(w1.text), 'wc output contains a number');
}

// wc missing -> error
const w2 = await wc.run(['nonexistent-slug'], ctx);
assert.strictEqual(w2.type, 'error', 'wc missing slug returns error');

// wc no args -> error
const w3 = await wc.run([], ctx);
assert.strictEqual(w3.type, 'error', 'wc no args returns error');

console.log('commands/head: all tests passed');
