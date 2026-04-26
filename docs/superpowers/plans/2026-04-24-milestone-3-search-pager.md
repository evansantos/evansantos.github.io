# Milestone 3 — Search, Filters & Pager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `grep`, `find`, `head`, `tail`, `wc`, and convenience commands plus a vim-keybinding pager with in-pager search and Tab completion wired end-to-end.

**Architecture:** Pure utility functions (`parseFlags`, `globToRegex`) live in `src/terminal/core/flags.ts` and are shared by every command. The pager is split into a pure state machine (`vimMode.ts`), a React hook (`useVimMode.ts`), and a display component (`Pager.tsx`). Shell.tsx gains a `vimState` branch: when a `pager` result is dispatched, the Shell mounts `<Pager>` and hides `<InputLine>`; pressing `q`/Esc tears it down. Tab completion is a single callback passed to InputLine as `onTabComplete`.

**Tech Stack:** React 19, TypeScript strict, Poku tests, vanilla CSS custom properties — no new packages.

---

## File map

```
src/terminal/
  core/
    flags.ts                         <- NEW: parseFlags + globToRegex
  commands/
    grep.ts                          <- NEW
    find.ts                          <- NEW
    head.ts                          <- NEW
    tail.ts                          <- NEW
    wc.ts                            <- NEW
    now.ts                           <- NEW
    about.ts                         <- NEW
    contact.ts                       <- NEW
    rss.ts                           <- NEW
    index.ts                         <- MODIFY: register all new commands
    help.ts                          <- MODIFY: add new commands to HELP_TEXT
  components/
    GrepResult.tsx                   <- NEW
    Pager.tsx                        <- NEW
    InputLine.tsx                    <- MODIFY: add onTabComplete prop
    Log.tsx                          <- MODIFY: render grep-result; pager is overlay
  hooks/
    vimMode.ts                       <- NEW: pure state machine
    useVimMode.ts                    <- NEW: React hook
  Shell.tsx                          <- MODIFY: pager overlay + tab completion

src/styles/
  terminal.css                       <- MODIFY: add grep + pager CSS classes

tests/unit/
  flags.test.ts                      <- NEW
  vimmode.test.ts                    <- NEW
  commands/
    grep.test.ts                     <- NEW
    find.test.ts                     <- NEW
    head.test.ts                     <- NEW
    now.test.ts                      <- NEW
```

---

## Task 1: parseFlags + globToRegex

**Files:**
- Create: `src/terminal/core/flags.ts`
- Create: `tests/unit/flags.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/flags.test.ts
import { assert } from 'poku';
import { parseFlags, globToRegex } from '../../src/terminal/core/flags.js';

// positional only
const p1 = parseFlags(['blog', 'posts']);
assert.deepStrictEqual(p1.positional, ['blog', 'posts'], 'positional args captured');
assert.deepStrictEqual(p1.flags, {}, 'no flags when args are positional');

// --flag=value
const p2 = parseFlags(['--name=*.md']);
assert.strictEqual(p2.flags['name'], '*.md', '--flag=value parsed correctly');
assert.deepStrictEqual(p2.positional, [], 'no positional with --flag=value');

// -flag value (next arg is value)
const p3 = parseFlags(['-tag', 'ai']);
assert.strictEqual(p3.flags['tag'], 'ai', '-flag value parsed correctly');
assert.deepStrictEqual(p3.positional, [], 'no positional with -flag value');

// -flag value where next arg starts with - (boolean)
const p4 = parseFlags(['-tag', '-other']);
assert.strictEqual(p4.flags['tag'], true, '-flag followed by -arg is boolean true');
assert.strictEqual(p4.flags['other'], true, 'second -flag also boolean true');

// -flag alone at end
const p5 = parseFlags(['-lang']);
assert.strictEqual(p5.flags['lang'], true, 'sole -flag is boolean true');

// -3 numeric shorthand -> flags.n = '3'
const p6 = parseFlags(['-3']);
assert.strictEqual(p6.flags['n'], '3', '-N numeric shorthand maps to flags.n');

// -10 numeric shorthand
const p7 = parseFlags(['-10']);
assert.strictEqual(p7.flags['n'], '10', '-NN numeric shorthand maps to flags.n');

// mixed
const p8 = parseFlags(['blog', '-tag', 'ai', '-lang', 'en', '--after=2024-01-01']);
assert.deepStrictEqual(p8.positional, ['blog'], 'mixed: positional extracted');
assert.strictEqual(p8.flags['tag'], 'ai', 'mixed: -tag ai');
assert.strictEqual(p8.flags['lang'], 'en', 'mixed: -lang en');
assert.strictEqual(p8.flags['after'], '2024-01-01', 'mixed: --after=value');

// globToRegex: literal match
const r1 = globToRegex('hello');
assert.ok(r1.test('hello'), 'literal glob matches exact string');
assert.ok(!r1.test('world'), 'literal glob does not match other string');

// globToRegex: * wildcard
const r2 = globToRegex('*.md');
assert.ok(r2.test('readme.md'), '* wildcard matches prefix');
assert.ok(r2.test('.md'), '* matches empty prefix');
assert.ok(!r2.test('readme.txt'), '* does not match different extension');

// globToRegex: ? wildcard
const r3 = globToRegex('b?g');
assert.ok(r3.test('bag'), '? matches single char');
assert.ok(r3.test('big'), '? matches single char variant');
assert.ok(!r3.test('baag'), '? does not match two chars');

// globToRegex: special chars escaped
const r4 = globToRegex('file.ts');
assert.ok(r4.test('file.ts'), 'dot in glob is literal');
assert.ok(!r4.test('filexts'), 'escaped dot does not act as regex dot');

// globToRegex: case-insensitive
const r5 = globToRegex('README');
assert.ok(r5.test('readme'), 'globToRegex is case-insensitive');
assert.ok(r5.test('README'), 'globToRegex matches original case');

console.log('flags: all tests passed');
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test tests/unit/flags.test.ts
# Expected: Cannot find module '../../src/terminal/core/flags.js'
```

- [ ] **Step 3: Implement**

