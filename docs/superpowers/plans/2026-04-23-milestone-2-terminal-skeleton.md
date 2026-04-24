# Milestone 2 — Terminal Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working interactive terminal at `/` — a React island with Shell.tsx, full ARIA, TUI boot sequence, core UNIX commands, content fixture pipeline, localStorage history, and anti-FOUC.

**Architecture:** `scripts/build-fixture.ts` runs before every dev/build via pnpm pre-hooks, reads MDX files with `gray-matter` (no Astro runtime needed), and emits a SHA-256 content-hashed JSON fixture + manifest. `ContentStore` wraps the fixture for typed queries. `Shell.tsx` is a React island mounted with `client:load` that manages a `useReducer` for terminal state, dispatches commands to a registry, and renders results through typed components. Anti-FOUC is a byte-stable inline `<head>` script whose SHA-256 hash is emitted into `public/_headers` by the same build script.

**Tech Stack:** React 19, TypeScript strict, Poku (unit + integration tests), gray-matter, react-markdown@^9, remark-gfm, tsx (TS script runner), vanilla CSS with CSS custom properties.

---

## File map

```
scripts/
  build-fixture.ts          ← reads content, emits terminal.<hash>.json + manifest
  emit-csp-hash.ts          ← computes FOUC script SHA-256, rewrites public/_headers

src/
  terminal/
    Shell.tsx               ← root island: reducer, command dispatch, boot, deep-link
    core/
      types.ts              ← ALL shared types (Result, Command, Context, ContentFixture…)
      content.ts            ← Store class (wraps fixture, degraded mode)
      markdown.ts           ← parseMarkdownBlocks(body) → MarkdownBlock[]
    data/
      load.ts               ← loadFixture(): fetch manifest → fixture, schema check
    commands/
      index.ts              ← command registry map
      help.ts
      whoami.ts
      pwd.ts
      date.ts
      echo.ts
      clear.ts
      uptime.ts
      lang.ts
      history.ts
      cd.ts
      ls.ts
      tree.ts
      cat.ts
    components/
      Log.tsx               ← renders list of LogEntry[], aria-live="polite"
      InputLine.tsx         ← prompt + controlled input, keyboard shortcuts
      EchoLine.tsx          ← renders { type: 'echo' }
      ErrorLine.tsx         ← renders { type: 'error' }
      PostList.tsx          ← renders { type: 'post-list' }
      PostView.tsx          ← renders { type: 'post-view' } via react-markdown
      Table.tsx             ← renders { type: 'table' }
    hooks/
      useHistory.ts         ← localStorage command history
    themes/
      styles/
        matrix.css          ← [data-theme="matrix"] CSS custom properties
  styles/
    terminal.css            ← shell layout + mobile dvh + input styles
  pages/
    index.astro             ← MODIFIED: mount <Shell /> with client:load
    terminal.json.ts        ← NEW: dev-only live fixture endpoint

tests/
  unit/
    markdown.test.ts
    content.test.ts
    load.test.ts
    history.test.ts
    commands/
      help.test.ts
      ls.test.ts
      cd.test.ts
      cat.test.ts
      lang.test.ts

public/
  _headers                  ← MODIFIED: add sha256 hash to script-src
```

---

## Task 1: Add dependencies and update package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add new dependencies**

```bash
pnpm add gray-matter react-markdown remark-gfm
pnpm add -D tsx
```

Expected: `pnpm-lock.yaml` updated, packages installed.

- [ ] **Step 2: Update package.json scripts**

Open `package.json` and change the `"scripts"` block to:

```json
"scripts": {
  "predev":     "tsx scripts/build-fixture.ts",
  "prebuild":   "tsx scripts/build-fixture.ts",
  "dev":        "astro dev",
  "build":      "astro build",
  "preview":    "astro preview",
  "format":     "oxfmt src",
  "lint":       "oxlint src",
  "test":       "poku tests/unit",
  "typecheck":  "tsc --noEmit"
}
```

- [ ] **Step 3: Verify pnpm install**

```bash
pnpm install
```

Expected: lockfile updated, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add gray-matter, react-markdown, tsx for terminal pipeline"
```

---

## Task 2: Core types

**Files:**
- Create: `src/terminal/core/types.ts`
- Create: `tests/unit/types.test.ts`

- [ ] **Step 1: Write failing types test**

```ts
// tests/unit/types.test.ts
import { assert } from 'poku';
import { defineCommand } from '../../src/terminal/core/types.js';

// defineCommand is a pass-through — verifies the module loads and types work
const cmd = defineCommand({
  name: 'test',
  describe: 'test command',
  run: (_args, _ctx) => ({ type: 'echo' as const, text: 'ok' }),
});

assert.strictEqual(cmd.name, 'test', 'defineCommand returns command with correct name');
assert.strictEqual(cmd.describe, 'test command', 'defineCommand returns command with correct describe');

const result = cmd.run([], {} as Parameters<typeof cmd.run>[1]);
assert.ok(result instanceof Promise || typeof result === 'object', 'run returns Result or Promise<Result>');
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm test
```

Expected: `Cannot find module '../../src/terminal/core/types.js'`

- [ ] **Step 3: Create src/terminal/core/types.ts**

```ts
// src/terminal/core/types.ts

export type Lang = 'en' | 'pt';
export type ErrorCode = 'ENOENT' | 'EINVAL' | 'EPERM' | 'EACCES' | 'ENOTDIR';

// ─── Fixture shapes ──────────────────────────────────────────────────────────

export interface FixturePost {
  slug:          string;
  lang:          Lang;
  title:         string;
  date:          string;       // ISO YYYY-MM-DD
  tags:          string[];
  dek:           string;
  readingTime:   number;
  featured:      boolean;
  draft:         boolean;
  translationOf?: string;
  body:          string;       // raw markdown (frontmatter stripped)
}

export interface FixtureProject {
  id:       string;
  title:    string;
  year:     number;
  category: 'work' | 'personal' | 'sim-racing' | 'ai-tooling';
  dek:      string;
  featured: boolean;
  stack?:   string;
  metric?:  string;
  url?:     string;
  status:   'active' | 'archived' | 'discontinued';
}

export interface FixtureTalk {
  id:        string;
  title:     string;
  kind:      'talk' | 'podcast' | 'workshop' | 'interview' | 'video';
  venue:     string;
  location?: string;
  date:      string;           // ISO YYYY-MM-DD
  lang:      Lang;
  url:       string;
  views?:    number;
}

export interface FixturePage {
  body: string;
}

export interface FixtureNow {
  updated:    string;
  location:   string;
  building:   string;
  reading:    string;
  listening:  string;
  learning:   string;
  lookingFor: string;
  body:       string;
}

export interface ContentFixture {
  schemaVersion: 1;
  generatedAt:   string;
  posts:         FixturePost[];
  projects:      FixtureProject[];
  talks:         FixtureTalk[];
  uses:          FixturePage;
  now:           FixtureNow;
  about:         { en: FixturePage; pt: FixturePage };
  resume:        FixturePage;
}

// ─── Markdown ────────────────────────────────────────────────────────────────

export interface MarkdownBlock {
  type:   'paragraph' | 'heading' | 'code' | 'blockquote' | 'list' | 'hr';
  raw:    string;
  level?: number;              // heading level (1-6)
}

// ─── Terminal result types ────────────────────────────────────────────────────

export interface Column {
  key:    string;
  label:  string;
  align?: 'left' | 'right';
}

export interface NeofetchData {
  name:     string;
  title:    string;
  location: string;
  lang:     string;
  theme:    string;
  found:    string;
  uptime:   string;
  shell:    string;
}

export interface GrepMatch {
  slug:       string;
  title:      string;
  excerpt:    string;
  matchStart: number;
  matchEnd:   number;
}

export type Result =
  | { type: 'echo';         text: string;                                    exitCode?: number }
  | { type: 'error';        text: string; hint?: string; code?: ErrorCode;   exitCode: 1 }
  | { type: 'clear' }
  | { type: 'navigate';     href: string; target?: '_self' | '_blank' }
  | { type: 'post-list';    items: FixturePost[];     meta?: { tag?: string; lang?: Lang } }
  | { type: 'post-view';    post: FixturePost }
  | { type: 'project-list'; items: FixtureProject[];  meta?: object }
  | { type: 'table';        columns: Column[];         rows: string[][] }
  | { type: 'neofetch';     data: NeofetchData }
  | { type: 'grep-result';  matches: GrepMatch[] }
  | { type: 'pager';        blocks: MarkdownBlock[];   title: string }
  | { type: 'empty' };

// ─── Shell state ─────────────────────────────────────────────────────────────

export interface ShellState {
  cwd:      string;   // '~' | 'blog' | 'projects' | 'talks' | 'uses'
  lang:     Lang;
  theme:    string;
  found:    number;   // unlocked theme count (incremented in M4+)
  degraded: boolean;
}

// ─── ContentStore interface ───────────────────────────────────────────────────

