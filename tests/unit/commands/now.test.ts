import { assert } from 'poku';
import now     from '../../../src/terminal/commands/now.js';
import about   from '../../../src/terminal/commands/about.js';
import contact from '../../../src/terminal/commands/contact.js';
import rss     from '../../../src/terminal/commands/rss.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-24T00:00:00.000Z',
  posts: [],
  projects: [], talks: [],
  uses: { body: '' },
  now: {
    updated: '2026-04-24', location: 'Brooklyn', building: 'evandro.dev',
    reading: 'SICP', listening: 'Metallica', learning: 'Rust', lookingFor: 'next adventure',
    body: '# Now\n\nCurrently building things.',
  },
  about: { en: { body: '# About\n\nSenior engineer.' }, pt: { body: '# Sobre\n\nEngenheiro.' } },
  resume: { body: '' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false },
  setState: () => {},
};

// now -> pager with now content
const r1 = now.run([], ctx);
const res1 = r1 instanceof Promise ? await r1 : r1;
assert.strictEqual(res1.type, 'pager', 'now returns pager');
if (res1.type === 'pager') {
  assert.ok(res1.blocks.length > 0, 'now pager has blocks');
  assert.strictEqual(res1.title, 'Now', 'now pager title is Now');
}

// about -> pager with about content
const r2 = about.run([], ctx);
const res2 = r2 instanceof Promise ? await r2 : r2;
assert.strictEqual(res2.type, 'pager', 'about returns pager');
if (res2.type === 'pager') {
  assert.ok(res2.blocks.length > 0, 'about pager has blocks');
  assert.strictEqual(res2.title, 'About', 'about pager title is About');
}

// contact -> navigate or echo
const r3 = contact.run([], ctx);
const res3 = r3 instanceof Promise ? await r3 : r3;
assert.ok(
  res3.type === 'navigate' || res3.type === 'echo',
  'contact returns navigate or echo',
);

// rss -> navigate to /rss.xml in new tab
const r4 = rss.run([], ctx);
const res4 = r4 instanceof Promise ? await r4 : r4;
assert.strictEqual(res4.type, 'navigate', 'rss returns navigate');
if (res4.type === 'navigate') {
  assert.ok(res4.href.includes('rss'), 'rss href contains rss');
  assert.strictEqual(res4.target, '_blank', 'rss opens in new tab');
}

// about in pt lang -> pt body
const ctxPt: Context = { ...ctx, state: { ...ctx.state, lang: 'pt' } };
const r5 = about.run([], ctxPt);
const res5 = r5 instanceof Promise ? await r5 : r5;
assert.strictEqual(res5.type, 'pager', 'about pt returns pager');
if (res5.type === 'pager') {
  const raw = res5.blocks.map(b => b.raw).join(' ');
  assert.ok(raw.includes('Sobre') || raw.includes('Engenheiro'), 'about pt uses pt body');
}

console.log('commands/now: all tests passed');