```typescript
// src/terminal/core/flags.ts

export interface ParsedFlags {
  flags:      Record<string, string | boolean>;
  positional: string[];
}

export function parseFlags(args: string[]): ParsedFlags {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    // --flag=value
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        flags[arg.slice(2)] = true;
      }
      i++;
      continue;
    }

    // -flag or -N (short flags)
    if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);

      // -3, -10 etc. -> flags.n = '3'
      if (/^\d+$/.test(key)) {
        flags['n'] = key;
        i++;
        continue;
      }

      // peek: if next arg exists and doesn't start with -, treat as value
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
      continue;
    }

    // positional
    positional.push(arg);
    i++;
  }

  return { flags, positional };
}

export function globToRegex(glob: string): RegExp {
  const escaped = glob
    .split('')
    .map(ch => {
      if (ch === '*') return '.*';
      if (ch === '?') return '.';
      return ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    })
    .join('');

  return new RegExp(`^${escaped}$`, 'i');
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test tests/unit/flags.test.ts
# Expected: flags: all tests passed
```

---

## Task 2: GrepResult component

**Files:**
- Create: `src/terminal/components/GrepResult.tsx`

No Poku test for this task — it is a thin renderer. Verified visually in Task 10.

- [ ] **Step 1: Implement**

```tsx
// src/terminal/components/GrepResult.tsx
import type { GrepMatch } from '../core/types.js';

interface Props {
  matches: GrepMatch[];
}

function HighlightedExcerpt({ excerpt, matchStart, matchEnd }: {
  excerpt:    string;
  matchStart: number;
  matchEnd:   number;
}) {
  const before = excerpt.slice(0, matchStart);
  const match  = excerpt.slice(matchStart, matchEnd);
  const after  = excerpt.slice(matchEnd);

  return (
    <span className="terminal__grep-excerpt">
      {before}
      <mark className="terminal__grep-mark">{match}</mark>
      {after}
    </span>
  );
}

export default function GrepResult({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <div className="terminal__grep-result">
        <span className="terminal__grep-excerpt">(no matches)</span>
      </div>
    );
  }

  return (
    <div className="terminal__grep-result">
      {matches.map((m, i) => (
        <div key={`${m.slug}-${i}`} className="terminal__grep-item">
          <span className="terminal__grep-title">{m.slug} — {m.title}</span>
          <HighlightedExcerpt
            excerpt={m.excerpt}
            matchStart={m.matchStart}
            matchEnd={m.matchEnd}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## Task 3: grep command

**Files:**
- Create: `src/terminal/commands/grep.ts`
- Create: `tests/unit/commands/grep.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/commands/grep.test.ts
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
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test tests/unit/commands/grep.test.ts
# Expected: Cannot find module '../../../src/terminal/commands/grep.js'
```

- [ ] **Step 3: Implement**

```typescript
// src/terminal/commands/grep.ts
import { defineCommand } from '../core/types.js';
import type { GrepMatch } from '../core/types.js';

const EXCERPT_WINDOW = 80;

export default defineCommand({
  name:     'grep',
  describe: 'search post content',
  run(args, ctx) {
    const pattern = args[0];
    if (!pattern) {
      return { type: 'error', text: 'grep: missing pattern', exitCode: 1 };
    }

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, 'gi');
    } catch {
      return { type: 'error', text: `grep: invalid pattern: ${pattern}`, exitCode: 1 };
    }

    const { store, state } = ctx;
    const posts = store.posts(state.lang);
    const matches: GrepMatch[] = [];

    for (const post of posts) {
      // Search title first
      regex.lastIndex = 0;
      const titleMatch = regex.exec(post.title);
      if (titleMatch) {
        const start      = Math.max(0, titleMatch.index - EXCERPT_WINDOW);
        const end        = Math.min(post.title.length, titleMatch.index + titleMatch[0].length + EXCERPT_WINDOW);
        const excerpt    = post.title.slice(start, end);
        const matchStart = titleMatch.index - start;
        const matchEnd   = matchStart + titleMatch[0].length;
        matches.push({ slug: post.slug, title: post.title, excerpt, matchStart, matchEnd });
        continue;
      }

      // Search body
      regex.lastIndex = 0;
      const bodyMatch = regex.exec(post.body);
      if (bodyMatch) {
        const start      = Math.max(0, bodyMatch.index - EXCERPT_WINDOW);
        const end        = Math.min(post.body.length, bodyMatch.index + bodyMatch[0].length + EXCERPT_WINDOW);
        const excerpt    = post.body.slice(start, end);
        const matchStart = bodyMatch.index - start;
        const matchEnd   = matchStart + bodyMatch[0].length;
        matches.push({ slug: post.slug, title: post.title, excerpt, matchStart, matchEnd });
      }
    }

    return { type: 'grep-result', matches };
  },
});
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test tests/unit/commands/grep.test.ts
# Expected: commands/grep: all tests passed
```

---

## Task 4: find command

**Files:**
- Create: `src/terminal/commands/find.ts`
- Create: `tests/unit/commands/find.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/commands/find.test.ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test tests/unit/commands/find.test.ts
# Expected: Cannot find module '../../../src/terminal/commands/find.js'
```

- [ ] **Step 3: Implement**

```typescript
// src/terminal/commands/find.ts
import { defineCommand } from '../core/types.js';
import { parseFlags, globToRegex } from '../core/flags.js';
import type { Lang } from '../core/types.js';

