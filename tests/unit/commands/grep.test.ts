import { assert } from 'poku';
import grep from '../../../src/terminal/commands/grep.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-24T00:00:00.000Z',
  posts: [
    {
      slug: 'postgres-guide', lang: 'en', title: 'Postgres Guide',
      date: '2025-01-10', tags: ['postgres', 'db'], dek: 'A postgres guide',
      readingTime: 5, featured: false, draft: false,
      body: 'This post covers postgres performance tuning and indexing strategies.',
    },
    {
      slug: 'react-hooks', lang: 'en', title: 'React Hooks',
      date: '2025-03-01', tags: ['react'], dek: 'React hooks deep dive',
      readingTime: 4, featured: false, draft: false,
      body: 'useEffect and useState are the most used hooks in React.',
    },
    {
      slug: 'draft-post', lang: 'en', title: 'Draft',
      date: '2025-04-01', tags: [], dek: 'x',
      readingTime: 1, featured: false, draft: true,
      body: 'postgres is mentioned here too but this is a draft',
    },
  ],
  projects: [], talks: [],
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

// grep with no args -> error
const r0 = await grep.run([], ctx);
assert.strictEqual(r0.type, 'error', 'grep with no args returns error');

// grep postgres -> matches postgres-guide, skips draft
const r1 = await grep.run(['postgres'], ctx);
assert.strictEqual(r1.type, 'grep-result', 'grep returns grep-result');
if (r1.type === 'grep-result') {
  assert.strictEqual(r1.matches.length, 1, 'grep finds 1 match (draft excluded)');
  assert.strictEqual(r1.matches[0].slug, 'postgres-guide', 'match slug is postgres-guide');
  assert.ok(r1.matches[0].excerpt.length > 0, 'match has non-empty excerpt');
  assert.ok(r1.matches[0].matchStart >= 0, 'matchStart is non-negative');
  assert.ok(r1.matches[0].matchEnd > r1.matches[0].matchStart, 'matchEnd > matchStart');
}

// grep react -> matches react-hooks
const r2 = await grep.run(['react'], ctx);
assert.strictEqual(r2.type, 'grep-result', 'grep react returns grep-result');
if (r2.type === 'grep-result') {
  assert.ok(r2.matches.length >= 1, 'grep react finds at least 1 match');
  const slugs = r2.matches.map(m => m.slug);
  assert.ok(slugs.includes('react-hooks'), 'grep react includes react-hooks');
}

// grep nonexistent -> grep-result with empty matches
const r3 = await grep.run(['xyzzy12345'], ctx);
assert.strictEqual(r3.type, 'grep-result', 'grep no-match returns grep-result');
if (r3.type === 'grep-result') {
  assert.strictEqual(r3.matches.length, 0, 'grep no-match has empty matches array');
}

// excerpt window: matchStart/matchEnd within excerpt bounds
const r4 = await grep.run(['postgres'], ctx);
if (r4.type === 'grep-result' && r4.matches.length > 0) {
  const m = r4.matches[0];
  assert.ok(m.matchEnd <= m.excerpt.length, 'matchEnd is within excerpt bounds');
  const matched = m.excerpt.slice(m.matchStart, m.matchEnd);
  assert.ok(matched.toLowerCase().includes('postgres'), 'excerpt slice contains the match');
}

console.log('commands/grep: all tests passed');
