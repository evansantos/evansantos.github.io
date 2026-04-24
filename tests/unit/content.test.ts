import { assert } from 'poku';
import { Store } from '../../src/terminal/core/content.js';
import type { ContentFixture } from '../../src/terminal/core/types.js';

const mockFixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-23T00:00:00.000Z',
  posts: [
    {
      slug: 'debouncing', lang: 'en', title: 'Debouncing', date: '2025-03-10',
      tags: ['react'], dek: 'A dek.', readingTime: 3, featured: true, draft: false,
      body: 'Body text.',
    },
    {
      slug: 'debouncing-pt', lang: 'pt', title: 'Debouncing PT', date: '2025-03-10',
      tags: ['react'], dek: 'Um dek.', readingTime: 3, featured: false, draft: false,
      translationOf: 'debouncing', body: 'Corpo.',
    },
    {
      slug: 'draft-post', lang: 'en', title: 'Draft', date: '2025-01-01',
      tags: [], dek: 'x', readingTime: 1, featured: false, draft: true, body: '',
    },
  ],
  projects: [],
  talks: [],
  uses: { body: 'Uses body.' },
  now: { updated: '2026-04-23', location: 'Brooklyn', building: 'evandro.dev', reading: 'x', listening: 'x', learning: 'x', lookingFor: 'x', body: '' },
  about: { en: { body: 'About EN.' }, pt: { body: 'About PT.' } },
  resume: { body: 'Resume.' },
};

// Non-degraded store
const store = new Store(mockFixture);

assert.strictEqual(store.degraded, false, 'store is not degraded with fixture');
assert.strictEqual(store.posts('en').length, 1, 'posts(en) returns 1 non-draft EN post');
assert.strictEqual(store.posts('pt').length, 1, 'posts(pt) returns 1 non-draft PT post');
assert.strictEqual(store.posts('en')[0].slug, 'debouncing', 'EN post slug matches');

const found = store.post('en', 'debouncing');
assert.strictEqual(found?.title, 'Debouncing', 'post() finds by lang + slug');

const missing = store.post('en', 'nonexistent');
assert.strictEqual(missing, undefined, 'post() returns undefined for missing slug');

const draftAttempt = store.post('en', 'draft-post');
assert.strictEqual(draftAttempt, undefined, 'post() does not return draft posts');

// Async loadPost
const loaded = await store.loadPost('debouncing');
assert.strictEqual(loaded?.title, 'Debouncing', 'loadPost finds post by slug');

assert.strictEqual(store.uses().body, 'Uses body.', 'uses() returns uses page');
assert.strictEqual(store.about('en').body, 'About EN.', 'about(en) returns EN about');
assert.strictEqual(store.about('pt').body, 'About PT.', 'about(pt) returns PT about');
assert.strictEqual(store.resume().body, 'Resume.', 'resume() returns resume');

// Degraded store
const degraded = new Store(null);
assert.strictEqual(degraded.degraded, true, 'null fixture → degraded');
assert.deepStrictEqual(degraded.posts('en'), [], 'degraded: posts returns empty array');
assert.strictEqual(degraded.post('en', 'anything'), undefined, 'degraded: post returns undefined');
assert.strictEqual(degraded.uses().body, '', 'degraded: uses returns empty body');

console.log('content: all tests passed');