export default defineCommand({
  name:     'find',
  describe: 'search posts by tag, language, date, or name glob',
  run(args, ctx) {
    const { flags, positional } = parseFlags(args);

    const dir = positional[0];
    if (!dir) {
      return { type: 'error', text: 'find: missing directory operand', exitCode: 1 };
    }

    if (dir !== 'blog' && dir !== '.') {
      return {
        type: 'error', text: `find: ${dir}: No such file or directory`,
        code: 'ENOENT', exitCode: 1,
      };
    }

    // Determine language scope
    let langFilter: Lang | undefined;
    if (typeof flags['lang'] === 'string') {
      const l = flags['lang'] as string;
      if (l !== 'en' && l !== 'pt') {
        return { type: 'error', text: `find: invalid -lang value: ${l}`, exitCode: 1 };
      }
      langFilter = l as Lang;
    }

    const effectiveLang: Lang = langFilter ?? ctx.state.lang;
    let posts = ctx.store.posts(effectiveLang);

    // -tag filter
    if (typeof flags['tag'] === 'string') {
      const tag = (flags['tag'] as string).toLowerCase();
      posts = posts.filter(p => p.tags.map(t => t.toLowerCase()).includes(tag));
    }

    // -name glob filter (matches against slug)
    if (typeof flags['name'] === 'string') {
      const nameRe = globToRegex(flags['name'] as string);
      posts = posts.filter(p => nameRe.test(p.slug));
    }

    // -after filter (inclusive)
    if (typeof flags['after'] === 'string') {
      const after = flags['after'] as string;
      posts = posts.filter(p => p.date >= after);
    }

    // -before filter (exclusive)
    if (typeof flags['before'] === 'string') {
      const before = flags['before'] as string;
      posts = posts.filter(p => p.date < before);
    }

    return {
      type:  'post-list',
      items: posts,
      meta:  {
        tag:  typeof flags['tag'] === 'string' ? flags['tag'] : undefined,
        lang: langFilter,
      },
    };
  },
});
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm test tests/unit/commands/find.test.ts
# Expected: commands/find: all tests passed
```

---

## Task 5: head, tail, wc commands

**Files:**
- Create: `src/terminal/commands/head.ts`
- Create: `src/terminal/commands/tail.ts`
- Create: `src/terminal/commands/wc.ts`
- Create: `tests/unit/commands/head.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/commands/head.test.ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test tests/unit/commands/head.test.ts
# Expected: Cannot find module '../../../src/terminal/commands/head.js'
```

- [ ] **Step 3: Implement head.ts**

```typescript
// src/terminal/commands/head.ts
import { defineCommand } from '../core/types.js';
import { parseFlags } from '../core/flags.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

const DEFAULT_N = 10;

export default defineCommand({
  name:     'head',
  describe: 'show first N blocks of a post',
  async run(args, ctx) {
    const { flags, positional } = parseFlags(args);
    const slug = positional[0];

    if (!slug) {
      return { type: 'error', text: 'head: missing operand', exitCode: 1 };
    }

    const n = typeof flags['n'] === 'string' ? parseInt(flags['n'], 10) : DEFAULT_N;

    const post = await ctx.store.loadPost(slug);
    if (!post) {
      return {
        type: 'error', text: `head: ${slug}: No such file or directory`,
        code: 'ENOENT', exitCode: 1,
      };
    }

    const allBlocks   = parseMarkdownBlocks(post.body);
    const sliced      = allBlocks.slice(0, n);
    const trimmedBody = sliced.map(b => b.raw).join('\n\n');

    return { type: 'post-view', post: { ...post, body: trimmedBody } };
  },
});
```

- [ ] **Step 4: Implement tail.ts**

```typescript
// src/terminal/commands/tail.ts
import { defineCommand } from '../core/types.js';
import { parseFlags } from '../core/flags.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

const DEFAULT_N = 10;

export default defineCommand({
  name:     'tail',
  describe: 'show last N blocks of a post',
  async run(args, ctx) {
    const { flags, positional } = parseFlags(args);
    const slug = positional[0];

    if (!slug) {
      return { type: 'error', text: 'tail: missing operand', exitCode: 1 };
    }

    const n = typeof flags['n'] === 'string' ? parseInt(flags['n'], 10) : DEFAULT_N;

    const post = await ctx.store.loadPost(slug);
    if (!post) {
      return {
        type: 'error', text: `tail: ${slug}: No such file or directory`,
        code: 'ENOENT', exitCode: 1,
      };
    }

    const allBlocks   = parseMarkdownBlocks(post.body);
    const sliced      = allBlocks.slice(-n);
    const trimmedBody = sliced.map(b => b.raw).join('\n\n');

    return { type: 'post-view', post: { ...post, body: trimmedBody } };
  },
});
```

- [ ] **Step 5: Implement wc.ts**

```typescript
// src/terminal/commands/wc.ts
import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'wc',
  describe: 'word/block count for a post',
  async run(args, ctx) {
    const slug = args[0];

    if (!slug) {
      return { type: 'error', text: 'wc: missing operand', exitCode: 1 };
    }

    const post = await ctx.store.loadPost(slug);
    if (!post) {
      return {
        type: 'error', text: `wc: ${slug}: No such file or directory`,
        code: 'ENOENT', exitCode: 1,
      };
    }

    const blocks    = parseMarkdownBlocks(post.body);
    const wordCount = post.body.split(/\s+/).filter(Boolean).length;
    const charCount = post.body.length;

    return {
      type: 'echo',
      text: `${slug}: ${blocks.length} blocks  ${wordCount} words  ${charCount} chars  ~${post.readingTime} min read`,
    };
  },
});
```

- [ ] **Step 6: Run test — expect PASS**

```bash
pnpm test tests/unit/commands/head.test.ts
# Expected: commands/head: all tests passed
```

---

## Task 6: Convenience commands

**Files:**
- Create: `src/terminal/commands/now.ts`
- Create: `src/terminal/commands/about.ts`
- Create: `src/terminal/commands/contact.ts`
- Create: `src/terminal/commands/rss.ts`
- Create: `tests/unit/commands/now.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/commands/now.test.ts
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
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test tests/unit/commands/now.test.ts
# Expected: Cannot find module '../../../src/terminal/commands/now.js'
```

- [ ] **Step 3: Implement now.ts**

```typescript
// src/terminal/commands/now.ts
import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'now',
  describe: 'what evan is doing right now',
  run(_args, ctx) {
    const { body } = ctx.store.now();
    return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Now' };
  },
});
```

- [ ] **Step 4: Implement about.ts**

```typescript
// src/terminal/commands/about.ts
import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'about',
  describe: 'who is evan (long form)',
  run(_args, ctx) {
    const { body } = ctx.store.about(ctx.state.lang);
    return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'About' };
  },
});
```

- [ ] **Step 5: Implement contact.ts**

```typescript
// src/terminal/commands/contact.ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'contact',
  describe: 'contact info',
  run() {
    return {
      type: 'echo',
      text: [
        'email:    evan.its.me@gmail.com',
        'github:   github.com/evansantos',
        'linkedin: linkedin.com/in/evandrosantos',
      ].join('\n'),
    };
  },
});
```

- [ ] **Step 6: Implement rss.ts**

```typescript
// src/terminal/commands/rss.ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'rss',
  describe: 'open RSS feed in new tab',
  run() {
    return { type: 'navigate', href: '/rss.xml', target: '_blank' };
  },
});
```

- [ ] **Step 7: Run test — expect PASS**

```bash
pnpm test tests/unit/commands/now.test.ts
# Expected: commands/now: all tests passed
```

---

## Task 7: vimMode pure logic + useVimMode hook

**Files:**
- Create: `src/terminal/hooks/vimMode.ts`
- Create: `src/terminal/hooks/useVimMode.ts`
- Create: `tests/unit/vimmode.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/vimmode.test.ts
import { assert } from 'poku';
import { createVimMode, applyVimKey } from '../../src/terminal/hooks/vimMode.js';
import type { MarkdownBlock } from '../../src/terminal/core/types.js';