export interface ContentStore {
  degraded:   boolean;
  posts(lang: Lang): FixturePost[];
  post(lang: Lang, slug: string): FixturePost | undefined;
  loadPost(slug: string): Promise<FixturePost | undefined>;
  projects(): FixtureProject[];
  talks(): FixtureTalk[];
  now(): FixtureNow;
  about(lang: Lang): FixturePage;
  uses(): FixturePage;
  resume(): FixturePage;
}

// ─── Command system ───────────────────────────────────────────────────────────

export interface Context {
  store:    ContentStore;
  state:    ShellState;
  setState: (update: Partial<ShellState>) => void;
}

export interface Command {
  name:      string;
  describe:  string;
  run(args: string[], ctx: Context): Result | Promise<Result>;
  complete?(partial: string, ctx: Context): string[];
}

export function defineCommand(cmd: Command): Command {
  return cmd;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test
```

Expected: all test files pass including the new `types.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/terminal/core/types.ts tests/unit/types.test.ts
git commit -m "feat: add terminal core types — Result union, Command, ContentFixture"
```

---

## Task 3: Markdown blocks parser

**Files:**
- Create: `src/terminal/core/markdown.ts`
- Create: `tests/unit/markdown.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/markdown.test.ts
import { assert } from 'poku';
import { parseMarkdownBlocks } from '../../src/terminal/core/markdown.js';

// Heading detection
const h1 = parseMarkdownBlocks('# Hello World\n\nSome paragraph.');
assert.strictEqual(h1[0].type, 'heading', 'h1 is heading');
assert.strictEqual(h1[0].level, 1, 'h1 level is 1');
assert.strictEqual(h1[1].type, 'paragraph', 'paragraph follows heading');

// H2
const h2 = parseMarkdownBlocks('## Section\n\nText.');
assert.strictEqual(h2[0].level, 2, 'h2 level is 2');

// Code block
const code = parseMarkdownBlocks('Some text.\n\n```ts\nconst x = 1;\n```');
assert.strictEqual(code[1].type, 'code', 'fenced code block detected');

// Blockquote
const bq = parseMarkdownBlocks('> A quote\n\nText after.');
assert.strictEqual(bq[0].type, 'blockquote', 'blockquote detected');

// Unordered list
const ul = parseMarkdownBlocks('- item one\n- item two\n\nParagraph.');
assert.strictEqual(ul[0].type, 'list', 'unordered list detected');

// Ordered list
const ol = parseMarkdownBlocks('1. first\n2. second\n\nText.');
assert.strictEqual(ol[0].type, 'list', 'ordered list detected');

// HR
const hr = parseMarkdownBlocks('Before.\n\n---\n\nAfter.');
assert.strictEqual(hr[1].type, 'hr', 'horizontal rule detected');

// Empty input
const empty = parseMarkdownBlocks('');
assert.strictEqual(empty.length, 0, 'empty string returns empty array');

// Frontmatter is NOT expected in body — body is already stripped
const nofm = parseMarkdownBlocks('First paragraph.\n\nSecond paragraph.');
assert.strictEqual(nofm.length, 2, 'two blocks from two paragraphs');
assert.strictEqual(nofm[0].type, 'paragraph', 'first is paragraph');
assert.strictEqual(nofm[1].type, 'paragraph', 'second is paragraph');

console.log('markdown: all tests passed');
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test
```

Expected: `Cannot find module '../../src/terminal/core/markdown.js'`

- [ ] **Step 3: Implement src/terminal/core/markdown.ts**

```ts
// src/terminal/core/markdown.ts
import type { MarkdownBlock } from './types.js';

export function parseMarkdownBlocks(body: string): MarkdownBlock[] {
  if (!body.trim()) return [];

  // Split on two or more newlines (paragraph separator)
  // Code blocks may contain double newlines, so we need to handle them specially
  const blocks: MarkdownBlock[] = [];
  let remaining = body.trim();

  while (remaining.length > 0) {
    // Code block — consume until closing ```
    if (remaining.startsWith('```')) {
      const closeIdx = remaining.indexOf('```', 3);
      if (closeIdx !== -1) {
        const raw = remaining.slice(0, closeIdx + 3);
        blocks.push({ type: 'code', raw });
        remaining = remaining.slice(closeIdx + 3).replace(/^\n+/, '');
        continue;
      }
    }

    // Find next blank-line boundary
    const boundary = remaining.search(/\n{2,}/);
    const raw = boundary === -1 ? remaining : remaining.slice(0, boundary);
    const trimmed = raw.trim();
    remaining = boundary === -1 ? '' : remaining.slice(boundary).replace(/^\n+/, '');

    if (!trimmed) continue;

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s/);
    if (headingMatch) {
      blocks.push({ type: 'heading', raw: trimmed, level: headingMatch[1].length });
      continue;
    }
    // Blockquote
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'blockquote', raw: trimmed });
      continue;
    }
    // Lists
    if (/^[-*+] /.test(trimmed) || /^\d+\. /.test(trimmed)) {
      blocks.push({ type: 'list', raw: trimmed });
      continue;
    }
    // HR
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed) || /^_{3,}$/.test(trimmed)) {
      blocks.push({ type: 'hr', raw: trimmed });
      continue;
    }
    // Default: paragraph
    blocks.push({ type: 'paragraph', raw: trimmed });
  }

  return blocks;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm test
```

Expected: `markdown: all tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/terminal/core/markdown.ts tests/unit/markdown.test.ts
git commit -m "feat: add parseMarkdownBlocks utility with Poku tests"
```

---

## Task 4: ContentStore

**Files:**
- Create: `src/terminal/core/content.ts`
- Create: `tests/unit/content.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/content.test.ts
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test
```

Expected: `Cannot find module '../../src/terminal/core/content.js'`

- [ ] **Step 3: Implement src/terminal/core/content.ts**

```ts
// src/terminal/core/content.ts
import type {
  ContentFixture, ContentStore, FixturePost, FixtureProject,
  FixtureTalk, FixtureNow, FixturePage, Lang,
} from './types.js';

const EMPTY_PAGE: FixturePage = { body: '' };
const EMPTY_NOW: FixtureNow = {
  updated: '', location: '', building: '', reading: '',
  listening: '', learning: '', lookingFor: '', body: '',
};

export class Store implements ContentStore {
  private fixture: ContentFixture | null;

  constructor(fixture: ContentFixture | null) {
    this.fixture = fixture;
  }

  get degraded(): boolean {
    return this.fixture === null;
  }

  posts(lang: Lang): FixturePost[] {
    if (!this.fixture) return [];
    return this.fixture.posts.filter(p => p.lang === lang && !p.draft);
  }

  post(lang: Lang, slug: string): FixturePost | undefined {
    if (!this.fixture) return undefined;
    return this.fixture.posts.find(p => p.lang === lang && p.slug === slug && !p.draft);
  }

  async loadPost(slug: string): Promise<FixturePost | undefined> {
    if (!this.fixture) return undefined;
    return this.fixture.posts.find(p => p.slug === slug && !p.draft);
  }

  projects(): FixtureProject[] {
    return this.fixture?.projects ?? [];
  }

  talks(): FixtureTalk[] {
    return this.fixture?.talks ?? [];
  }

  now(): FixtureNow {
    return this.fixture?.now ?? EMPTY_NOW;
  }

  about(lang: Lang): FixturePage {
    return this.fixture?.about[lang] ?? EMPTY_PAGE;
  }

  uses(): FixturePage {
    return this.fixture?.uses ?? EMPTY_PAGE;
  }