function makeBlocks(n: number): MarkdownBlock[] {
  return Array.from({ length: n }, (_, i) => ({
    type: 'paragraph' as const,
    raw:  `Paragraph ${i + 1}`,
  }));
}

const blocks = makeBlocks(20);

// createVimMode initial state
const initial = createVimMode(blocks, 'Test Post');
assert.strictEqual(initial.active, true, 'createVimMode sets active = true');
assert.strictEqual(initial.currentLine, 0, 'createVimMode starts at line 0');
assert.strictEqual(initial.title, 'Test Post', 'createVimMode stores title');
assert.strictEqual(initial.searchQuery, '', 'createVimMode has empty searchQuery');
assert.strictEqual(initial.searchIndex, 0, 'createVimMode has searchIndex 0');
assert.strictEqual(initial.searchInput, false, 'createVimMode has searchInput false');
assert.deepStrictEqual(initial.blocks, blocks, 'createVimMode stores blocks');

// j: move down
const afterJ = applyVimKey(initial, 'j');
assert.strictEqual(afterJ.currentLine, 1, 'j moves down by 1');

// j at end: clamp
const atEnd = { ...initial, currentLine: 19 };
const afterJEnd = applyVimKey(atEnd, 'j');
assert.strictEqual(afterJEnd.currentLine, 19, 'j at last line clamps');

// k: move up
const atLine5 = { ...initial, currentLine: 5 };
const afterK = applyVimKey(atLine5, 'k');
assert.strictEqual(afterK.currentLine, 4, 'k moves up by 1');

// k at top: clamp
const afterKTop = applyVimKey(initial, 'k');
assert.strictEqual(afterKTop.currentLine, 0, 'k at top clamps to 0');

// d: half-page down (10 lines)
const afterD = applyVimKey(initial, 'd');
assert.strictEqual(afterD.currentLine, 10, 'd moves down by 10');

// d clamps at end
const nearEnd = { ...initial, currentLine: 15 };
const afterDNearEnd = applyVimKey(nearEnd, 'd');
assert.strictEqual(afterDNearEnd.currentLine, 19, 'd clamps at last block');

// u: half-page up
const atLine15 = { ...initial, currentLine: 15 };
const afterU = applyVimKey(atLine15, 'u');
assert.strictEqual(afterU.currentLine, 5, 'u moves up by 10');

// u clamps at top
const atLine3 = { ...initial, currentLine: 3 };
const afterUTop = applyVimKey(atLine3, 'u');
assert.strictEqual(afterUTop.currentLine, 0, 'u clamps at 0');

// G: go to end
const afterG = applyVimKey(initial, 'G');
assert.strictEqual(afterG.currentLine, 19, 'G jumps to last line');

// g: go to start
const atMiddle = { ...initial, currentLine: 10 };
const afterg = applyVimKey(atMiddle, 'g');
assert.strictEqual(afterg.currentLine, 0, 'g jumps to first line');

// q: deactivate
const afterQ = applyVimKey(initial, 'q');
assert.strictEqual(afterQ.active, false, 'q deactivates pager');

// Escape: deactivate
const afterEsc = applyVimKey(initial, 'Escape');
assert.strictEqual(afterEsc.active, false, 'Escape deactivates pager');

// /: enter search input mode
const afterSlash = applyVimKey(initial, '/');
assert.strictEqual(afterSlash.searchInput, true, '/ sets searchInput = true');
assert.strictEqual(afterSlash.searchQuery, '', '/ clears searchQuery');

// Escape while in searchInput: cancel search
const inSearch = { ...initial, searchInput: true, searchQuery: 'test' };
const afterEscSearch = applyVimKey(inSearch, 'Escape');
assert.strictEqual(afterEscSearch.searchInput, false, 'Escape exits search input mode');

// n: no-op when no query
const afterN = applyVimKey(initial, 'n');
assert.strictEqual(afterN.currentLine, 0, 'n with no query stays at 0');

// N: no-op when no query
const afterShiftN = applyVimKey(initial, 'N');
assert.strictEqual(afterShiftN.currentLine, 0, 'N with no query stays at 0');

// n advances searchIndex, wraps
const withSearch = { ...initial, searchQuery: 'Paragraph', searchIndex: 0, searchInput: false };
const afterSearchN = applyVimKey(withSearch, 'n');
assert.strictEqual(afterSearchN.searchIndex, 1, 'n advances searchIndex');

const atLastMatch = { ...withSearch, searchIndex: 19 };
const afterWrapN = applyVimKey(atLastMatch, 'n');
assert.strictEqual(afterWrapN.searchIndex, 0, 'n wraps searchIndex at end');

// N reverses
const atIndex3 = { ...withSearch, searchIndex: 3 };
const afterShiftNAdv = applyVimKey(atIndex3, 'N');
assert.strictEqual(afterShiftNAdv.searchIndex, 2, 'N decrements searchIndex');

const atIndex0 = { ...withSearch, searchIndex: 0 };
const afterShiftNWrap = applyVimKey(atIndex0, 'N');
assert.strictEqual(afterShiftNWrap.searchIndex, 19, 'N wraps searchIndex at start');

console.log('vimmode: all tests passed');
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test tests/unit/vimmode.test.ts
# Expected: Cannot find module '../../src/terminal/hooks/vimMode.js'
```

- [ ] **Step 3: Implement vimMode.ts**

```typescript
// src/terminal/hooks/vimMode.ts
import type { MarkdownBlock } from '../core/types.js';

export interface VimModeState {
  active:      boolean;
  blocks:      MarkdownBlock[];
  title:       string;
  currentLine: number;
  searchQuery: string;
  searchIndex: number;
  searchInput: boolean;
}

export function createVimMode(blocks: MarkdownBlock[], title: string): VimModeState {
  return {
    active:      true,
    blocks,
    title,
    currentLine: 0,
    searchQuery: '',
    searchIndex: 0,
    searchInput: false,
  };
}

const HALF_PAGE = 10;

export function applyVimKey(state: VimModeState, key: string): VimModeState {
  const last  = state.blocks.length - 1;
  const clamp = (n: number) => Math.max(0, Math.min(last, n));

  // While in search input mode, only Escape exits it
  if (state.searchInput) {
    if (key === 'Escape') {
      return { ...state, searchInput: false };
    }
    return state;
  }

  switch (key) {
    case 'j':
      return { ...state, currentLine: clamp(state.currentLine + 1) };

    case 'k':
      return { ...state, currentLine: clamp(state.currentLine - 1) };

    case 'd':
      return { ...state, currentLine: clamp(state.currentLine + HALF_PAGE) };

    case 'u':
      return { ...state, currentLine: clamp(state.currentLine - HALF_PAGE) };

    case 'G':
      return { ...state, currentLine: last };

    case 'g':
      return { ...state, currentLine: 0 };

    case 'q':
    case 'Escape':
      return { ...state, active: false };

    case '/':
      return { ...state, searchInput: true, searchQuery: '' };

    case 'n': {
      if (!state.searchQuery) return state;
      const next = (state.searchIndex + 1) % state.blocks.length;
      return { ...state, searchIndex: next, currentLine: next };
    }

    case 'N': {
      if (!state.searchQuery) return state;
      const prev = (state.searchIndex - 1 + state.blocks.length) % state.blocks.length;
      return { ...state, searchIndex: prev, currentLine: prev };
    }

    default:
      return state;
  }
}
```

- [ ] **Step 4: Implement useVimMode.ts**

```typescript
// src/terminal/hooks/useVimMode.ts
import { useState, useCallback, useEffect } from 'react';
import type { MarkdownBlock } from '../core/types.js';
import { createVimMode, applyVimKey, type VimModeState } from './vimMode.js';

export interface UseVimModeReturn {
  vimState:       VimModeState | null;
  enterPager:     (blocks: MarkdownBlock[], title: string) => void;
  exitPager:      () => void;
  handleVimKey:   (key: string) => void;
  setSearchQuery: (query: string) => void;
  commitSearch:   () => void;
}