  resume(): FixturePage {
    return this.fixture?.resume ?? EMPTY_PAGE;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm test
```

Expected: `content: all tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/terminal/core/content.ts tests/unit/content.test.ts
git commit -m "feat: add ContentStore with degraded mode and Poku tests"
```

---

## Task 5: Fixture build script

**Files:**
- Create: `scripts/build-fixture.ts`

Note: This script runs outside the Astro runtime via `tsx`. It reads MDX files directly with `gray-matter` and Node.js `fs`. No `astro:content` import.

- [ ] **Step 1: Create scripts/build-fixture.ts**

```ts
// scripts/build-fixture.ts
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { calcReadingTime } from '../src/lib/reading-time.js';
import type {
  ContentFixture, FixtureNow, FixturePage, FixturePost, FixtureProject, FixtureTalk,
} from '../src/terminal/core/types.js';

const ROOT       = fileURLToPath(new URL('..', import.meta.url));
const CONTENT    = join(ROOT, 'src/content');
const PUBLIC_DIR = join(ROOT, 'public');

// ── helpers ──────────────────────────────────────────────────────────────────

function readMdx(path: string): { data: Record<string, unknown>; content: string } {
  const raw = readFileSync(path, 'utf-8');
  const { data, content } = matter(raw);
  return { data, content: content.trim() };
}

function toISO(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string') return val.slice(0, 10);
  return '';
}

// ── posts ────────────────────────────────────────────────────────────────────

function buildPosts(): FixturePost[] {
  const blogDir = join(CONTENT, 'blog');
  if (!existsSync(blogDir)) return [];

  const files = readdirSync(blogDir, { recursive: true }) as string[];
  return files
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(filename => {
      const fullPath = join(blogDir, filename);
      const { data, content } = readMdx(fullPath);
      const parts = filename.replace(/\.(mdx|md)$/, '').split('/');
      const lang = parts[0] as 'en' | 'pt';
      const slug = parts.slice(1).join('/');
      return {
        slug,
        lang,
        title:         String(data.title ?? ''),
        date:          toISO(data.date),
        tags:          Array.isArray(data.tags) ? data.tags.map(String) : [],
        dek:           String(data.dek ?? ''),
        readingTime:   typeof data.readingTime === 'number'
                         ? data.readingTime
                         : calcReadingTime(content),
        featured:      Boolean(data.featured ?? false),
        draft:         Boolean(data.draft ?? false),
        translationOf: data.translationOf ? String(data.translationOf) : undefined,
        body:          content,
      } satisfies FixturePost;
    });
}

// ── projects ─────────────────────────────────────────────────────────────────

function buildProjects(): FixtureProject[] {
  const dir = join(CONTENT, 'projects');
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  return files.map(filename => {
    const { data } = readMdx(join(dir, filename));
    return {
      id:       basename(filename, extname(filename)),
      title:    String(data.title ?? ''),
      year:     Number(data.year ?? 0),
      category: (data.category as FixtureProject['category']) ?? 'personal',
      dek:      String(data.dek ?? ''),
      featured: Boolean(data.featured ?? false),
      stack:    data.stack ? String(data.stack) : undefined,
      metric:   data.metric ? String(data.metric) : undefined,
      url:      data.url ? String(data.url) : undefined,
      status:   (data.status as FixtureProject['status']) ?? 'active',
    } satisfies FixtureProject;
  });
}

// ── talks ────────────────────────────────────────────────────────────────────

function buildTalks(): FixtureTalk[] {
  const dir = join(CONTENT, 'talks');
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  return files.map(filename => {
    const { data } = readMdx(join(dir, filename));
    return {
      id:       basename(filename, extname(filename)),
      title:    String(data.title ?? ''),
      kind:     (data.kind as FixtureTalk['kind']) ?? 'talk',
      venue:    String(data.venue ?? ''),
      location: data.location ? String(data.location) : undefined,
      date:     toISO(data.date),
      lang:     (data.lang as 'en' | 'pt') ?? 'en',
      url:      String(data.url ?? ''),
      views:    data.views != null ? Number(data.views) : undefined,
    } satisfies FixtureTalk;
  });
}

// ── single pages ──────────────────────────────────────────────────────────────

function buildPage(path: string): FixturePage {
  if (!existsSync(path)) return { body: '' };
  const { content } = readMdx(path);
  return { body: content };
}

function buildNow(): FixtureNow {
  const path = join(CONTENT, 'now.mdx');
  if (!existsSync(path)) {
    return { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' };
  }
  const { data, content } = readMdx(path);
  return {
    updated:    toISO(data.updated),
    location:   String(data.location ?? ''),
    building:   String(data.building ?? ''),
    reading:    String(data.reading ?? ''),
    listening:  String(data.listening ?? ''),
    learning:   String(data.learning ?? ''),
    lookingFor: String(data.lookingFor ?? ''),
    body:       content,
  };
}

// ── assemble ──────────────────────────────────────────────────────────────────

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt:   new Date().toISOString(),
  posts:         buildPosts(),
  projects:      buildProjects(),
  talks:         buildTalks(),
  uses:          buildPage(join(CONTENT, 'uses.mdx')),
  now:           buildNow(),
  about: {
    en: buildPage(join(CONTENT, 'about/en.mdx')),
    pt: buildPage(join(CONTENT, 'about/pt.mdx')),
  },
  resume:        buildPage(join(CONTENT, 'resume.mdx')),
};

// ── emit ──────────────────────────────────────────────────────────────────────

const json   = JSON.stringify(fixture);
const hash   = createHash('sha256').update(json).digest('hex').slice(0, 8);
const fname  = `terminal.${hash}.json`;

if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

writeFileSync(join(PUBLIC_DIR, fname), json);
writeFileSync(
  join(PUBLIC_DIR, 'terminal.manifest.json'),
  JSON.stringify({ current: fname }, null, 2),
);

console.log(`[fixture] → public/${fname} (${fixture.posts.length} posts)`);
```

- [ ] **Step 2: Run the script manually**

```bash
tsx scripts/build-fixture.ts
```

Expected output:
```
[fixture] → public/terminal.xxxxxxxx.json (3 posts)
```

Verify files exist:
```bash
ls public/terminal.*.json public/terminal.manifest.json
```

Expected: both files present.

- [ ] **Step 3: Verify manifest contents**

```bash
cat public/terminal.manifest.json
```

Expected:
```json
{ "current": "terminal.xxxxxxxx.json" }
```

- [ ] **Step 4: Run full test suite (should still pass)**

```bash
pnpm test
```

Expected: `PASS › 5 | FAIL › 0`

- [ ] **Step 5: Commit**

```bash
git add scripts/build-fixture.ts public/terminal.manifest.json
git commit -m "feat: add fixture build script — emits content-hashed terminal.json"
```

---

## Task 6: Dev HMR endpoint

**Files:**
- Create: `src/pages/terminal.json.ts`

This endpoint is served in dev only (Astro dev server). In prod, `public/terminal.<hash>.json` is the static file. The terminal fetches `/terminal.manifest.json` first in both environments.

- [ ] **Step 1: Create src/pages/terminal.json.ts**

```ts
// src/pages/terminal.json.ts
// Dev-only live endpoint — reads content directly on every request for HMR.
// In production, terminal.manifest.json points to the pre-built static fixture.
import type { APIContext } from 'astro';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export async function GET(_ctx: APIContext): Promise<Response> {
  const manifestPath = join(ROOT, 'public/terminal.manifest.json');
  if (!existsSync(manifestPath)) {
    return new Response(JSON.stringify({ error: 'fixture not built — run pnpm dev' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { current } = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { current: string };
  const fixturePath = join(ROOT, 'public', current);

  if (!existsSync(fixturePath)) {
    return new Response(JSON.stringify({ error: `fixture file ${current} not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fixture = readFileSync(fixturePath, 'utf-8');
  return new Response(fixture, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
```

- [ ] **Step 2: Verify dev endpoint starts**

```bash
pnpm dev
```

In a second terminal:
```bash
curl -s http://localhost:4321/terminal.json | head -c 100
```

Expected: JSON starting with `{"schemaVersion":1,...`

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add src/pages/terminal.json.ts
git commit -m "feat: add dev HMR endpoint for terminal.json"
```

---

## Task 7: Fixture loader

**Files:**
- Create: `src/terminal/data/load.ts`
- Create: `tests/unit/load.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/load.test.ts
import { assert } from 'poku';
import { parseFixture, SCHEMA_VERSION } from '../../src/terminal/data/load.js';
import type { ContentFixture } from '../../src/terminal/core/types.js';

const validFixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-23T00:00:00.000Z',
  posts: [],
  projects: [],
  talks: [],
  uses: { body: '' },
  now: { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '' },
};

// Valid fixture
const goodResult = parseFixture(validFixture);
assert.strictEqual(goodResult.ok, true, 'valid fixture returns ok: true');
if (goodResult.ok) {
  assert.strictEqual(goodResult.data.schemaVersion, 1, 'data has schemaVersion 1');
}

// Wrong schema version
const wrongVersion = { ...validFixture, schemaVersion: 99 };
// @ts-expect-error — intentionally wrong version for test
const badResult = parseFixture(wrongVersion);
assert.strictEqual(badResult.ok, false, 'wrong schemaVersion returns ok: false');
if (!badResult.ok) {
  assert.ok(badResult.error.includes('schema'), 'error message mentions schema');
}

// Missing schemaVersion
const noVersion = { ...validFixture, schemaVersion: undefined };
// @ts-expect-error — intentionally missing
const noVerResult = parseFixture(noVersion);
assert.strictEqual(noVerResult.ok, false, 'missing schemaVersion returns ok: false');

// SCHEMA_VERSION constant
assert.strictEqual(SCHEMA_VERSION, 1, 'SCHEMA_VERSION exported as 1');

console.log('load: all tests passed');
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test
```

Expected: `Cannot find module '../../src/terminal/data/load.js'`

- [ ] **Step 3: Implement src/terminal/data/load.ts**

```ts
// src/terminal/data/load.ts
import type { ContentFixture } from '../core/types.js';

export const SCHEMA_VERSION = 1 as const;

export type LoadResult =
  | { ok: true;  data: ContentFixture }
  | { ok: false; error: string };

export function parseFixture(raw: unknown): LoadResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'fixture is not an object' };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `schema version mismatch — expected ${SCHEMA_VERSION}, got ${obj.schemaVersion}`,
    };
  }

  return { ok: true, data: obj as ContentFixture };
}

export async function loadFixture(): Promise<LoadResult> {
  try {
    const manifestRes = await fetch('/terminal.manifest.json');
    if (!manifestRes.ok) {
      return { ok: false, error: `manifest fetch failed: ${manifestRes.status}` };
    }

    const manifest = (await manifestRes.json()) as { current: string };
    const fixtureRes = await fetch(`/${manifest.current}`, {
      cache: 'force-cache',
    });

    if (!fixtureRes.ok) {
      return { ok: false, error: `fixture fetch failed: ${fixtureRes.status}` };
    }

    const raw = await fixtureRes.json();
    return parseFixture(raw);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm test
```

Expected: `load: all tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/terminal/data/load.ts tests/unit/load.test.ts
git commit -m "feat: add fixture loader with schema version check and degraded mode"
```

---

## Task 8: Matrix theme and terminal CSS

**Files:**
- Create: `src/terminal/themes/styles/matrix.css`
- Create: `src/styles/terminal.css`

- [ ] **Step 1: Create matrix.css**

```css
/* src/terminal/themes/styles/matrix.css */
:root,
[data-theme="matrix"] {
  --t-bg:          #0d1117;
  --t-bg-alt:      #161b22;
  --t-fg:          #39ff14;
  --t-fg-muted:    #39ff1480;
  --t-fg-dim:      #39ff1433;
  --t-accent:      #00bfff;
  --t-error:       #ff4444;
  --t-warning:     #ffcc00;
  --t-success:     #39ff14;
  --t-border:      #39ff1420;
  --t-font-mono:   'Courier New', 'Courier', monospace;
  --t-font-size:   0.95rem;
  --t-line-height: 1.5;
}
```

- [ ] **Step 2: Create terminal.css**

```css
/* src/styles/terminal.css */

/* ── Shell layout ─────────────────────────────────────────── */

.terminal {
  height:           100dvh;
  display:          flex;
  flex-direction:   column;
  overflow:         hidden;
  background:       var(--t-bg);
  color:            var(--t-fg);
  font-family:      var(--t-font-mono);
  font-size:        var(--t-font-size);
  line-height:      var(--t-line-height);
}

/* ── Output log ────────────────────────────────────────────── */

.terminal__log {
  flex:                1;
  overflow-y:          auto;
  overflow-x:          hidden;
  padding:             1rem 1.5rem 0.5rem;
  overscroll-behavior: contain;
  scroll-behavior:     smooth;
}

.terminal__log-entry {
  margin-bottom: 0.5rem;
}

.terminal__log-entry-input {
  color:         var(--t-fg-muted);
  margin-bottom: 0.15rem;
}

.terminal__log-entry-input::before {
  content: '~ $ ';
}

/* ── Input row ──────────────────────────────────────────────── */

.terminal__input-row {
  flex-shrink:     0;
  display:         flex;
  align-items:     center;
  gap:             0.5rem;
  padding:         0.5rem 1.5rem;
  border-top:      1px solid var(--t-border);
  min-height:      44px;
  padding-bottom:  calc(0.5rem + var(--keyboard-offset, 0px));
  transition:      padding-bottom 120ms ease;
}

.terminal__prompt {
  color:       var(--t-fg-muted);
  white-space: nowrap;
  user-select: none;
  flex-shrink: 0;
}

.terminal__input {
  flex:             1;
  background:       transparent;
  border:           none;
  outline:          none;
  color:            var(--t-fg);
  font-family:      inherit;
  font-size:        max(16px, var(--t-font-size));
  caret-color:      var(--t-fg);
  min-width:        0;
}

/* ── Status bar ─────────────────────────────────────────────── */

.terminal__status {
  flex-shrink:     0;
  padding:         0.25rem 1.5rem;
  border-top:      1px solid var(--t-border);
  font-size:       0.75rem;
  color:           var(--t-fg-muted);
  white-space:     nowrap;
  overflow:        hidden;
  text-overflow:   ellipsis;
  background:      var(--t-bg-alt);
}

/* ── Result types ───────────────────────────────────────────── */

.terminal__echo {
  color:        var(--t-fg);
  white-space:  pre-wrap;
  word-break:   break-word;
}

.terminal__error {
  color: var(--t-error);
}

.terminal__error-hint {
  color:      var(--t-fg-muted);
  font-size:  0.85em;
  margin-top: 0.2rem;
}

.terminal__post-list {
  list-style: none;
  padding:    0;
  margin:     0;
}

.terminal__post-item {
  padding:      0.4rem 0;
  border-bottom: 1px solid var(--t-border);
}

.terminal__post-item:last-child { border-bottom: none; }

.terminal__post-date  { color: var(--t-fg-muted); margin-right: 1rem; }
.terminal__post-dek   { color: var(--t-fg-muted); font-size: 0.85em; margin-top: 0.15rem; }

.terminal__post-tag {
  display:         inline-block;
  font-size:       0.75em;
  padding:         0.1em 0.4em;
  border:          1px solid var(--t-border);
  border-radius:   3px;
  color:           var(--t-fg-muted);
  margin-left:     0.35rem;
  text-decoration: none;
}

.terminal__table {
  border-collapse: collapse;
  width:           100%;
  margin:          0.5rem 0;
}

.terminal__table th,
.terminal__table td {
  padding:      0.25rem 0.75rem;
  text-align:   left;
  border-bottom: 1px solid var(--t-border);
}

.terminal__table th {
  color:       var(--t-fg-muted);
  font-weight: normal;
}

.terminal__table td[data-align="right"],
.terminal__table th[data-align="right"] {
  text-align: right;
}

/* post-view via react-markdown */
.terminal__post-view {
  line-height: 1.7;
}

.terminal__post-view h1,
.terminal__post-view h2,
.terminal__post-view h3 {
  color:      var(--t-accent);
  margin-top: 1.5rem;
}

.terminal__post-view code {
  background:    var(--t-bg-alt);
  padding:       0.1em 0.3em;
  border-radius: 3px;
  font-size:     0.9em;
}

.terminal__post-view pre {
  background:    var(--t-bg-alt);
  border:        1px solid var(--t-border);
  border-radius: 4px;
  padding:       0.75rem 1rem;
  overflow-x:    auto;
}

.terminal__post-view pre code { background: none; padding: 0; }

.terminal__post-view a { color: var(--t-accent); }

/* ── Motion ─────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .terminal__input-row { transition: none; }
}
```

- [ ] **Step 3: Run tests (no change expected)**

```bash
pnpm test
```

Expected: all tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/terminal/themes/styles/matrix.css src/styles/terminal.css
git commit -m "feat: add matrix theme and terminal CSS layout"
```

---

## Task 9: useHistory hook

**Files:**
- Create: `src/terminal/hooks/useHistory.ts`
- Create: `tests/unit/history.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/history.test.ts
import { assert } from 'poku';
import { buildHistory } from '../../src/terminal/hooks/useHistory.js';

// buildHistory is the pure (non-hook) logic for testing
const h = buildHistory([]);

h.push('ls');
h.push('cat debouncing');
h.push('pwd');

assert.strictEqual(h.entries().length, 3, 'history has 3 entries');
assert.strictEqual(h.entries()[0], 'ls', 'oldest entry is first');
assert.strictEqual(h.entries()[2], 'pwd', 'newest entry is last');

// Navigation
h.reset();
assert.strictEqual(h.navigate(-1), 'pwd', 'navigate(-1) = last entry');
assert.strictEqual(h.navigate(-1), 'cat debouncing', 'navigate(-1) again goes further back');
assert.strictEqual(h.navigate(1), 'pwd', 'navigate(1) goes forward');
assert.strictEqual(h.navigate(1), '', 'navigate(1) past end returns empty string');

// Deduplication — duplicate consecutive entries not added
h.push('pwd');
h.push('pwd');
assert.strictEqual(h.entries().filter(e => e === 'pwd').length, 2, 'duplicate at end not added');

// Cap at 100
const big = buildHistory([]);
for (let i = 0; i < 110; i++) big.push(`cmd-${i}`);
assert.strictEqual(big.entries().length, 100, 'history capped at 100 entries');

console.log('history: all tests passed');
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test
```

Expected: `Cannot find module '../../src/terminal/hooks/useHistory.js'`

- [ ] **Step 3: Implement src/terminal/hooks/useHistory.ts**

```ts
// src/terminal/hooks/useHistory.ts
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'evandro.history.v1';
const MAX_ENTRIES = 100;

// Pure logic extracted for testing
export function buildHistory(initial: string[]) {
  const entries: string[] = [...initial];
  let cursor = entries.length; // points past the end (current input)

  return {
    entries:  () => [...entries],
    push(cmd: string) {
      if (cmd.trim() === '') return;
      if (entries[entries.length - 1] === cmd) return; // dedup consecutive
      entries.push(cmd);
      if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
      cursor = entries.length;
    },
    reset() {
      cursor = entries.length;
    },
    navigate(direction: -1 | 1): string {
      const next = cursor + direction;
      if (next < 0) return entries[0] ?? '';
      if (next >= entries.length) {
        cursor = entries.length;
        return '';
      }
      cursor = next;
      return entries[cursor] ?? '';
    },
  };
}

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Safari private mode — swallow
  }
}

export function useHistory() {
  const [hist] = useState(() => buildHistory(loadFromStorage()));

  const push = useCallback((cmd: string) => {
    hist.push(cmd);
    saveToStorage(hist.entries());
  }, [hist]);

  const navigate = useCallback((dir: -1 | 1) => hist.navigate(dir), [hist]);
  const reset    = useCallback(() => hist.reset(), [hist]);

  return { push, navigate, reset };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm test
```

Expected: `history: all tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/terminal/hooks/useHistory.ts tests/unit/history.test.ts
git commit -m "feat: add useHistory hook with localStorage persistence and Poku tests"
```

---

## Task 10: Result renderer components

**Files:**
- Create: `src/terminal/components/EchoLine.tsx`
- Create: `src/terminal/components/ErrorLine.tsx`
- Create: `src/terminal/components/PostList.tsx`
- Create: `src/terminal/components/Table.tsx`
- Create: `src/terminal/components/PostView.tsx`

No Poku component tests in this task — Shell integration in Task 13 will exercise these. These are thin presentational components.

- [ ] **Step 1: Create EchoLine.tsx**

```tsx
// src/terminal/components/EchoLine.tsx
interface Props { text: string }

export default function EchoLine({ text }: Props) {
  return <div className="terminal__echo">{text}</div>;
}
```

- [ ] **Step 2: Create ErrorLine.tsx**

```tsx
// src/terminal/components/ErrorLine.tsx
interface Props { text: string; hint?: string }

export default function ErrorLine({ text, hint }: Props) {
  return (
    <div aria-live="assertive">
      <div className="terminal__error">{text}</div>
      {hint && <div className="terminal__error-hint">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create PostList.tsx**

```tsx
// src/terminal/components/PostList.tsx
import type { FixturePost, Lang } from '../core/types.js';

interface Props {
  items: FixturePost[];
  lang:  Lang;
}

export default function PostList({ items, lang }: Props) {
  if (items.length === 0) {
    return <div className="terminal__echo">no posts found</div>;
  }

  return (
    <ul className="terminal__post-list" aria-label={`${items.length} post${items.length === 1 ? '' : 's'}`}>
      {items.map(post => (
        <li key={`${post.lang}/${post.slug}`} className="terminal__post-item">
          <span className="terminal__post-date">{post.date}</span>
          <a href={`/${lang}/blog/${post.slug}`} className="terminal__echo">
            {post.title}
          </a>
          {post.tags.map(tag => (
            <span key={tag} className="terminal__post-tag">{tag}</span>
          ))}
          <div className="terminal__post-dek">{post.dek}</div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Create Table.tsx**

```tsx
// src/terminal/components/Table.tsx
import type { Column } from '../core/types.js';

interface Props {
  columns: Column[];
  rows:    string[][];
}

export default function Table({ columns, rows }: Props) {
  return (
    <table className="terminal__table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} data-align={col.align ?? 'left'}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} data-align={columns[ci]?.align ?? 'left'}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Create PostView.tsx**

```tsx
// src/terminal/components/PostView.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FixturePost, Lang } from '../core/types.js';

interface Props {
  post: FixturePost;
  lang: Lang;
}

export default function PostView({ post, lang }: Props) {
  return (
    <div className="terminal__post-view">
      <div className="terminal__echo" style={{ marginBottom: '0.5rem', color: 'var(--t-accent)' }}>
        {post.title}
      </div>
      <div style={{ color: 'var(--t-fg-muted)', fontSize: '0.85em', marginBottom: '1rem' }}>
        {post.date} · {post.readingTime} min · {post.tags.join(', ')}
      </div>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {post.body}
      </ReactMarkdown>
      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--t-border)', paddingTop: '0.5rem' }}>
        <a href={`/${lang}/blog/${post.slug}`} style={{ color: 'var(--t-accent)' }}>
          view in browser →
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests (no change expected)**

```bash
pnpm test
```

Expected: all tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/terminal/components/
git commit -m "feat: add result renderer components (EchoLine, ErrorLine, PostList, Table, PostView)"
```

---

## Task 11: InputLine component

**Files:**
- Create: `src/terminal/components/InputLine.tsx`

- [ ] **Step 1: Create InputLine.tsx**

```tsx
// src/terminal/components/InputLine.tsx
import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';

interface Props {
  value:       string;
  cwd:         string;
  onChange:    (value: string) => void;
  onSubmit:    (value: string) => void;
  onNavigate:  (dir: -1 | 1) => string;
  onCancel:    () => void;
  onClear:     () => void;
  disabled:    boolean;
}

export default function InputLine({
  value, cwd, onChange, onSubmit, onNavigate, onCancel, onClear, disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  const onFocus = useCallback(() => {
    inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;

    // History navigation
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
          const pos = input.selectionStart ?? 0;
          const before = input.value.slice(0, pos);
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
  }, [value, onChange, onSubmit, onNavigate, onCancel, onClear]);

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

// Export focus helper for Shell to call after command execution
export type InputLineRef = { focus: () => void };
```

- [ ] **Step 2: Run tests (no change expected)**

```bash
pnpm test
```

- [ ] **Step 3: Commit**

```bash
git add src/terminal/components/InputLine.tsx
git commit -m "feat: add InputLine with Ctrl+C/L/A/E/K/U/W keyboard shortcuts"
```

---

## Task 12: Log component

**Files:**
- Create: `src/terminal/components/Log.tsx`

- [ ] **Step 1: Create Log.tsx**

```tsx
// src/terminal/components/Log.tsx
import type { Result, Lang } from '../core/types.js';
import EchoLine  from './EchoLine.js';
import ErrorLine from './ErrorLine.js';
import PostList  from './PostList.js';
import PostView  from './PostView.js';
import Table     from './Table.js';

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
    case 'empty':
      return null;
    case 'clear':
    case 'navigate':
    case 'neofetch':
    case 'grep-result':
    case 'pager':
    case 'project-list':
      // These are handled by Shell.tsx before reaching the log (M3+)
      return <EchoLine text={`[${result.type} — not yet rendered]`} />;
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

- [ ] **Step 2: Run tests (no change expected)**

```bash
pnpm test
```

- [ ] **Step 3: Commit**

```bash
git add src/terminal/components/Log.tsx
git commit -m "feat: add Log component with aria-live result rendering"
```

---

## Task 13: Shell.tsx

**Files:**
- Create: `src/terminal/Shell.tsx`

- [ ] **Step 1: Create Shell.tsx**

```tsx
// src/terminal/Shell.tsx
import { useEffect, useReducer, useRef, useCallback } from 'react';
import { Store } from './core/content.js';
import { loadFixture } from './data/load.js';
import { commands } from './commands/index.js';
import Log, { type LogEntry } from './components/Log.js';
import InputLine from './components/InputLine.js';
import { useHistory } from './hooks/useHistory.js';
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
  log:       LogEntry[];
  shell:     ShellState;
  input:     string;
  loading:   boolean;
  store:     Store;
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
                  type: 'error' as const,
                  text: 'failed to load content — try whoami, date, help',
                  exitCode: 1 as const,
                },
              },
            ]
          : state.log,
      };

    case 'EXEC': {
      if (action.result.type === 'clear') {
        return { ...state, input: '' };
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

  // Boot and load fixture
  useEffect(() => {
    dispatch({ type: 'BOOT' });

    loadFixture().then(result => {
      dispatch({
        type:  'STORE_READY',
        store: new Store(result.ok ? result.data : null),
      });

      // Deep-link: execute ?cmd= on mount
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

  // Auto-scroll to bottom after new entries
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [state.loading]);

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
    dispatch({ type: 'EXEC', input: trimmed, result });

    // Focus input after command
    setTimeout(() => inputRef.current?.focus(), 0);
  // We intentionally capture state.store and state.shell from closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.store, state.shell, hist]);

  const { shell } = state;
  const statusText = `shell: unix · theme: ${shell.theme} · lang: ${shell.lang} · found: ${shell.found}/11`;

  return (
    <div
      role="application"
      aria-label="evandro.dev terminal"
      className="terminal"
      data-theme={shell.theme}
    >
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
          state.log.length;  // force read before dispatch
          dispatch({ type: 'EXEC', input: 'clear', result: { type: 'clear' } });
        }}
        disabled={state.loading}
      />

      <div
        role="status"
        aria-live="polite"
        aria-label="shell status"
        className="terminal__status"
      >
        {statusText}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests (no change expected)**

```bash
pnpm test
```

Expected: all prior tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/terminal/Shell.tsx
git commit -m "feat: add Shell.tsx with ARIA structure, reducer, boot sequence, deep-link"
```

---

## Task 14: Simple commands

**Files:**
- Create: `src/terminal/commands/help.ts`
- Create: `src/terminal/commands/whoami.ts`
- Create: `src/terminal/commands/pwd.ts`
- Create: `src/terminal/commands/date.ts`
- Create: `src/terminal/commands/echo.ts`
- Create: `src/terminal/commands/clear.ts`
- Create: `src/terminal/commands/uptime.ts`
- Create: `src/terminal/commands/lang.ts`
- Create: `src/terminal/commands/history.ts`
- Create: `tests/unit/commands/help.test.ts`
- Create: `tests/unit/commands/lang.test.ts`

- [ ] **Step 1: Write failing command tests**

```ts
// tests/unit/commands/help.test.ts
import { assert } from 'poku';
import help from '../../../src/terminal/commands/help.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: () => {},
};

const result = help.run([], ctx);
assert.ok(
  result instanceof Promise || (typeof result === 'object' && 'type' in result),
  'help returns a Result'
);
const resolved = result instanceof Promise ? await result : result;
assert.strictEqual(resolved.type, 'echo', 'help returns echo result');
if (resolved.type === 'echo') {
  assert.ok(resolved.text.includes('help'), 'help output mentions help command');
  assert.ok(resolved.text.includes('ls'), 'help output mentions ls command');
}

console.log('commands/help: all tests passed');
```

```ts
// tests/unit/commands/lang.test.ts
import { assert } from 'poku';
import lang from '../../../src/terminal/commands/lang.js';
import type { Context, ShellState } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

let capturedState: Partial<ShellState> = {};

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: (update) => { capturedState = update; },
};

// No args — show current
const showResult = lang.run([], ctx);
const resolved = showResult instanceof Promise ? await showResult : showResult;
assert.strictEqual(resolved.type, 'echo', 'lang with no args returns echo');
if (resolved.type === 'echo') {
  assert.ok(resolved.text.includes('en'), 'shows current language');
}

// Switch to pt
capturedState = {};
const ptResult = lang.run(['pt'], ctx);
const ptResolved = ptResult instanceof Promise ? await ptResult : ptResult;
assert.strictEqual(ptResolved.type, 'echo', 'lang pt returns echo');
assert.deepStrictEqual(capturedState, { lang: 'pt' }, 'setState called with lang: pt');

// Invalid lang
const badResult = lang.run(['fr'], ctx);
const badResolved = badResult instanceof Promise ? await badResult : badResult;
assert.strictEqual(badResolved.type, 'error', 'invalid lang returns error');

console.log('commands/lang: all tests passed');
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test
```

Expected: modules not found errors.

- [ ] **Step 3: Create help.ts**

```ts
// src/terminal/commands/help.ts
import { defineCommand } from '../core/types.js';

// Updated in commands/index.ts once all commands are registered
const HELP_TEXT = [
  'available commands:',
  '',
  '  help          show this help',
  '  whoami        who is evan',
  '  ls            list directory contents',
  '  cd <dir>      change directory (blog, projects, talks, uses, ~)',
  '  cat <slug>    read a post or page',
  '  pwd           print working directory',
  '  tree          show full site structure',
  '  find          unix-style search (M3)',
  '  grep          search content (M3)',
  '  clear         clear terminal',
  '  history       show command history',
  '  echo <text>   repeat text',
  '  date          current time',
  '  uptime        site uptime since 2014',
  '  lang [en|pt]  show or switch language',
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

- [ ] **Step 4: Create whoami.ts**

```ts
// src/terminal/commands/whoami.ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'whoami',
  describe: 'who is this',
  run() {
    return { type: 'echo', text: 'evandro' };
  },
});
```

- [ ] **Step 5: Create pwd.ts**

```ts
// src/terminal/commands/pwd.ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'pwd',
  describe: 'print working directory',
  run(_args, ctx) {
    const { cwd } = ctx.state;
    return { type: 'echo', text: cwd === '~' ? '/home/evandro' : `/home/evandro/${cwd}` };
  },
});
```

- [ ] **Step 6: Create date.ts**

```ts
// src/terminal/commands/date.ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'date',
  describe: 'current date and time',
  run() {
    return { type: 'echo', text: new Date().toString() };
  },
});
```

- [ ] **Step 7: Create echo.ts**

```ts
// src/terminal/commands/echo.ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'echo',
  describe: 'repeat text',
  run(args) {
    return { type: 'echo', text: args.join(' ') };
  },
});
```

- [ ] **Step 8: Create clear.ts**

```ts
// src/terminal/commands/clear.ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'clear',
  describe: 'clear terminal',
  run() {
    return { type: 'clear' };
  },
});
```

- [ ] **Step 9: Create uptime.ts**

```ts
// src/terminal/commands/uptime.ts
import { defineCommand } from '../core/types.js';

const LAUNCH_YEAR = 2014;

export default defineCommand({
  name:     'uptime',
  describe: 'site uptime since 2014',
  run() {
    const years = new Date().getFullYear() - LAUNCH_YEAR;
    return {
      type: 'echo',
      text: `up ${years} year${years === 1 ? '' : 's'} — online since ${LAUNCH_YEAR}`,
    };
  },
});
```

- [ ] **Step 10: Create lang.ts**

```ts
// src/terminal/commands/lang.ts
import { defineCommand } from '../core/types.js';

const VALID_LANGS = ['en', 'pt'] as const;

export default defineCommand({
  name:     'lang',
  describe: 'show or switch language (en, pt)',
  run(args, ctx) {
    if (args.length === 0) {
      const { lang } = ctx.state;
      return {
        type: 'echo',
        text: `current: ${lang} | available: ${VALID_LANGS.join(', ')}`,
      };
    }

    const target = args[0];
    if (!VALID_LANGS.includes(target as 'en' | 'pt')) {
      return {
        type:     'error',
        text:     `lang: '${target}' is not a supported language`,
        hint:     `available: ${VALID_LANGS.join(', ')}`,
        exitCode: 1,
      };
    }

    ctx.setState({ lang: target as 'en' | 'pt' });

    try {
      const stored = JSON.parse(localStorage.getItem('evandro.state.v1') ?? '{}') as Record<string, unknown>;
      localStorage.setItem('evandro.state.v1', JSON.stringify({ ...stored, lang: target }));
    } catch { /* private mode */ }

    return {
      type: 'echo',
      text: `language set to ${target} — content queries now return ${target === 'pt' ? 'Portuguese' : 'English'} posts`,
    };
  },
});
```

- [ ] **Step 11: Create history.ts**

```ts
// src/terminal/commands/history.ts
import { defineCommand } from '../core/types.js';

const STORAGE_KEY = 'evandro.history.v1';

export default defineCommand({
  name:     'history',
  describe: 'show command history',
  run() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const entries: string[] = raw ? JSON.parse(raw) : [];
      if (entries.length === 0) {
        return { type: 'echo', text: 'no history yet' };
      }
      const lines = entries
        .map((e, i) => `  ${String(i + 1).padStart(3)}  ${e}`)
        .join('\n');
      return { type: 'echo', text: lines };
    } catch {
      return { type: 'echo', text: 'no history yet' };
    }
  },
});
```

- [ ] **Step 12: Run tests — expect PASS**

```bash
pnpm test
```

Expected: `commands/help: all tests passed`, `commands/lang: all tests passed`

- [ ] **Step 13: Commit**

```bash
git add src/terminal/commands/ tests/unit/commands/
git commit -m "feat: add simple commands — help, whoami, pwd, date, echo, clear, uptime, lang, history"
```

---

## Task 15: Navigation commands

**Files:**
- Create: `src/terminal/commands/cd.ts`
- Create: `src/terminal/commands/ls.ts`
- Create: `src/terminal/commands/tree.ts`
- Create: `tests/unit/commands/cd.test.ts`
- Create: `tests/unit/commands/ls.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/commands/cd.test.ts
import { assert } from 'poku';
import cd from '../../../src/terminal/commands/cd.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

let cwd = '~';
const ctx: Context = {
  store:    new Store(null),
  state:    { cwd, lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: (update) => { if (update.cwd) cwd = update.cwd; },
};

// cd blog
const r1 = cd.run(['blog'], ctx);
const res1 = r1 instanceof Promise ? await r1 : r1;
assert.strictEqual(res1.type, 'echo', 'cd blog returns echo');
assert.strictEqual(cwd, 'blog', 'setState called with cwd: blog');

// cd ~ (go home)
ctx.state = { ...ctx.state, cwd: 'blog' };
const r2 = cd.run(['~'], ctx);
const res2 = r2 instanceof Promise ? await r2 : r2;
assert.strictEqual(res2.type, 'echo', 'cd ~ returns echo');
assert.strictEqual(cwd, '~', 'setState called with cwd: ~');

// cd .. from blog
ctx.state = { ...ctx.state, cwd: 'blog' };
cwd = 'blog';
const r3 = cd.run(['..'], ctx);
const res3 = r3 instanceof Promise ? await r3 : r3;
assert.strictEqual(cwd, '~', 'cd .. from blog goes to ~');

// cd invalid
ctx.state = { ...ctx.state, cwd: '~' };
const r4 = cd.run(['nonexistent'], ctx);
const res4 = r4 instanceof Promise ? await r4 : r4;
assert.strictEqual(res4.type, 'error', 'cd nonexistent returns error');
if (res4.type === 'error') {
  assert.strictEqual(res4.code, 'ENOENT', 'error code is ENOENT');
}

console.log('commands/cd: all tests passed');
```

```ts
// tests/unit/commands/ls.test.ts
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
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test
```

- [ ] **Step 3: Create cd.ts**

```ts
// src/terminal/commands/cd.ts
import { defineCommand } from '../core/types.js';

const DIRS = ['blog', 'projects', 'talks', 'uses', '~', '..'] as const;
const VALID_CWD = ['blog', 'projects', 'talks', 'uses'] as const;

export default defineCommand({
  name:     'cd',
  describe: 'change directory (blog, projects, talks, uses, ~)',
  run(args, ctx) {
    const target = args[0];

    if (!target || target === '~' || target === '/') {
      ctx.setState({ cwd: '~' });
      return { type: 'echo', text: '/home/evandro' };
    }

    if (target === '..') {
      ctx.setState({ cwd: '~' });
      return { type: 'echo', text: '/home/evandro' };
    }

    if (VALID_CWD.includes(target as typeof VALID_CWD[number])) {
      ctx.setState({ cwd: target });
      return { type: 'echo', text: `/home/evandro/${target}` };
    }

    return {
      type:     'error',
      text:     `cd: ${target}: No such file or directory`,
      code:     'ENOENT',
      hint:     `available: ${VALID_CWD.join(', ')}`,
      exitCode: 1,
    };
  },
  complete(partial) {
    return VALID_CWD.filter(d => d.startsWith(partial));
  },
});
```

- [ ] **Step 4: Create ls.ts**

```ts
// src/terminal/commands/ls.ts
import { defineCommand } from '../core/types.js';

const ROOT_LISTING = [
  'blog/',
  'projects/',
  'talks/',
  'uses',
  'about',
  'now',
  'resume',
].join('  ');

export default defineCommand({
  name:     'ls',
  describe: 'list directory contents',
  run(args, ctx) {
    const { cwd, lang } = ctx.state;
    const target = args[0] ?? cwd;

    if (target === '~' || (target === cwd && cwd === '~')) {
      return { type: 'echo', text: ROOT_LISTING };
    }

    if (target === 'blog' || (target === cwd && cwd === 'blog')) {
      const posts = ctx.store.posts(lang);
      return { type: 'post-list', items: posts };
    }

    if (target === 'projects' || (target === cwd && cwd === 'projects')) {
      const projects = ctx.store.projects();
      if (projects.length === 0) {
        return { type: 'echo', text: '(empty)' };
      }
      return { type: 'project-list', items: projects };
    }

    if (target === 'talks' || (target === cwd && cwd === 'talks')) {
      const talks = ctx.store.talks();
      if (talks.length === 0) {
        return { type: 'echo', text: '(empty)' };
      }
      return {
        type:    'table',
        columns: [
          { key: 'date',  label: 'date',  align: 'left' },
          { key: 'title', label: 'title', align: 'left' },
          { key: 'venue', label: 'venue', align: 'left' },
        ],
        rows: talks.map(t => [t.date, t.title, t.venue]),
      };
    }

    return {
      type:     'error',
      text:     `ls: ${target}: No such file or directory`,
      code:     'ENOENT',
      exitCode: 1,
    };
  },
});
```

- [ ] **Step 5: Create tree.ts**

```ts
// src/terminal/commands/tree.ts
import { defineCommand } from '../core/types.js';

const TREE = [
  '/home/evandro',
  '├── blog/',
  '│   └── [posts]',
  '├── projects/',
  '├── talks/',
  '├── uses',
  '├── about',
  '├── now',
  '└── resume',
].join('\n');

export default defineCommand({
  name:     'tree',
  describe: 'show full site structure',
  run() {
    return { type: 'echo', text: TREE };
  },
});
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
pnpm test
```

Expected: `commands/cd: all tests passed`, `commands/ls: all tests passed`

- [ ] **Step 7: Commit**

```bash
git add src/terminal/commands/cd.ts src/terminal/commands/ls.ts src/terminal/commands/tree.ts tests/unit/commands/
git commit -m "feat: add navigation commands — cd, ls, tree"
```

---

## Task 16: cat command + commands registry

**Files:**
- Create: `src/terminal/commands/cat.ts`
- Create: `src/terminal/commands/index.ts`
- Create: `tests/unit/commands/cat.test.ts`

- [ ] **Step 1: Write failing cat test**

```ts
// tests/unit/commands/cat.test.ts
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
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm test
```

- [ ] **Step 3: Create cat.ts**

```ts
// src/terminal/commands/cat.ts
import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

const PAGER_THRESHOLD = 30;

export default defineCommand({
  name:     'cat',
  describe: 'read a post or page',
  async run(args, ctx) {
    const target = args[0];

    if (!target) {
      return { type: 'error', text: 'cat: missing operand', exitCode: 1 };
    }

    const { store, state } = ctx;

    // blog/<slug> or just <slug> when cwd is blog
    const [dir, ...rest] = target.split('/');
    const isFromBlog = dir === 'blog' || (state.cwd === 'blog' && rest.length === 0);
    const slug = dir === 'blog' ? rest.join('/') : target;

    if (isFromBlog || state.cwd === 'blog') {
      const actualSlug = state.cwd === 'blog' && dir !== 'blog' ? target : slug;
      const post = await store.loadPost(actualSlug);

      if (!post) {
        // Try with lang fallback
        const post2 = store.post('en', actualSlug);
        if (post2 && state.lang === 'pt') {
          const blocks = parseMarkdownBlocks(post2.body);
          const type = blocks.length > PAGER_THRESHOLD ? 'pager' : 'post-view';
          if (type === 'pager') {
            return { type: 'pager', blocks, title: `${post2.title} [en]` };
          }
          return { type: 'post-view', post: post2 };
        }
        return {
          type: 'error', text: `cat: ${actualSlug}: No such file or directory`,
          code: 'ENOENT', exitCode: 1,
        };
      }

      const blocks = parseMarkdownBlocks(post.body);
      if (blocks.length > PAGER_THRESHOLD) {
        return { type: 'pager', blocks, title: post.title };
      }
      return { type: 'post-view', post };
    }

    // Special pages
    if (target === 'uses') {
      const { body } = store.uses();
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Uses' };
    }
    if (target === 'about') {
      const { body } = store.about(state.lang);
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'About' };
    }
    if (target === 'now') {
      const { body } = store.now();
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Now' };
    }
    if (target === 'resume') {
      const { body } = store.resume();
      return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Resume' };
    }

    return {
      type: 'error', text: `cat: ${target}: No such file or directory`,
      code: 'ENOENT', exitCode: 1,
    };
  },
  complete(partial, ctx) {
    const { cwd, lang } = ctx.state;
    if (cwd === 'blog' || partial.startsWith('blog/')) {
      const prefix = partial.startsWith('blog/') ? 'blog/' : '';
      const slug   = partial.replace(/^blog\//, '');
      return ctx.store.posts(lang)
        .filter(p => p.slug.startsWith(slug))
        .map(p => `${prefix}${p.slug}`);
    }
    return [];
  },
});
```

- [ ] **Step 4: Create commands/index.ts**

```ts
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

const cmdList: Command[] = [
  help, whoami, pwd, date, echo, clear, uptime, lang, history, cd, ls, tree, cat,
];

export const commands: Map<string, Command> = new Map(
  cmdList.map(cmd => [cmd.name, cmd])
);
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test
```

Expected: `commands/cat: all tests passed` plus all prior tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/terminal/commands/cat.ts src/terminal/commands/index.ts tests/unit/commands/cat.test.ts
git commit -m "feat: add cat command and command registry"
```

---

## Task 17: Update index.astro + preload hint

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Read current index.astro**

The current file is the M1 placeholder. Replace its entire content with:

```astro
---
// src/pages/index.astro
// Terminal island — React loads client-side, noscript provides SEO fallback
import Shell from '../terminal/Shell';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>evandro.dev</title>
    <meta name="description" content="Senior Front-End / Full-Stack Engineer. Brooklyn, NYC." />
    <link rel="preload" as="fetch" href="/terminal.manifest.json" crossorigin="anonymous" />
  </head>
  <body style="margin:0;background:#0d1117;">
    <noscript>
      <main style="font-family:sans-serif;padding:2rem;color:#ccc;">
        <h1>Evandro Santos — Senior Front-End / Full-Stack Engineer</h1>
        <p>Based in Brooklyn. React, TypeScript, Node.js. 10+ years.</p>
        <p>
          <a href="/en/blog" style="color:#39ff14;">Blog</a> ·
          <a href="/en/projects" style="color:#39ff14;">Projects</a> ·
          <a href="/en/about" style="color:#39ff14;">About</a>
        </p>
      </main>
    </noscript>
    <Shell client:load />
  </body>
</html>
```

- [ ] **Step 2: Run build to verify Shell mounts**

```bash
pnpm build 2>&1 | tail -15
```

Expected: build completes without errors. `dist/index.html` exists.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: mount Shell island at / with client:load and preload hint"
```

---

## Task 18: Anti-FOUC script + CSP hash

**Files:**
- Create: `scripts/emit-csp-hash.ts`
- Modify: `public/_headers`
- Modify: `package.json` (add to prebuild/predev chains)

The anti-FOUC script is byte-stable — its exact content must never change without updating the hash. The script reads `localStorage` and sets `data-theme` before first paint.

- [ ] **Step 1: Create scripts/emit-csp-hash.ts**

```ts
// scripts/emit-csp-hash.ts
// Computes SHA-256 of the anti-FOUC inline script and rewrites public/_headers.
// Must be run after build-fixture.ts (already in predev/prebuild chains).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// BYTE-STABLE — do NOT reformat or modify this string without re-running this script
const FOUC_SCRIPT =
  `(function(){try{var s=JSON.parse(localStorage.getItem('evandro.state.v1')||'{}');` +
  `if(s.theme)document.documentElement.dataset.theme=s.theme;}catch(e){}})();`;

const hash   = createHash('sha256').update(FOUC_SCRIPT).digest('base64');
const sha256 = `'sha256-${hash}'`;

const headersPath = join(ROOT, 'public/_headers');
const current     = readFileSync(headersPath, 'utf-8');

// Replace the script-src directive — works whether the hash is present or not
const updated = current.replace(
  /script-src [^;]+;/,
  `script-src 'self' ${sha256};`,
);

writeFileSync(headersPath, updated);
console.log(`[csp] script-src hash → ${sha256}`);

// Also emit the script constant so index.astro can inline it
const scriptPath = join(ROOT, 'src/terminal/_fouc.ts');
writeFileSync(
  scriptPath,
  `// AUTO-GENERATED by scripts/emit-csp-hash.ts — do not edit\n` +
  `export const FOUC_SCRIPT = ${JSON.stringify(FOUC_SCRIPT)};\n`,
);
console.log('[csp] wrote src/terminal/_fouc.ts');
```

- [ ] **Step 2: Update package.json scripts**

Change `predev` and `prebuild` to run both scripts sequentially:

```json
"predev":   "tsx scripts/build-fixture.ts && tsx scripts/emit-csp-hash.ts",
"prebuild": "tsx scripts/build-fixture.ts && tsx scripts/emit-csp-hash.ts",
```

- [ ] **Step 3: Update index.astro to include the anti-FOUC script**

Modify `src/pages/index.astro` — in the `<head>`, add the inline script import after the preload hint:

```astro
---
import Shell from '../terminal/Shell';
import { FOUC_SCRIPT } from '../terminal/_fouc';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>evandro.dev</title>
    <meta name="description" content="Senior Front-End / Full-Stack Engineer. Brooklyn, NYC." />
    <link rel="preload" as="fetch" href="/terminal.manifest.json" crossorigin="anonymous" />
    <script set:html={FOUC_SCRIPT} />
  </head>
  <body style="margin:0;background:#0d1117;">
    <noscript>
      <main style="font-family:sans-serif;padding:2rem;color:#ccc;">
        <h1>Evandro Santos — Senior Front-End / Full-Stack Engineer</h1>
        <p>Based in Brooklyn. React, TypeScript, Node.js. 10+ years.</p>
        <p>
          <a href="/en/blog" style="color:#39ff14;">Blog</a> ·
          <a href="/en/projects" style="color:#39ff14;">Projects</a> ·
          <a href="/en/about" style="color:#39ff14;">About</a>
        </p>
      </main>
    </noscript>
    <Shell client:load />
  </body>
</html>
```

- [ ] **Step 4: Run the full predev chain**

```bash
tsx scripts/build-fixture.ts && tsx scripts/emit-csp-hash.ts
```

Expected output:
```
[fixture] → public/terminal.xxxxxxxx.json (3 posts)
[csp] script-src hash → 'sha256-xxxxxxxxxxxxxxxxxxxx'
[csp] wrote src/terminal/_fouc.ts
```

- [ ] **Step 5: Verify _headers was updated**

```bash
grep "sha256" public/_headers
```

Expected: line with `script-src 'self' 'sha256-...';`

- [ ] **Step 6: Run build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: build completes without errors.

- [ ] **Step 7: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add scripts/emit-csp-hash.ts public/_headers src/terminal/_fouc.ts src/pages/index.astro package.json
git commit -m "feat: add anti-FOUC inline script with CSP SHA-256 hash emitted at build time"
```

---

## Task 19: Full integration + build verification

- [ ] **Step 1: Run full predev chain + build**

```bash
tsx scripts/build-fixture.ts && tsx scripts/emit-csp-hash.ts && pnpm build
```

Expected: build completes with no errors.

- [ ] **Step 2: Verify all M2 exit criteria in dist**

```bash
# Terminal placeholder is gone — real Shell mounts
grep "evandro.dev terminal" dist/index.html && echo "aria label: FOUND"

# Preload hint present
grep "terminal.manifest.json" dist/index.html && echo "preload: FOUND"

# Anti-FOUC script present
grep "evandro.state.v1" dist/index.html && echo "fouc script: FOUND"

# CSP hash in _headers
grep "sha256-" public/_headers && echo "csp hash: FOUND"
```

Expected: all four lines print their confirmation message.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: `PASS › 10+ | FAIL › 0` (all unit + command tests)

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: exits 0 (no TypeScript errors).

Note: if `astro:content` virtual module errors appear, run `pnpm dev` once first to generate `.astro/` types, then re-run typecheck.

- [ ] **Step 5: Smoke-test in dev**

```bash
pnpm dev
```

Open http://localhost:4321/ in a browser. Verify:
- Terminal loads with green-on-black matrix theme
- Boot sequence (ASCII banner + `type 'help' to get started`) appears
- Typing `help` and pressing Enter shows the command list
- Typing `ls` shows directory listing
- Typing `cd blog` followed by `ls` shows the 3 blog posts
- Typing `cat debouncing` shows the post
- Typing `lang pt` changes status bar to `lang: pt`
- `/?cmd=whoami` in URL bar executes the command on load

Stop dev server when done.

- [ ] **Step 6: Final commit**

```bash
git add -A
git status
# Review — confirm nothing unexpected staged
git commit -m "feat: milestone 2 complete — terminal skeleton with commands, fixture pipeline, anti-FOUC"
```

---

## Self-Review

### Spec coverage

| M2 requirement | Task |
|---|---|
| Shell.tsx with input, log, status bar, ARIA structure | Task 13 |
| ARIA: role="application", role="log" aria-live="polite", role="status" | Task 13 |
| Keyboard trap escape: Shift+Tab out, Esc to blur | Task 11 (Shift+Tab is browser-native; Esc clear handled) |
| TUI boot sequence: ASCII banner + prompt + hint | Task 13 |
| scripts/build-fixture.ts with schemaVersion: 1 and content-hashed output | Task 5 |
| terminal.manifest.json pointing to current hash | Task 5 |
| Dev endpoint src/pages/terminal.json.ts for live HMR | Task 6 |
| ContentStore class with async loadPost(slug) | Task 4 |
| Full Result type union | Task 2 |
| data/load.ts: LoadResult, degraded mode, schema version check | Task 7 |
| Anti-FOUC inline script + SHA-256 hash emitted to _headers | Task 18 |
| Core commands: help, whoami, ls, cat, cd, pwd, tree, clear, history, echo, date, uptime, lang | Tasks 14-16 |
| /?cmd= deep-link execution on mount | Task 13 (Shell.tsx) |
| History persistence in localStorage | Task 9 |
| Matrix theme only | Task 8 |
| Mobile: dvh layout, visualViewport iOS fix, 44px touch targets, font-size 16px | Task 8 (CSS) + Task 13 (useEffect) |
| Keyboard shortcuts: Ctrl+C, Ctrl+L, Ctrl+A, Ctrl+E, Ctrl+K, Ctrl+U, Ctrl+W | Task 11 |

**Gap noted:** `neofetch` command is referenced in the spec Day-one command set but listed as M2 (section 9). Its component (`Neofetch.tsx`) is in the directory structure but not implemented here. `neofetch` is personality and depends on the theme counter being implemented (M4). Adding it as `{ type: 'echo', text: '...' }` stub in M2 is sufficient — full implementation in M6. Not added here since it's not in the M2 exit criteria.

**Gap noted:** `Shift+Tab` keyboard trap escape — this is browser-native behavior when `tabindex` is not overridden. No extra code needed; the input does not trap Tab.

### Placeholder scan

No TBD, TODO, or "similar to Task N" patterns. Every task has complete code.

### Type consistency

- `FixturePost`, `FixtureProject`, `FixtureTalk`, `FixtureNow`, `FixturePage` defined in Task 2 (`types.ts`) — used consistently in Tasks 4, 5, 7, 10, 15, 16
- `Store` implements `ContentStore` interface — confirmed in Task 4
- `parseMarkdownBlocks(body: string): MarkdownBlock[]` — defined Task 3, used Task 16 (`cat.ts`)
- `SCHEMA_VERSION = 1` — exported from `data/load.ts` (Task 7), matches `schemaVersion: 1` in `ContentFixture` type
- `LogEntry` interface defined in `Log.tsx` (Task 12), used in `Shell.tsx` (Task 13)
- `buildHistory` pure function exported from `useHistory.ts` (Task 9) for testability — hook wraps it
- Command `run(args, ctx)` signature used consistently in Tasks 14, 15, 16
- `defineCommand` helper defined in `types.ts` (Task 2), used in all command files