export function useVimMode(): UseVimModeReturn {
  const [vimState, setVimState] = useState<VimModeState | null>(null);

  const enterPager = useCallback((blocks: MarkdownBlock[], title: string) => {
    setVimState(createVimMode(blocks, title));
  }, []);

  const exitPager = useCallback(() => {
    setVimState(null);
  }, []);

  const handleVimKey = useCallback((key: string) => {
    setVimState(prev => {
      if (!prev) return null;
      const next = applyVimKey(prev, key);
      return next.active ? next : null;
    });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setVimState(prev => {
      if (!prev) return null;
      return { ...prev, searchQuery: query };
    });
  }, []);

  const commitSearch = useCallback(() => {
    setVimState(prev => {
      if (!prev) return null;
      const re = prev.searchQuery ? new RegExp(prev.searchQuery, 'i') : null;
      if (!re) return { ...prev, searchInput: false };

      // Find first block matching query starting from currentLine, wrapping
      const start = prev.currentLine;
      const n     = prev.blocks.length;
      for (let offset = 0; offset < n; offset++) {
        const idx = (start + offset) % n;
        if (re.test(prev.blocks[idx].raw)) {
          return { ...prev, searchInput: false, searchIndex: idx, currentLine: idx };
        }
      }
      return { ...prev, searchInput: false };
    });
  }, []);

  // Global keydown listener when pager is active
  useEffect(() => {
    if (!vimState) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (vimState.searchInput) {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitSearch();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleVimKey('Escape');
        }
        // all other keys handled by search input element in Pager
        return;
      }

      const handled = ['j', 'k', 'd', 'u', 'g', 'G', 'q', 'Escape', '/', 'n', 'N'];
      if (handled.includes(e.key)) {
        e.preventDefault();
        handleVimKey(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [vimState, handleVimKey, commitSearch]);

  return { vimState, enterPager, exitPager, handleVimKey, setSearchQuery, commitSearch };
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
pnpm test tests/unit/vimmode.test.ts
# Expected: vimmode: all tests passed
```

---

## Task 8: Pager.tsx component

**Files:**
- Create: `src/terminal/components/Pager.tsx`

No Poku test — DOM rendering. Verified end-to-end in Task 10.

- [ ] **Step 1: Implement**

```tsx
// src/terminal/components/Pager.tsx
import { useRef, useEffect, type ChangeEvent, type KeyboardEvent } from 'react';
import type { VimModeState } from '../hooks/vimMode.js';

interface Props {
  vimState:       VimModeState;
  onKey:          (key: string) => void;
  onSearchChange: (query: string) => void;
  onSearchCommit: () => void;
}

function renderBlock(raw: string, searchQuery: string): React.ReactNode {
  if (!searchQuery) return raw;
  try {
    const re    = new RegExp(`(${searchQuery})`, 'gi');
    const parts = raw.split(re);
    return parts.map((part, i) =>
      re.test(part)
        ? <mark key={i} className="terminal__grep-mark">{part}</mark>
        : part,
    );
  } catch {
    return raw;
  }
}

export default function Pager({ vimState, onKey, onSearchChange, onSearchCommit }: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const blockRefs      = useRef<(HTMLDivElement | null)[]>([]);

  // Focus search input when entering search mode
  useEffect(() => {
    if (vimState.searchInput) {
      searchInputRef.current?.focus();
    }
  }, [vimState.searchInput]);

  // Scroll current block into view
  useEffect(() => {
    const el = blockRefs.current[vimState.currentLine];
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [vimState.currentLine]);

  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onKey('Escape');
    }
  };

  const percent = vimState.blocks.length === 0
    ? 100
    : Math.round(((vimState.currentLine + 1) / vimState.blocks.length) * 100);

  return (
    <>
      <div
        className="terminal__pager"
        role="region"
        aria-label={`pager: ${vimState.title}`}
        aria-live="polite"
      >
        {vimState.blocks.map((block, i) => {
          const isCurrent = i === vimState.currentLine;
          const isMatch   = vimState.searchQuery
            ? (() => { try { return new RegExp(vimState.searchQuery, 'i').test(block.raw); } catch { return false; } })()
            : false;

          const classes = [
            'terminal__pager-block',
            isCurrent ? 'terminal__pager-block--current' : '',
            isMatch   ? 'terminal__pager-block--match'   : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={i}
              ref={el => { blockRefs.current[i] = el; }}
              className={classes}
              aria-current={isCurrent ? 'true' : undefined}
            >
              {renderBlock(block.raw, vimState.searchQuery)}
            </div>
          );
        })}
      </div>

      {vimState.searchInput ? (
        <div className="terminal__pager-search">
          <span className="terminal__pager-search-prefix" aria-hidden="true">/</span>
          <input
            ref={searchInputRef}
            type="text"
            className="terminal__pager-search-input"
            value={vimState.searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKey}
            aria-label="pager search"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="terminal__pager-status" role="status" aria-live="polite">
          {vimState.title}  ·  {vimState.currentLine + 1}/{vimState.blocks.length}  ·  {percent}%  ·  j/k scroll  ·  / search  ·  q quit
        </div>
      )}
    </>
  );
}
```

---

## Task 9: Tab completion + Shell + Log wiring

**Files:**
- Modify: `src/terminal/components/InputLine.tsx`
- Modify: `src/terminal/components/Log.tsx`
- Modify: `src/terminal/Shell.tsx`
- Modify: `src/terminal/commands/index.ts`
- Modify: `src/terminal/commands/help.ts`
- Modify: `src/styles/terminal.css`

- [ ] **Step 1: Update InputLine.tsx — add Tab completion prop**

Replace the entire file:

```tsx
// src/terminal/components/InputLine.tsx
import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';

interface Props {
  value:           string;
  cwd:             string;
  onChange:        (value: string) => void;
  onSubmit:        (value: string) => void;
  onNavigate:      (dir: -1 | 1) => string;
  onCancel:        () => void;
  onClear:         () => void;
  disabled:        boolean;
  onTabComplete?:  (partial: string) => string | null;
}

export default function InputLine({
  value, cwd, onChange, onSubmit, onNavigate, onCancel, onClear, disabled, onTabComplete,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  const onFocus = useCallback(() => {
    inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (onTabComplete) {
        const completed = onTabComplete(value);
        if (completed !== null) {
          onChange(completed);
          setTimeout(() => {
            input.setSelectionRange(completed.length, completed.length);
          }, 0);
        }
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(onNavigate(-1));
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(onNavigate(1));
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
      return;
    }

    if (e.ctrlKey) {
      switch (e.key) {
        case 'c': e.preventDefault(); onCancel(); return;
        case 'l': e.preventDefault(); onClear(); return;
        case 'a': e.preventDefault(); input.setSelectionRange(0, 0); return;
        case 'e': e.preventDefault(); {
          const len = input.value.length;
          input.setSelectionRange(len, len);
          return;
        }
        case 'k': e.preventDefault(); onChange(input.value.slice(0, input.selectionStart ?? 0)); return;
        case 'u': e.preventDefault(); onChange(''); return;
        case 'w': e.preventDefault(); {
          const pos     = input.selectionStart ?? 0;
          const before  = input.value.slice(0, pos);
          const trimmed = before.replace(/\S+\s*$/, '');
          onChange(trimmed + input.value.slice(pos));
          setTimeout(() => input.setSelectionRange(trimmed.length, trimmed.length), 0);
          return;
        }
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    }
  }, [value, onChange, onSubmit, onNavigate, onCancel, onClear, onTabComplete]);

  return (
    <div
      className="terminal__input-row"
      onClick={focus}
      role="presentation"
    >
      <span className="terminal__prompt" aria-hidden="true">
        {cwd === '~' ? '~' : `~/${cwd}`} $
      </span>
      <input
        ref={inputRef}
        type="text"
        className="terminal__input"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        aria-label="terminal input"
        aria-autocomplete="list"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        disabled={disabled}
      />
    </div>
  );
}

export type InputLineRef = { focus: () => void };
```

- [ ] **Step 2: Update Log.tsx — render grep-result; pager handled as overlay**

Replace the entire file:

```tsx
// src/terminal/components/Log.tsx
import type { Result, Lang } from '../core/types.js';
import EchoLine   from './EchoLine.js';
import ErrorLine  from './ErrorLine.js';
import PostList   from './PostList.js';
import PostView   from './PostView.js';
import Table      from './Table.js';
import GrepResult from './GrepResult.js';

export interface LogEntry {
  id:      number;
  input?:  string;
  result:  Result;
}

interface Props {
  entries: LogEntry[];
  lang:    Lang;
}

function ResultRenderer({ result, lang }: { result: Result; lang: Lang }) {
  switch (result.type) {
    case 'echo':
      return <EchoLine text={result.text} />;
    case 'error':
      return <ErrorLine text={result.text} hint={result.hint} />;
    case 'post-list':
      return <PostList items={result.items} lang={lang} />;
    case 'post-view':
      return <PostView post={result.post} lang={lang} />;
    case 'table':
      return <Table columns={result.columns} rows={result.rows} />;
    case 'grep-result':
      return <GrepResult matches={result.matches} />;
    case 'empty':
      return null;
    // pager is an overlay in Shell.tsx; clear/navigate have no log output
    case 'clear':
    case 'navigate':
    case 'neofetch':
    case 'project-list':
    case 'pager':
      return null;
    default:
      return null;
  }
}

export default function Log({ entries, lang }: Props) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="terminal output"
      className="terminal__log"
    >
      {entries.map(entry => (
        <div key={entry.id} className="terminal__log-entry">
          {entry.input !== undefined && (
            <div className="terminal__log-entry-input" aria-hidden="true">
              {entry.input}
            </div>
          )}
          <ResultRenderer result={entry.result} lang={lang} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update commands/index.ts — register all new commands**

Replace the entire file:

```typescript
// src/terminal/commands/index.ts
import type { Command } from '../core/types.js';
import help    from './help.js';
import whoami  from './whoami.js';
import pwd     from './pwd.js';
import date    from './date.js';
import echo    from './echo.js';
import clear   from './clear.js';
import uptime  from './uptime.js';
import lang    from './lang.js';
import history from './history.js';
import cd      from './cd.js';
import ls      from './ls.js';
import tree    from './tree.js';
import cat     from './cat.js';
import grep    from './grep.js';
import find    from './find.js';
import head    from './head.js';
import tail    from './tail.js';
import wc      from './wc.js';
import now     from './now.js';
import about   from './about.js';
import contact from './contact.js';
import rss     from './rss.js';

const cmdList: Command[] = [
  help, whoami, pwd, date, echo, clear, uptime, lang, history,
  cd, ls, tree, cat,
  grep, find, head, tail, wc,
  now, about, contact, rss,
];

export const commands: Map<string, Command> = new Map(
  cmdList.map(cmd => [cmd.name, cmd])
);
```

- [ ] **Step 4: Update help.ts — list all M3 commands**

Replace the entire file:

```typescript
// src/terminal/commands/help.ts
import { defineCommand } from '../core/types.js';

const HELP_TEXT = [
  'available commands:',
  '',
  '  help              show this help',
  '  whoami            who is evan',
  '  ls                list directory contents',
  '  cd <dir>          change directory (blog, projects, talks, uses, ~)',
  '  cat <slug>        read a post or page (pager for long content)',
  '  pwd               print working directory',
  '  tree              show full site structure',
  '  find <dir>        search posts (-name, -tag, -lang, -after, -before)',
  '  grep <pattern>    search content with highlight',
  '  head [-N] <slug>  show first N blocks of a post',
  '  tail [-N] <slug>  show last N blocks of a post',
  '  wc <slug>         word/block count for a post',
  '  now               what evan is up to right now',
  '  about             who is evan (long form)',
  '  contact           contact info',
  '  rss               open RSS feed in new tab',
  '  clear             clear terminal',
  '  history           show command history',
  '  echo <text>       repeat text',
  '  date              current time',
  '  uptime            site uptime since 2014',
  '  lang [en|pt]      show or switch language',
  '',
  '  pager keys: j/k scroll  d/u half-page  g/G top/bottom  / search  q quit',
  '',
  "  type '<command>' to run",
].join('\n');

export default defineCommand({
  name:     'help',
  describe: 'show available commands',
  run() {
    return { type: 'echo', text: HELP_TEXT };
  },
});
```

- [ ] **Step 5: Update Shell.tsx — pager overlay + tab completion**

Replace the entire file:

```tsx
// src/terminal/Shell.tsx
import { useEffect, useReducer, useRef, useCallback } from 'react';
import { Store } from './core/content.js';
import { loadFixture } from './data/load.js';
import { commands } from './commands/index.js';
import Log, { type LogEntry } from './components/Log.js';
import InputLine from './components/InputLine.js';
import Pager from './components/Pager.js';
import { useHistory } from './hooks/useHistory.js';
import { useVimMode } from './hooks/useVimMode.js';
import type { Result, ShellState } from './core/types.js';
import '../styles/terminal.css';
import './themes/styles/matrix.css';

const BOOT_SEQUENCE: string[] = [
  '  ███████╗██╗   ██╗ █████╗ ███╗   ██╗',
  '  ██╔════╝██║   ██║██╔══██╗████╗  ██║',
  '  █████╗  ██║   ██║███████║██╔██╗ ██║',
  '  ██╔══╝  ╚██╗ ██╔╝██╔══██║██║╚██╗██║',
  '  ███████╗ ╚████╔╝ ██║  ██║██║ ╚████║',
  '  ╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝',
  '',
  '  Senior Front-End / Full-Stack Engineer',
  '  Brooklyn, NYC  ·  github.com/evansantos',
  '',
  "  type 'help' to get started",
];

interface State {
  log:     LogEntry[];
  shell:   ShellState;
  input:   string;
  loading: boolean;
  store:   Store;
}

type Action =
  | { type: 'BOOT' }
  | { type: 'STORE_READY'; store: Store }
  | { type: 'EXEC'; input: string; result: Result }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SET_SHELL'; update: Partial<ShellState> };

let _nextId = 0;
const mkId = () => _nextId++;

function bootEntries(): LogEntry[] {
  return BOOT_SEQUENCE.map(text => ({
    id:     mkId(),
    result: { type: 'echo' as const, text },
  }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'BOOT':
      return { ...state, log: bootEntries() };

    case 'STORE_READY':
      return {
        ...state,
        loading: false,
        store:   action.store,
        shell:   { ...state.shell, degraded: action.store.degraded },
        log: action.store.degraded
          ? [
              ...state.log,
              {
                id:     mkId(),
                result: {
                  type:     'error' as const,
                  text:     'failed to load content — try whoami, date, help',
                  exitCode: 1 as const,
                },
              },
            ]
          : state.log,
      };

    case 'EXEC': {
      if (action.result.type === 'clear') {
        return { ...state, input: '', log: [] };
      }
      if (action.result.type === 'navigate') {
        const { href, target } = action.result;
        if (target === '_blank') {
          window.open(href, '_blank', 'noopener');
        } else {
          window.location.href = href;
        }
        return { ...state, input: '' };
      }
      return {
        ...state,
        input: '',
        log:   [...state.log, { id: mkId(), input: action.input, result: action.result }],
      };
    }

    case 'SET_INPUT':
      return { ...state, input: action.value };

    case 'SET_SHELL':
      return { ...state, shell: { ...state.shell, ...action.update } };

    default:
      return state;
  }
}

const INIT_STATE: State = {
  log:     [],
  shell:   { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  input:   '',
  loading: true,
  store:   new Store(null),
};

export default function Shell() {
  const [state, dispatch] = useReducer(reducer, INIT_STATE);
  const logEndRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const hist       = useHistory();
  const vim        = useVimMode();

  // Boot and load fixture
  useEffect(() => {
    dispatch({ type: 'BOOT' });

    loadFixture().then(result => {
      dispatch({
        type:  'STORE_READY',
        store: new Store(result.ok ? result.data : null),
      });

      const params = new URLSearchParams(window.location.search);
      const cmd = params.get('cmd');
      if (cmd) {
        setTimeout(() => executeCommand(cmd), 50);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS visualViewport keyboard offset
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty('--keyboard-offset', `${Math.max(0, offset)}px`);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  // Auto-scroll to bottom after new log entries (not when pager is open)
  useEffect(() => {
    if (!vim.vimState) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.log, vim.vimState]);

  // Focus input after pager exits and on initial load
  useEffect(() => {
    if (!state.loading && !vim.vimState) {
      inputRef.current?.focus();
    }
  }, [state.loading, vim.vimState]);

  const executeCommand = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    hist.push(trimmed);
    hist.reset();

    const [name, ...args] = trimmed.split(/\s+/);
    const cmd = commands.get(name);

    if (!cmd) {
      dispatch({
        type:   'EXEC',
        input:  trimmed,
        result: {
          type:     'error',
          text:     `${name}: command not found`,
          hint:     "type 'help' to see available commands",
          code:     'ENOENT',
          exitCode: 1,
        },
      });
      return;
    }

    const ctx = {
      store:    state.store,
      state:    state.shell,
      setState: (update: Partial<ShellState>) =>
        dispatch({ type: 'SET_SHELL', update }),
    };

    const result = await Promise.resolve(cmd.run(args, ctx));

    // Intercept pager: activate overlay instead of logging the raw blocks
    if (result.type === 'pager') {
      // Record a stub echo so the command appears in history
      dispatch({
        type:   'EXEC',
        input:  trimmed,
        result: { type: 'echo', text: `[pager: ${result.title}]` },
      });
      vim.enterPager(result.blocks, result.title);
      return;
    }

    dispatch({ type: 'EXEC', input: trimmed, result });
    setTimeout(() => inputRef.current?.focus(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.store, state.shell, hist, vim]);

  // Tab completion: complete command names only (first token)
  const handleTabComplete = useCallback((partial: string): string | null => {
    // Only complete when there is no space (first token)
    if (partial.includes(' ') || !partial) return null;
    const names = Array.from(commands.keys()).sort();
    return names.find(n => n.startsWith(partial)) ?? null;
  }, []);

  const { shell } = state;
  const statusText = `shell: unix · theme: ${shell.theme} · lang: ${shell.lang} · found: ${shell.found}/11`;

  return (
    <div
      role="application"
      aria-label="evandro.dev terminal"
      className="terminal"
      data-theme={shell.theme}
    >
      {vim.vimState ? (
        <Pager
          vimState={vim.vimState}
          onKey={vim.handleVimKey}
          onSearchChange={vim.setSearchQuery}
          onSearchCommit={vim.commitSearch}
        />
      ) : (
        <>
          <Log entries={state.log} lang={shell.lang} />
          <div ref={logEndRef} aria-hidden="true" />

          <InputLine
            value={state.input}
            cwd={shell.cwd}
            onChange={v => dispatch({ type: 'SET_INPUT', value: v })}
            onSubmit={executeCommand}
            onNavigate={hist.navigate}
            onCancel={() => {
              dispatch({ type: 'EXEC', input: '^C', result: { type: 'empty' } });
              dispatch({ type: 'SET_INPUT', value: '' });
            }}
            onClear={() => {
              dispatch({ type: 'EXEC', input: 'clear', result: { type: 'clear' } });
            }}
            disabled={state.loading}
            onTabComplete={handleTabComplete}
          />

          <div
            role="status"
            aria-live="polite"
            aria-label="shell status"
            className="terminal__status"
          >
            {statusText}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Append CSS to src/styles/terminal.css**

Add the following to the end of `src/styles/terminal.css`:

```css
/* ── Grep result ──────────────────────────────────────────────────────────── */

.terminal__grep-result { margin: 0.25rem 0; }
.terminal__grep-item { padding: 0.35rem 0; border-bottom: 1px solid var(--t-border); }
.terminal__grep-item:last-child { border-bottom: none; }
.terminal__grep-title { color: var(--t-accent); display: block; }
.terminal__grep-excerpt { color: var(--t-fg-muted); font-size: 0.85em; margin-top: 0.15rem; white-space: pre-wrap; }
.terminal__grep-mark { background: var(--t-accent); color: var(--t-bg); padding: 0 0.15em; }

/* ── Pager ────────────────────────────────────────────────────────────────── */

.terminal__pager { flex: 1; overflow-y: auto; padding: 1rem 1.5rem 0.5rem; }
.terminal__pager-block { padding: 0.25rem 0; line-height: 1.6; }
.terminal__pager-block--current { background: var(--t-fg-dim); }
.terminal__pager-block--match { border-left: 2px solid var(--t-accent); padding-left: 0.5rem; }
.terminal__pager-status { flex-shrink: 0; padding: 0.25rem 1.5rem; background: var(--t-bg-alt); border-top: 1px solid var(--t-border); color: var(--t-fg-muted); font-size: 0.75rem; }
.terminal__pager-search { flex-shrink: 0; display: flex; align-items: center; padding: 0.35rem 1.5rem; border-top: 1px solid var(--t-border); }
.terminal__pager-search-prefix { color: var(--t-fg); margin-right: 0.25rem; }
.terminal__pager-search-input { flex: 1; background: transparent; border: none; outline: none; color: var(--t-fg); font-family: inherit; font-size: inherit; }
```

---

## Task 10: Integration build verification

**Files:** No new files — run full suite, TypeScript, and build.

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
# Expected: all prior tests pass, PLUS:
#   flags: all tests passed
#   commands/grep: all tests passed
#   commands/find: all tests passed
#   commands/head: all tests passed
#   commands/now: all tests passed
#   vimmode: all tests passed
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm tsc --noEmit
# Expected: 0 errors
```

- [ ] **Step 3: Full build**

```bash
pnpm build
# Expected: build completes with 0 errors
```

- [ ] **Step 4: Verify exit criteria against spec**

Start dev server with `pnpm dev` and check each criterion:

| Criterion | Verification |
|-----------|-------------|
| `find blog -tag ai -lang en` returns only EN posts tagged ai | Run command; inspect rendered post-list — all items have lang=en and tag ai |
| `grep postgres` highlights matches as `<mark>` elements | Run command; open DevTools Elements; confirm `.terminal__grep-mark` tags present in DOM |
| `head -3 debouncing` returns first 3 markdown blocks | Run command; count rendered blocks in PostView — must be 3 or fewer |
| Tab after `gr` completes to `grep` | Type `gr`, press Tab; input must read `grep` |
| `cat blog/long-post` enters pager; j/k scrolls; `/` starts search; `q` returns to prompt | Run cat on a long post; interact with all vim keys; confirm InputLine reappears after q |
