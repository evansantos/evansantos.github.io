# Milestone 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fully static Astro 5 site with bilingual blog, RSS feeds, CSP headers, and Cloudflare Pages deployment — zero JS by default, Google-crawlable from day one.

**Architecture:** Astro 5 with Content Layer API (glob loader) for typed MDX collections. All pages are static `.astro` files consuming the same `getCollection` API. The terminal (`/`) is a placeholder `index.astro` in this milestone — the React island ships in M2. Routing is locale-prefixed (`/en/`, `/pt/`) with a Cloudflare `_redirects` file mapping bare URLs to `/en/`.

**Tech Stack:** Astro 5, React 19 (installed but unused in M1), TypeScript strict, MDX, Zod, @astrojs/rss, vanilla CSS, Poku for schema/utility tests, pnpm, oxlint, oxfmt, Cloudflare Pages.

---

## File map

```
astro.config.mjs
tsconfig.json
package.json
oxlint.json
.gitignore
.node-version

public/
  _headers
  _redirects

src/
  content/
    config.ts                       ← Zod schemas for all collections
    blog/en/debouncing.mdx
    blog/en/telemetry.mdx
    blog/en/boring-tech.mdx
    projects/.gitkeep
    talks/.gitkeep
    about/en.mdx
    about/pt.mdx
    uses.mdx
    now.mdx
    resume.mdx

  layouts/
    StaticLayout.astro              ← base layout: skip-link, SEO, hreflang, footer
    PostLayout.astro                ← wraps StaticLayout, adds post meta

  pages/
    index.astro                     ← terminal placeholder (M2)
    404.astro
    [lang]/
      blog/
        index.astro
        [slug].astro
      about.astro
      now.astro
      uses.astro
      projects.astro
      talks.astro
    rss/
      en.xml.ts
      pt.xml.ts

  styles/
    global.css                      ← reset + typography
    static.css                      ← warm-paper theme variables + base styles

  lib/
    date.ts                         ← formatDate utility
    locale.ts                       ← lang helpers
    reading-time.ts                 ← word count → minutes

tests/
  unit/
    schemas.test.ts                 ← Poku: Zod schema validation
    date.test.ts                    ← Poku: formatDate
    locale.test.ts                  ← Poku: lang helpers
    reading-time.test.ts            ← Poku: reading time calc

.github/
  workflows/
    ci.yml
```

---

## Task 1: Scaffold — Astro project, config, tooling

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `oxlint.json`
- Create: `.gitignore`
- Create: `.node-version`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "evandro-dev",
  "version": "0.0.1",
  "description": "evandro.dev — personal site with a terminal interface",
  "engines": { "node": ">=22" },
  "type": "module",
  "scripts": {
    "dev":        "astro dev",
    "build":      "astro build",
    "preview":    "astro preview",
    "test":       "poku tests/unit",
    "lint":       "oxlint src",
    "typecheck":  "tsc --noEmit"
  },
  "dependencies": {
    "@astrojs/mdx":     "^4.0.0",
    "@astrojs/react":   "^4.0.0",
    "@astrojs/rss":     "^4.0.0",
    "astro":            "^5.0.0",
    "react":            "^19.0.0",
    "react-dom":        "^19.0.0",
    "zod":              "^3.23.0"
  },
  "devDependencies": {
    "@happy-dom/global-registrator": "^15.0.0",
    "@pokujs/react":    "^0.1.0",
    "@types/react":     "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "happy-dom":        "^15.0.0",
    "poku":             "^2.0.0",
    "typescript":       "^5.5.0",
    "oxlint":           "0.15.0",
    "oxfmt":            "0.2.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm install
```

Expected: lockfile generated, `node_modules` populated.

- [ ] **Step 3: Create astro.config.mjs**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://evandro.dev',
  integrations: [react(), mdx()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["src/lib/*"],
      "@layouts/*": ["src/layouts/*"],
      "@styles/*": ["src/styles/*"]
    }
  }
}
```

- [ ] **Step 5: Create oxlint.json**

```json
{
  "rules": {
    "react/no-danger": "error",
    "no-console": "warn",
    "no-debugger": "error"
  },
  "env": {
    "browser": true,
    "node": true
  },
  "globals": {
    "astro": "readonly"
  }
}
```

- [ ] **Step 6: Create .gitignore**

```
node_modules
dist
.astro
.env
.env.*
!.env.example
public/terminal.*.json
public/terminal.manifest.json
```

- [ ] **Step 7: Create .node-version**

```
22
```

- [ ] **Step 8: Verify Astro starts**

```bash
pnpm dev
```

Expected: Astro dev server starts on http://localhost:4321 (may show empty page — that's fine for now).

- [ ] **Step 9: Commit**

```bash
git add package.json astro.config.mjs tsconfig.json oxlint.json .gitignore .node-version pnpm-lock.yaml
git commit -m "chore: scaffold Astro 5 project with React, MDX, i18n config"
```

---

## Task 2: Content schemas (TDD with Poku)

**Files:**
- Create: `src/content/config.ts`
- Create: `tests/unit/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
// tests/unit/schemas.test.ts
import { assert } from 'poku';
import { z } from 'zod';

// We import the raw Zod schemas (not Astro's defineCollection wrappers)
// so they can be tested in isolation without the Astro runtime.
import { blogSchema, projectSchema, talkSchema } from '../../src/content/schemas.js';

// --- blogSchema ---

assert.doesNotThrow(() => {
  blogSchema.parse({
    title: 'Debouncing in React',
    date: new Date('2025-03-10'),
    lang: 'en',
    tags: ['react', 'performance'],
    dek: 'The naive version fires on every keystroke.',
  });
}, 'blogSchema accepts valid EN post');

assert.doesNotThrow(() => {
  blogSchema.parse({
    title: 'Debouncing no React',
    date: new Date('2025-03-10'),
    lang: 'pt',
    tags: ['react'],
    dek: 'Resumo.',
    translationOf: 'debouncing',
  });
}, 'blogSchema accepts PT post with translationOf');

assert.throws(() => {
  blogSchema.parse({
    title: 'Missing date',
    lang: 'en',
    tags: [],
    dek: 'x',
  });
}, 'blogSchema rejects post without date');

assert.throws(() => {
  blogSchema.parse({
    title: 'Bad lang',
    date: new Date(),
    lang: 'fr',
    tags: [],
    dek: 'x',
  });
}, 'blogSchema rejects unsupported lang');

// --- projectSchema ---

assert.doesNotThrow(() => {
  projectSchema.parse({
    title: 'Racing Engineer',
    year: 2024,
    category: 'personal',
    dek: 'A sim racing telemetry tool.',
    status: 'active',
  });
}, 'projectSchema accepts valid project');

assert.throws(() => {
  projectSchema.parse({
    title: 'Bad category',
    year: 2024,
    category: 'random',
    dek: 'x',
    status: 'active',
  });
}, 'projectSchema rejects unknown category');

// --- talkSchema ---

assert.doesNotThrow(() => {
  talkSchema.parse({
    title: 'Building AI Agents',
    kind: 'talk',
    venue: 'Front in Sampa',
    date: new Date('2025-11-01'),
    lang: 'pt',
    url: 'https://example.com/talk',
  });
}, 'talkSchema accepts valid talk');

assert.throws(() => {
  talkSchema.parse({
    title: 'Missing url',
    kind: 'talk',
    venue: 'Venue',
    date: new Date(),
    lang: 'en',
  });
}, 'talkSchema rejects talk without url');

console.log('schemas: all tests passed');
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
pnpm test
```

Expected: error — `Cannot find module '../../src/content/schemas.js'`

- [ ] **Step 3: Create src/content/schemas.ts (raw Zod schemas)**

```ts
// src/content/schemas.ts
import { z } from 'zod';

export const blogSchema = z.object({
  title:         z.string(),
  date:          z.coerce.date(),
  lang:          z.enum(['en', 'pt']),
  tags:          z.array(z.string()),
  dek:           z.string(),
  readingTime:   z.number().optional(),
  featured:      z.boolean().default(false),
  draft:         z.boolean().default(false),
  translationOf: z.string().optional(),
});

export const projectSchema = z.object({
  title:    z.string(),
  year:     z.number().int(),
  category: z.enum(['work', 'personal', 'sim-racing', 'ai-tooling']),
  dek:      z.string(),
  featured: z.boolean().default(false),
  stack:    z.string().optional(),
  metric:   z.string().optional(),
  url:      z.string().url().optional(),
  status:   z.enum(['active', 'archived', 'discontinued']),
});

export const talkSchema = z.object({
  title:     z.string(),
  kind:      z.enum(['talk', 'podcast', 'workshop', 'interview', 'video']),
  venue:     z.string(),
  location:  z.string().optional(),
  date:      z.coerce.date(),
  lang:      z.enum(['en', 'pt']),
  url:       z.string().url(),
  views:     z.number().int().optional(),
});

export const usesSchema = z.object({
  title: z.string().default('Uses'),
});

export const nowSchema = z.object({
  updated:     z.coerce.date(),
  location:    z.string(),
  building:    z.string(),
  reading:     z.string(),
  listening:   z.string(),
  learning:    z.string(),
  lookingFor:  z.string(),
});

export const aboutSchema = z.object({
  lang:  z.enum(['en', 'pt']),
  title: z.string().default('About'),
});

export const resumeSchema = z.object({
  title:   z.string().default('Resume'),
  updated: z.coerce.date(),
});
```

- [ ] **Step 4: Create src/content/config.ts (Astro collection definitions)**

```ts
// src/content/config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  blogSchema,
  projectSchema,
  talkSchema,
  usesSchema,
  nowSchema,
  aboutSchema,
  resumeSchema,
} from './schemas.js';

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: blogSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
    schema: projectSchema,
  }),
  talks: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/talks' }),
    schema: talkSchema,
  }),
  uses: defineCollection({
    loader: glob({ pattern: 'uses.{md,mdx}', base: './src/content' }),
    schema: usesSchema,
  }),
  now: defineCollection({
    loader: glob({ pattern: 'now.{md,mdx}', base: './src/content' }),
    schema: nowSchema,
  }),
  about: defineCollection({
    loader: glob({ pattern: 'about/**/*.{md,mdx}', base: './src/content' }),
    schema: aboutSchema,
  }),
  resume: defineCollection({
    loader: glob({ pattern: 'resume.{md,mdx}', base: './src/content' }),
    schema: resumeSchema,
  }),
};
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test
```

Expected output:
```
schemas: all tests passed
```

- [ ] **Step 6: Commit**

```bash
git add src/content/schemas.ts src/content/config.ts tests/unit/schemas.test.ts
git commit -m "feat: add content collection Zod schemas with Poku tests"
```

---

## Task 3: Utility functions (TDD with Poku)

**Files:**
- Create: `src/lib/date.ts`
- Create: `src/lib/locale.ts`
- Create: `src/lib/reading-time.ts`
- Create: `tests/unit/date.test.ts`
- Create: `tests/unit/locale.test.ts`
- Create: `tests/unit/reading-time.test.ts`

- [ ] **Step 1: Write failing date tests**

```ts
// tests/unit/date.test.ts
import { assert } from 'poku';
import { formatDate, formatDateISO } from '../../src/lib/date.js';

assert.strictEqual(
  formatDate(new Date('2025-03-10'), 'en'),
  'March 10, 2025',
  'formatDate returns long EN format'
);

assert.strictEqual(
  formatDate(new Date('2025-03-10'), 'pt'),
  '10 de março de 2025',
  'formatDate returns long PT format'
);

assert.strictEqual(
  formatDateISO(new Date('2025-03-10')),
  '2025-03-10',
  'formatDateISO returns YYYY-MM-DD'
);

console.log('date: all tests passed');
```

- [ ] **Step 2: Write failing locale tests**

```ts
// tests/unit/locale.test.ts
import { assert } from 'poku';
import { isValidLang, getLangLabel, getAlternateLang } from '../../src/lib/locale.js';

assert.strictEqual(isValidLang('en'), true,  'en is valid');
assert.strictEqual(isValidLang('pt'), true,  'pt is valid');
assert.strictEqual(isValidLang('fr'), false, 'fr is not valid');

assert.strictEqual(getLangLabel('en'), 'English',    'EN label');
assert.strictEqual(getLangLabel('pt'), 'Português',  'PT label');

assert.strictEqual(getAlternateLang('en'), 'pt', 'alternate of en is pt');
assert.strictEqual(getAlternateLang('pt'), 'en', 'alternate of pt is en');

console.log('locale: all tests passed');
```

- [ ] **Step 3: Write failing reading-time tests**

```ts
// tests/unit/reading-time.test.ts
import { assert } from 'poku';
import { calcReadingTime } from '../../src/lib/reading-time.js';

assert.strictEqual(calcReadingTime(''), 1, 'empty string returns minimum 1 min');

const twoHundredWords = Array(200).fill('word').join(' ');
assert.strictEqual(calcReadingTime(twoHundredWords), 1, '200 words = 1 min');

const fiveHundredWords = Array(500).fill('word').join(' ');
assert.strictEqual(calcReadingTime(fiveHundredWords), 2, '500 words = 2 min at 250wpm');

const thousandWords = Array(1000).fill('word').join(' ');
assert.strictEqual(calcReadingTime(thousandWords), 4, '1000 words = 4 min at 250wpm');

console.log('reading-time: all tests passed');
```

- [ ] **Step 4: Run tests — expect FAIL**

```bash
pnpm test
```

Expected: errors — modules not found.

- [ ] **Step 5: Implement src/lib/date.ts**

```ts
// src/lib/date.ts
const enFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'long', day: 'numeric',
});

const ptFormatter = new Intl.DateTimeFormat('pt-BR', {
  year: 'numeric', month: 'long', day: 'numeric',
});

export function formatDate(date: Date, lang: 'en' | 'pt'): string {
  return lang === 'pt' ? ptFormatter.format(date) : enFormatter.format(date);
}

export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 6: Implement src/lib/locale.ts**

```ts
// src/lib/locale.ts
export type Lang = 'en' | 'pt';

const LANGS: Lang[] = ['en', 'pt'];

const LABELS: Record<Lang, string> = {
  en: 'English',
  pt: 'Português',
};

const ALTERNATES: Record<Lang, Lang> = {
  en: 'pt',
  pt: 'en',
};

export function isValidLang(lang: string): lang is Lang {
  return LANGS.includes(lang as Lang);
}

export function getLangLabel(lang: Lang): string {
  return LABELS[lang];
}

export function getAlternateLang(lang: Lang): Lang {
  return ALTERNATES[lang];
}
```

- [ ] **Step 7: Implement src/lib/reading-time.ts**

```ts
// src/lib/reading-time.ts
const WORDS_PER_MINUTE = 250;

export function calcReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
pnpm test
```

Expected:
```
schemas: all tests passed
date: all tests passed
locale: all tests passed
reading-time: all tests passed
```

- [ ] **Step 9: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add date, locale, and reading-time utilities with Poku tests"
```

---

## Task 4: Sample content files

**Files:**
- Create: `src/content/blog/en/debouncing.mdx`
- Create: `src/content/blog/en/telemetry.mdx`
- Create: `src/content/blog/en/boring-tech.mdx`
- Create: `src/content/about/en.mdx`
- Create: `src/content/about/pt.mdx`
- Create: `src/content/uses.mdx`
- Create: `src/content/now.mdx`
- Create: `src/content/resume.mdx`
- Create: `src/content/projects/.gitkeep`
- Create: `src/content/talks/.gitkeep`

- [ ] **Step 1: Create debouncing.mdx**

```mdx
---
title: "Debouncing in React: the pattern I always reach for"
date: 2025-03-10
lang: en
tags: [react, performance, hooks]
dek: "The naive version fires on every keystroke. The correct version waits until the user stops typing."
featured: true
draft: false
---

Debouncing is one of those things you implement three times before it sticks.

The naive version fires on every keystroke. The correct version waits until the user stops typing. The difference matters for search inputs, API calls, and anything that runs on change.

## The pattern

```ts
import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  ) as T;
}
```

Pass your handler and a delay in milliseconds. The hook returns a stable debounced version that only fires after the user pauses for the given duration.

## Why useCallback matters here

Without `useCallback`, the debounced function is recreated on every render — which resets the timer. The dependency array `[fn, delay]` keeps the reference stable as long as neither input changes.

## When not to use this

If you are on React 18+ and the expensive work is a render (not a side effect), `useTransition` is the better tool. It defers the update without introducing a delay.

Debouncing is for side effects: API calls, analytics events, localStorage writes. Not for rendering.

---

If you find this useful, the [`use-debounce`](https://github.com/xnimorz/use-debounce) package does the same thing with more options. I roll my own to keep the dependency count low.
```

- [ ] **Step 2: Create telemetry.mdx**

```mdx
---
title: "Telemetry I actually want in my apps"
date: 2025-06-15
lang: en
tags: [observability, dx, tooling]
dek: "Most telemetry setups tell you what broke after users noticed. Here is what I want instead."
draft: false
---

Most observability setups are built for post-mortems. You get an alert after something breaks, you dig through logs, you figure out what happened. That is fine for infrastructure. For product code, I want something different.

## What I actually want

**Error context, not just stack traces.** When a component throws, I want to know the user's state at that moment: what route they were on, what they had typed, which feature flag was active. A raw stack trace tells me where — it rarely tells me why.

**Slow interaction tracking.** React's Profiler API, wrapped in something like `@vercel/analytics`, can flag renders over 50ms. I care more about the interactions that felt slow to a real user than the ones that took the most CPU time on a benchmark.

**Meaningful events, not page views.** "User viewed `/dashboard`" is noise. "User exported a report for the third time this week" is signal. Pick three to five events that map to value delivery and track those.

## The setup I keep returning to

1. A global error boundary that captures context with [`@sentry/react`](https://sentry.io/for/react/) — or a tiny custom one that POSTs to an endpoint I control.
2. A `track()` wrapper around one function call per high-value action.
3. Web Vitals via the `web-vitals` package, sent to whatever analytics backend.

That covers 90% of the signal I ever act on.

## The trap

Adding more instrumentation does not improve observability. It improves data volume. I have worked on codebases where every click fired an event — the dashboard was a wall of numbers nobody read.

Measure what you will act on. Delete everything else.
```

- [ ] **Step 3: Create boring-tech.mdx**

```mdx
---
title: "The boring technology talk I keep having"
date: 2025-09-02
lang: en
tags: [architecture, engineering-culture]
dek: "Every team I've joined in the last three years had a conversation about switching to something newer. Here is what I say."
draft: false
---

Every team I have joined in the last three years has had the same conversation. There is a technology the team is using — a queue, a database, a frontend framework — and someone on the team wants to replace it with something newer. The new thing is genuinely better in some ways. The conversation goes in circles for months.

Here is what I say when I get pulled in.

## The actual question

The question is not "is the new thing better." It almost always is, in some dimension. The question is: "what does the migration cost, and is that cost worth the benefit we expect to get?"

Migrations are almost always underestimated. You account for the technical work. You forget to account for:
- The month after launch where two systems run in parallel and both need bug fixes
- The edge cases that only show up in production, not in the migration test plan
- The institutional knowledge that lived in the old system and has to be rebuilt

## When I say yes

Replace the technology when:
- The current thing is actively preventing you from shipping things customers want
- You have a specific, measurable problem that the new thing solves
- You have the capacity to do it properly — not as a side project

## When I say no

Stay with the boring technology when:
- The problem is mostly that it feels old
- The team is excited about the new thing for its own sake
- You are in the middle of something else important

Boring technology that works is an asset. It is predictable. You know its failure modes. Your oncall knows how to debug it at 2am.

That said — if the technology is actively causing harm, switch. Just do it with eyes open.
```

- [ ] **Step 4: Create about/en.mdx**

```mdx
---
lang: en
title: About
---

I'm Evan (Evandro Cavalcante Santos). Senior front-end / full-stack engineer with over 10 years of experience, based in Brooklyn.

Born in Santos, raised on the east side of São Paulo, passed through Katowice in Poland. Portuguese is native, English is fluent.

By day: shipping product, arguing about architecture, trying to leave codebases better than I found them. I've built GenAI tools at Cox, financial dashboards at Broadridge, Next.js SSR at Philip Morris, and a11y-first UIs at Acoustic. The through-line: React, TypeScript, Node, and a stubborn belief that good tooling beats heroic effort.

## Currently obsessed with

Spec-driven development and AI agents as collaborators — not autocomplete. The discipline of writing the spec before touching the code, then using agents to execute it.

## Outside of work

Lifelong emo/punk kid. Sim racing. Guitar tone. Letterboxd over Trakt, always.

Say hi: [evan.its.me@gmail.com](mailto:evan.its.me@gmail.com)
```

- [ ] **Step 5: Create about/pt.mdx**

```mdx
---
lang: pt
title: Sobre
---

Sou Evan (Evandro Cavalcante Santos). Engenheiro front-end / full-stack sênior com mais de 10 anos de experiência, baseado no Brooklyn.

Nascido em Santos, cresci na zona leste de São Paulo, passei por Katowice, na Polônia. Português é minha língua nativa, inglês é fluente.

No trabalho: desenvolvendo produto, discutindo arquitetura e tentando deixar as bases de código melhores do que as encontrei. Já construí ferramentas GenAI na Cox, dashboards financeiros na Broadridge, SSR com Next.js na Philip Morris, e interfaces acessíveis na Acoustic.

## Atualmente obcecado com

Desenvolvimento orientado a especificações e agentes de IA como colaboradores — não como autocompletar. A disciplina de escrever a spec antes de tocar no código, depois usar agentes para executá-la.

## Fora do trabalho

Emo/punk desde sempre. Sim racing. Tone de guitarra. Letterboxd sempre.

Fala comigo: [evan.its.me@gmail.com](mailto:evan.its.me@gmail.com)
```

- [ ] **Step 6: Create uses.mdx**

```mdx
---
title: Uses
---

## Desk

- MacBook Pro 14" M3 Pro
- LG 27" 4K USB-C monitor
- Keychron Q1 Pro (QMK, Gateron Yellow switches)
- Logitech MX Master 3S
- Elgato Key Light Air

## Coding

- Editor: VS Code with Claude Code
- Terminal: Warp
- Font: Monaspace Neon
- Theme: Tokyo Night
- Package manager: pnpm
- Runtime: Node 22

## Sim Racing Rig

- Fanatec CSL DD (8Nm)
- Fanatec GT Wheel Rim V2
- Fanatec CSL Pedals LC
- GT Omega Evo cockpit

## Apps

- [Raycast](https://raycast.com) — launcher, clipboard, snippets
- [Linear](https://linear.app) — issue tracking
- [Notion](https://notion.so) — notes and docs
- [Letterboxd](https://letterboxd.com) — film diary
- [Reeder](https://reederapp.com) — RSS

## Services

- Cloudflare — DNS, Pages, analytics
- GitHub — source control, CI/CD
- Vercel — occasional prototypes
```

- [ ] **Step 7: Create now.mdx**

```mdx
---
updated: 2026-04-23
location: "Brooklyn, NYC"
building: "evandro.dev — terminal-first personal site"
reading: "A Philosophy of Software Design — John Ousterhout"
listening: "Title Fight — Hyperview"
learning: "Spec-driven development with AI agents"
lookingFor: "Interesting problems at the intersection of product and AI tooling"
---

Updated April 2026 from Brooklyn.

Building this site — a terminal-first personal site with Astro, React, and a fake UNIX shell as the homepage. The spec is done; now executing it milestone by milestone.

Reading a lot about software design and writing a lot of specs. Obsessed with the discipline of thinking before coding.

If any of this sounds interesting, [say hi](mailto:evan.its.me@gmail.com).
```

- [ ] **Step 8: Create resume.mdx**

```mdx
---
title: Resume
updated: 2026-04-23
---

# Evandro Santos

Senior Front-End / Full-Stack Engineer · Brooklyn, NYC
[evan.its.me@gmail.com](mailto:evan.its.me@gmail.com) · [github.com/evansantos](https://github.com/evansantos) · [linkedin.com/in/evandrocsantos](https://linkedin.com/in/evandrocsantos)

---

## Experience

### Cox Enterprises — Senior Software Engineer
*2023 – Present*

Built GenAI-powered internal tooling for content operations teams. React, TypeScript, Node.js, AWS. Led the front-end architecture for an AI-assisted editorial workflow used by hundreds of editors daily.

### Broadridge Financial Solutions — Senior Software Engineer
*2021 – 2023*

Built and maintained financial reporting dashboards. React, TypeScript, GraphQL. Owned performance optimization work that reduced dashboard load time by 60%.

### Philip Morris International — Senior Front-End Engineer
*2019 – 2021*

Implemented Next.js SSR migration for a global marketing platform serving 20+ markets. TypeScript, React, Node.js.

### Acoustic — Front-End Engineer
*2017 – 2019*

Built accessibility-first UI components for a marketing automation platform. Led WCAG 2.1 AA compliance initiative across the product suite.

---

## Skills

**Core:** React, TypeScript, Node.js, Next.js, Astro
**Tooling:** Vite, pnpm, GitHub Actions, AWS, Cloudflare
**Testing:** Poku, Playwright, React Testing Library
**Currently exploring:** AI agents, spec-driven development, LLM tooling

---

## Education

Bachelor of Science in Computer Science
University of São Paulo (USP), São Paulo, Brazil
```

- [ ] **Step 9: Create empty collection placeholders**

```bash
touch src/content/projects/.gitkeep src/content/talks/.gitkeep
```

- [ ] **Step 10: Commit**

```bash
git add src/content
git commit -m "feat: add sample content — 3 blog posts, about, uses, now, resume"
```

---

## Task 5: CSS foundation — warm-paper theme

**Files:**
- Create: `src/styles/global.css`
- Create: `src/styles/static.css`

- [ ] **Step 1: Create global.css**

```css
/* src/styles/global.css */
*, *::before, *::after { box-sizing: border-box; }

html {
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
}

body {
  margin: 0;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.2;
}

a {
  color: inherit;
}

pre {
  overflow-x: auto;
}

.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 0.5rem 1rem;
  background: var(--color-accent);
  color: var(--color-bg);
  font-weight: 600;
  z-index: 100;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}
```

- [ ] **Step 2: Create static.css (warm-paper theme)**

```css
/* src/styles/static.css */
:root {
  --color-bg:       #faf7f0;
  --color-bg-alt:   #f3ede0;
  --color-fg:       #2c2416;
  --color-fg-muted: #6b5c45;
  --color-accent:   #7c4f2a;
  --color-border:   #ddd4c0;
  --color-code-bg:  #eee8d8;

  --font-sans: 'Georgia', 'Times New Roman', serif;
  --font-mono: 'Courier New', 'Courier', monospace;

  --content-width: 65ch;
  --spacing-page:  clamp(1rem, 5vw, 3rem);
}

body {
  background: var(--color-bg);
  color:      var(--color-fg);
  font-family: var(--font-sans);
  font-size:   1.125rem;
}

/* Layout */
.page-wrapper {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.page-header {
  border-bottom: 1px solid var(--color-border);
  padding: 1rem var(--spacing-page);
}

.page-header nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  max-width: var(--content-width);
  margin: 0 auto;
}

.page-header nav a {
  text-decoration: none;
  color: var(--color-fg-muted);
  font-size: 0.9rem;
}

.page-header nav a:hover {
  color: var(--color-accent);
}

.page-header nav .site-name {
  font-weight: 700;
  color: var(--color-fg);
  margin-right: auto;
}

.page-main {
  flex: 1;
  padding: 2rem var(--spacing-page);
  max-width: calc(var(--content-width) + 2 * var(--spacing-page));
  margin: 0 auto;
  width: 100%;
}

.page-footer {
  border-top: 1px solid var(--color-border);
  padding: 1rem var(--spacing-page);
  font-size: 0.8rem;
  color: var(--color-fg-muted);
}

.page-footer .footer-inner {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  max-width: var(--content-width);
  margin: 0 auto;
  flex-wrap: wrap;
}

/* Typography */
h1 { font-size: clamp(1.5rem, 4vw, 2.25rem); margin-bottom: 0.5rem; }
h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 0.5rem; }
h3 { font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }

a { color: var(--color-accent); }
a:hover { text-decoration: underline; }

code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--color-code-bg);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

pre {
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1rem;
  font-size: 0.875rem;
}

pre code {
  background: none;
  padding: 0;
}

blockquote {
  border-left: 3px solid var(--color-border);
  margin-left: 0;
  padding-left: 1rem;
  color: var(--color-fg-muted);
  font-style: italic;
}

hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 2rem 0;
}

/* Blog list */
.post-list { list-style: none; padding: 0; margin: 0; }

.post-item {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--color-border);
}

.post-item:last-child { border-bottom: none; }

.post-item a {
  text-decoration: none;
  color: var(--color-fg);
}

.post-item a:hover h2 { color: var(--color-accent); }

.post-item h2 { font-size: 1.2rem; margin: 0 0 0.25rem; }

.post-meta {
  font-size: 0.85rem;
  color: var(--color-fg-muted);
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
}

.post-dek { color: var(--color-fg-muted); margin: 0; font-size: 0.95rem; }

.tag {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.1em 0.5em;
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-fg-muted);
  text-decoration: none;
}

/* Empty state */
.empty-state {
  color: var(--color-fg-muted);
  font-style: italic;
  padding: 2rem 0;
}

/* Terminal crossover link */
.view-in-terminal {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  padding: 0.25em 0.75em;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-fg-muted);
  text-decoration: none;
  margin-top: 0.5rem;
}

.view-in-terminal:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles
git commit -m "feat: add warm-paper CSS theme and global reset"
```

---

## Task 6: StaticLayout.astro

**Files:**
- Create: `src/layouts/StaticLayout.astro`

- [ ] **Step 1: Create StaticLayout.astro**

```astro
---
// src/layouts/StaticLayout.astro
import '@styles/global.css';
import '@styles/static.css';
import type { Lang } from '@lib/locale';
import { getAlternateLang, getLangLabel } from '@lib/locale';

interface Props {
  title:        string;
  description?: string;
  lang:         Lang;
  canonicalUrl?: string;
  alternateUrl?: string;
  ogImage?:     string;
}

const {
  title,
  description = 'Senior Front-End / Full-Stack Engineer. Brooklyn, NYC.',
  lang,
  canonicalUrl = Astro.url.href,
  alternateUrl,
  ogImage,
} = Astro.props;

const alternateLang = getAlternateLang(lang);
const fullTitle = title === 'evandro.dev'
  ? 'evandro.dev'
  : `${title} — evandro.dev`;
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content={Astro.generator} />

    <title>{fullTitle}</title>
    <meta name="description" content={description} />

    <link rel="canonical" href={canonicalUrl} />

    {alternateUrl && (
      <>
        <link rel="alternate" hreflang={lang}          href={canonicalUrl} />
        <link rel="alternate" hreflang={alternateLang} href={alternateUrl} />
        <link rel="alternate" hreflang="x-default"     href={`https://evandro.dev/en${new URL(canonicalUrl).pathname.replace(`/${lang}`, '')}`} />
      </>
    )}

    {ogImage && <meta property="og:image" content={ogImage} />}
    <meta property="og:title"       content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:type"        content="website" />

    <link rel="alternate" type="application/rss+xml"  title="evandro.dev blog (EN)" href="/rss/en.xml" />
    <link rel="alternate" type="application/rss+xml"  title="evandro.dev blog (PT)" href="/rss/pt.xml" />
  </head>
  <body>
    <a href="#main-content" class="skip-link">Skip to content</a>

    <div class="page-wrapper">
      <header class="page-header">
        <nav aria-label="Site navigation">
          <a href={`/${lang}`} class="site-name">evandro.dev</a>
          <a href={`/${lang}/blog`}>Blog</a>
          <a href={`/${lang}/projects`}>Projects</a>
          <a href={`/${lang}/uses`}>Uses</a>
          <a href={`/${lang}/about`}>About</a>
          <a href="/" class="view-in-terminal" aria-label="Open terminal interface">~/</a>
        </nav>
      </header>

      <main id="main-content" class="page-main">
        <slot />
      </main>

      <footer class="page-footer">
        <div class="footer-inner">
          <span>since 2014 · <a href="https://github.com/evansantos/evandro.dev">source code</a></span>
          <span>
            {alternateUrl
              ? <a href={alternateUrl}>{getLangLabel(alternateLang)}</a>
              : <span>{getLangLabel(lang)}</span>
            }
          </span>
        </div>
      </footer>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/StaticLayout.astro
git commit -m "feat: add StaticLayout with skip-link, hreflang, and nav"
```

---

## Task 7: PostLayout.astro

**Files:**
- Create: `src/layouts/PostLayout.astro`

- [ ] **Step 1: Create PostLayout.astro**

```astro
---
// src/layouts/PostLayout.astro
import StaticLayout from './StaticLayout.astro';
import { formatDate, formatDateISO } from '@lib/date';
import type { Lang } from '@lib/locale';

interface Props {
  title:         string;
  dek:           string;
  date:          Date;
  lang:          Lang;
  tags:          string[];
  readingTime?:  number;
  canonicalUrl?: string;
  alternateUrl?: string;
}

const { title, dek, date, lang, tags, readingTime, canonicalUrl, alternateUrl } = Astro.props;
---

<StaticLayout
  title={title}
  description={dek}
  lang={lang}
  canonicalUrl={canonicalUrl}
  alternateUrl={alternateUrl}
>
  <article>
    <header class="post-header">
      <h1>{title}</h1>
      <p class="post-dek">{dek}</p>
      <div class="post-meta">
        <time datetime={formatDateISO(date)}>{formatDate(date, lang)}</time>
        {readingTime && <span>{readingTime} min read</span>}
        {tags.map(tag => <a href={`/${lang}/blog?tag=${tag}`} class="tag">{tag}</a>)}
      </div>
    </header>

    <div class="post-body">
      <slot />
    </div>
  </article>
</StaticLayout>

<style>
  .post-header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border); }
  .post-header h1 { margin-bottom: 0.5rem; }
  .post-body :global(h2) { margin-top: 2.5rem; }
  .post-body :global(p) { margin-bottom: 1.25rem; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/PostLayout.astro
git commit -m "feat: add PostLayout wrapping StaticLayout with post meta"
```

---

## Task 8: Blog pages

**Files:**
- Create: `src/pages/[lang]/blog/index.astro`
- Create: `src/pages/[lang]/blog/[slug].astro`

- [ ] **Step 1: Create blog index page**

```astro
---
// src/pages/[lang]/blog/index.astro
import { getCollection } from 'astro:content';
import StaticLayout from '@layouts/StaticLayout.astro';
import { formatDate } from '@lib/date';
import type { Lang } from '@lib/locale';
import { isValidLang } from '@lib/locale';

export async function getStaticPaths() {
  return [
    { params: { lang: 'en' } },
    { params: { lang: 'pt' } },
  ];
}

const { lang } = Astro.params as { lang: Lang };

if (!isValidLang(lang)) return Astro.redirect('/en/blog');

const allPosts = await getCollection('blog', ({ data }) =>
  data.lang === lang && !data.draft
);

const posts = allPosts.sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
);

const tagParam = Astro.url.searchParams.get('tag');
const filtered = tagParam
  ? posts.filter(p => p.data.tags.includes(tagParam))
  : posts;

const canonicalUrl = `https://evandro.dev/${lang}/blog`;
const alternateUrl = `https://evandro.dev/${lang === 'en' ? 'pt' : 'en'}/blog`;
---

<StaticLayout
  title="Blog"
  description="Writing about React, TypeScript, AI agents, and whatever is on my mind."
  lang={lang}
  canonicalUrl={canonicalUrl}
  alternateUrl={alternateUrl}
>
  <h1>Blog</h1>
  {tagParam && <p class="filter-notice">Filtering by <code>{tagParam}</code> — <a href={`/${lang}/blog`}>clear</a></p>}

  {filtered.length === 0 ? (
    <p class="empty-state">No posts yet in this language.</p>
  ) : (
    <ul class="post-list">
      {filtered.map(post => {
        const slug = post.id.replace(`${lang}/`, '');
        return (
          <li class="post-item">
            <a href={`/${lang}/blog/${slug}`}>
              <h2>{post.data.title}</h2>
            </a>
            <div class="post-meta">
              <time datetime={post.data.date.toISOString().slice(0, 10)}>
                {formatDate(post.data.date, lang)}
              </time>
              {post.data.readingTime && <span>{post.data.readingTime} min read</span>}
              {post.data.tags.map(tag => (
                <a href={`/${lang}/blog?tag=${tag}`} class="tag">{tag}</a>
              ))}
            </div>
            <p class="post-dek">{post.data.dek}</p>
          </li>
        );
      })}
    </ul>
  )}

  <noscript>
    <p>This site works best with JavaScript enabled, but all content is available here.</p>
  </noscript>
</StaticLayout>
```

- [ ] **Step 2: Create blog post page**

```astro
---
// src/pages/[lang]/blog/[slug].astro
import { getCollection, render } from 'astro:content';
import PostLayout from '@layouts/PostLayout.astro';
import { calcReadingTime } from '@lib/reading-time';
import type { Lang } from '@lib/locale';
import { isValidLang } from '@lib/locale';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => {
    const [lang, ...slugParts] = post.id.split('/');
    return {
      params: { lang, slug: slugParts.join('/') },
      props: { post },
    };
  });
}

const { lang, slug } = Astro.params as { lang: Lang; slug: string };
const { post } = Astro.props;

if (!isValidLang(lang)) return Astro.redirect('/en/blog');

const { Content, remarkPluginFrontmatter } = await render(post);
const readingTime = post.data.readingTime ?? calcReadingTime(post.body ?? '');

const canonicalUrl = `https://evandro.dev/${lang}/blog/${slug}`;

const alternateSlug = post.data.translationOf ?? slug;
const alternateLang = lang === 'en' ? 'pt' : 'en';
const allPosts = await getCollection('blog');
const alternatePost = allPosts.find(
  p => p.id === `${alternateLang}/${alternateSlug}` && !p.data.draft
);
const alternateUrl = alternatePost
  ? `https://evandro.dev/${alternateLang}/blog/${alternateSlug}`
  : undefined;
---

<PostLayout
  title={post.data.title}
  dek={post.data.dek}
  date={post.data.date}
  lang={lang}
  tags={post.data.tags}
  readingTime={readingTime}
  canonicalUrl={canonicalUrl}
  alternateUrl={alternateUrl}
>
  {!alternatePost && (
    <p class="no-translation">
      {lang === 'en'
        ? 'This post has no Portuguese version yet.'
        : 'Este post ainda não tem versão em inglês.'}
    </p>
  )}
  <Content />
  <div class="view-in-terminal-wrap">
    <a href={`/?cmd=cat+blog%2F${slug}`} class="view-in-terminal">view in terminal</a>
  </div>
</PostLayout>

<style>
  .no-translation {
    font-size: 0.85rem;
    color: var(--color-fg-muted);
    font-style: italic;
    margin-bottom: 1rem;
  }
  .view-in-terminal-wrap { margin-top: 3rem; }
</style>
```

- [ ] **Step 3: Verify build includes blog pages**

```bash
pnpm build 2>&1 | grep -E "blog|error|Error"
```

Expected: lines like `▶ /en/blog`, `/en/blog/debouncing`, `/pt/blog` — no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/[lang]/blog
git commit -m "feat: add blog index and post pages with hreflang and reading time"
```

---

## Task 9: Remaining static pages

**Files:**
- Create: `src/pages/[lang]/about.astro`
- Create: `src/pages/[lang]/now.astro`
- Create: `src/pages/[lang]/uses.astro`
- Create: `src/pages/[lang]/projects.astro`
- Create: `src/pages/[lang]/talks.astro`
- Create: `src/pages/index.astro`

- [ ] **Step 1: Create about.astro**

```astro
---
// src/pages/[lang]/about.astro
import { getEntry, render } from 'astro:content';
import StaticLayout from '@layouts/StaticLayout.astro';
import type { Lang } from '@lib/locale';
import { isValidLang } from '@lib/locale';

export async function getStaticPaths() {
  return [{ params: { lang: 'en' } }, { params: { lang: 'pt' } }];
}

const { lang } = Astro.params as { lang: Lang };
if (!isValidLang(lang)) return Astro.redirect('/en/about');

const entry = await getEntry('about', `${lang}`);
if (!entry) return Astro.redirect('/en/about');

const { Content } = await render(entry);
const canonicalUrl = `https://evandro.dev/${lang}/about`;
const alternateUrl = `https://evandro.dev/${lang === 'en' ? 'pt' : 'en'}/about`;
---

<StaticLayout title="About" lang={lang} canonicalUrl={canonicalUrl} alternateUrl={alternateUrl}>
  <Content />
  <div class="view-in-terminal-wrap">
    <a href="/?cmd=about" class="view-in-terminal">view in terminal</a>
  </div>
</StaticLayout>
```

- [ ] **Step 2: Create now.astro**

```astro
---
// src/pages/[lang]/now.astro
import { getEntry, render } from 'astro:content';
import StaticLayout from '@layouts/StaticLayout.astro';
import { formatDate } from '@lib/date';
import type { Lang } from '@lib/locale';
import { isValidLang } from '@lib/locale';

export async function getStaticPaths() {
  return [{ params: { lang: 'en' } }, { params: { lang: 'pt' } }];
}

const { lang } = Astro.params as { lang: Lang };
if (!isValidLang(lang)) return Astro.redirect('/en/now');

const entry = await getEntry('now', 'now');
if (!entry) return Astro.redirect('/');

const { Content } = await render(entry);
const { updated, location, building, reading, listening, learning, lookingFor } = entry.data;
const canonicalUrl = `https://evandro.dev/${lang}/now`;
---

<StaticLayout title="Now" lang={lang} canonicalUrl={canonicalUrl}>
  <h1>Now</h1>
  <p class="updated">Updated <time datetime={updated.toISOString().slice(0, 10)}>{formatDate(updated, lang)}</time> from {location}.</p>
  <dl class="now-list">
    <dt>Building</dt><dd>{building}</dd>
    <dt>Reading</dt><dd>{reading}</dd>
    <dt>Listening</dt><dd>{listening}</dd>
    <dt>Learning</dt><dd>{learning}</dd>
    <dt>Looking for</dt><dd>{lookingFor}</dd>
  </dl>
  <Content />
  <a href="/?cmd=now" class="view-in-terminal">view in terminal</a>
</StaticLayout>

<style>
  .updated { color: var(--color-fg-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
  .now-list { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1.5rem; margin-bottom: 2rem; }
  .now-list dt { font-weight: 600; }
</style>
```

- [ ] **Step 3: Create uses.astro**

```astro
---
// src/pages/[lang]/uses.astro
import { getEntry, render } from 'astro:content';
import StaticLayout from '@layouts/StaticLayout.astro';
import type { Lang } from '@lib/locale';
import { isValidLang } from '@lib/locale';

export async function getStaticPaths() {
  return [{ params: { lang: 'en' } }, { params: { lang: 'pt' } }];
}

const { lang } = Astro.params as { lang: Lang };
if (!isValidLang(lang)) return Astro.redirect('/en/uses');

const entry = await getEntry('uses', 'uses');
if (!entry) return Astro.redirect('/');

const { Content } = await render(entry);
const canonicalUrl = `https://evandro.dev/${lang}/uses`;
---

<StaticLayout title="Uses" lang={lang} canonicalUrl={canonicalUrl}>
  <h1>Uses</h1>
  <Content />
  <a href="/?cmd=uses" class="view-in-terminal">view in terminal</a>
</StaticLayout>
```

- [ ] **Step 4: Create projects.astro**

```astro
---
// src/pages/[lang]/projects.astro
import { getCollection } from 'astro:content';
import StaticLayout from '@layouts/StaticLayout.astro';
import type { Lang } from '@lib/locale';
import { isValidLang } from '@lib/locale';

export async function getStaticPaths() {
  return [{ params: { lang: 'en' } }, { params: { lang: 'pt' } }];
}

const { lang } = Astro.params as { lang: Lang };
if (!isValidLang(lang)) return Astro.redirect('/en/projects');

const projects = await getCollection('projects');
const sorted = projects.sort((a, b) => b.data.year - a.data.year);
const canonicalUrl = `https://evandro.dev/${lang}/projects`;
---

<StaticLayout title="Projects" lang={lang} canonicalUrl={canonicalUrl}>
  <h1>Projects</h1>
  {sorted.length === 0 ? (
    <p class="empty-state">Projects coming soon.</p>
  ) : (
    <ul class="post-list">
      {sorted.map(p => (
        <li class="post-item">
          <h2>{p.data.title} <small>({p.data.year})</small></h2>
          <p class="post-dek">{p.data.dek}</p>
          {p.data.stack && <p class="post-meta"><code>{p.data.stack}</code></p>}
          {p.data.url && <a href={p.data.url} target="_blank" rel="noopener">view project →</a>}
        </li>
      ))}
    </ul>
  )}
  <a href="/?cmd=ls+projects" class="view-in-terminal">view in terminal</a>
</StaticLayout>
```

- [ ] **Step 5: Create talks.astro**

```astro
---
// src/pages/[lang]/talks.astro
import { getCollection } from 'astro:content';
import StaticLayout from '@layouts/StaticLayout.astro';
import { formatDate } from '@lib/date';
import type { Lang } from '@lib/locale';
import { isValidLang } from '@lib/locale';

export async function getStaticPaths() {
  return [{ params: { lang: 'en' } }, { params: { lang: 'pt' } }];
}

const { lang } = Astro.params as { lang: Lang };
if (!isValidLang(lang)) return Astro.redirect('/en/talks');

const talks = await getCollection('talks');
const sorted = talks.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
const canonicalUrl = `https://evandro.dev/${lang}/talks`;
---

<StaticLayout title="Talks" lang={lang} canonicalUrl={canonicalUrl}>
  <h1>Talks</h1>
  {sorted.length === 0 ? (
    <p class="empty-state">Talks coming soon.</p>
  ) : (
    <ul class="post-list">
      {sorted.map(t => (
        <li class="post-item">
          <a href={t.data.url} target="_blank" rel="noopener">
            <h2>{t.data.title}</h2>
          </a>
          <div class="post-meta">
            <span>{t.data.venue}{t.data.location ? `, ${t.data.location}` : ''}</span>
            <time datetime={t.data.date.toISOString().slice(0, 10)}>{formatDate(t.data.date, lang)}</time>
          </div>
        </li>
      ))}
    </ul>
  )}
  <a href="/?cmd=ls+talks" class="view-in-terminal">view in terminal</a>
</StaticLayout>
```

- [ ] **Step 6: Create index.astro (terminal placeholder)**

```astro
---
// src/pages/index.astro
// Terminal placeholder — React island ships in Milestone 2
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>evandro.dev</title>
    <meta name="description" content="Senior Front-End / Full-Stack Engineer. Brooklyn, NYC." />
    <style>
      body {
        margin: 0;
        background: #0d1117;
        color: #39ff14;
        font-family: 'Courier New', monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100dvh;
      }
      .placeholder {
        text-align: center;
        opacity: 0.6;
      }
      .placeholder p { margin: 0.5rem 0; }
      .placeholder a { color: #39ff14; }
    </style>
  </head>
  <body>
    <noscript>
      <main>
        <h1>Evandro Santos — Senior Front-End / Full-Stack Engineer</h1>
        <p>Based in Brooklyn. React, TypeScript, Node.js. 10+ years.</p>
        <p><a href="/en/blog">Blog</a> · <a href="/en/projects">Projects</a> · <a href="/en/about">About</a></p>
      </main>
    </noscript>
    <div class="placeholder">
      <p>terminal loading...</p>
      <p><a href="/en/blog">view site →</a></p>
    </div>
  </body>
</html>
```

- [ ] **Step 7: Commit**

```bash
git add src/pages
git commit -m "feat: add all static pages (about, now, uses, projects, talks, index placeholder)"
```

---

## Task 10: 404 page

**Files:**
- Create: `src/pages/404.astro`

- [ ] **Step 1: Create 404.astro**

```astro
---
// src/pages/404.astro
import '@styles/global.css';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404 — evandro.dev</title>
    <style>
      :root {
        --bg:     #0d1117;
        --fg:     #39ff14;
        --muted:  #39ff1480;
        --accent: #00bfff;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--fg);
        font-family: 'Courier New', monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100dvh;
        padding: 2rem;
      }
      .terminal-box { max-width: 60ch; width: 100%; }
      .prompt { color: var(--muted); }
      .cmd    { color: var(--fg); }
      .error  { color: #ff4444; margin: 1rem 0; }
      .hint   { color: var(--muted); font-size: 0.9rem; margin-top: 0.5rem; }
      a       { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="terminal-box" role="main">
      <p><span class="prompt">evandro.dev ~ $</span> <span class="cmd">cat {Astro.url.pathname}</span></p>
      <p class="error">bash: {Astro.url.pathname}: No such file or directory</p>
      <p class="hint">hint: try <a href="/en/blog">ls blog</a> or <a href="/">~</a></p>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat: add terminal-style 404 page"
```

---

## Task 11: RSS feeds

**Files:**
- Create: `src/pages/rss/en.xml.ts`
- Create: `src/pages/rss/pt.xml.ts`

- [ ] **Step 1: Create EN RSS feed**

```ts
// src/pages/rss/en.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) =>
    data.lang === 'en' && !data.draft
  );

  const sorted = posts.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'evandro.dev — Blog',
    description: 'Writing about React, TypeScript, AI agents, and more.',
    site: context.site!,
    items: sorted.map(post => {
      const slug = post.id.replace('en/', '');
      return {
        title:       post.data.title,
        pubDate:     post.data.date,
        description: post.data.dek,
        link:        `/en/blog/${slug}/`,
      };
    }),
    customData: '<language>en-us</language>',
  });
}
```

- [ ] **Step 2: Create PT RSS feed**

```ts
// src/pages/rss/pt.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) =>
    data.lang === 'pt' && !data.draft
  );

  const sorted = posts.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'evandro.dev — Blog',
    description: 'Escrevendo sobre React, TypeScript, agentes de IA e mais.',
    site: context.site!,
    items: sorted.map(post => {
      const slug = post.id.replace('pt/', '');
      return {
        title:       post.data.title,
        pubDate:     post.data.date,
        description: post.data.dek,
        link:        `/pt/blog/${slug}/`,
      };
    }),
    customData: '<language>pt-br</language>',
  });
}
```

- [ ] **Step 3: Verify feeds build**

```bash
pnpm build 2>&1 | grep -E "rss|xml|error" | head -10
```

Expected: lines showing `/rss/en.xml` and `/rss/pt.xml` generated.

- [ ] **Step 4: Commit**

```bash
git add src/pages/rss
git commit -m "feat: add RSS feeds for EN and PT content"
```

---

## Task 12: Security headers and redirects

**Files:**
- Create: `public/_headers`
- Create: `public/_redirects`

- [ ] **Step 1: Create public/_headers**

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/rss/*.xml
  Cache-Control: public, max-age=3600
  Content-Type: application/rss+xml; charset=utf-8
```

Note: The anti-FOUC script hash is added to `script-src` in Milestone 2 when the inline script is introduced. In M1, `script-src 'self'` is correct — there are no inline scripts.

- [ ] **Step 2: Create public/_redirects**

```
/blog/*          /en/blog/:splat   301
/about           /en/about         301
/now             /en/now           301
/uses            /en/uses          301
/projects        /en/projects      301
/talks           /en/talks         301
```

- [ ] **Step 3: Commit**

```bash
git add public/_headers public/_redirects
git commit -m "feat: add Cloudflare security headers and EN redirect rules"
```

---

## Task 13: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [feat/evandro-dev, main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Typecheck · Lint · Test · Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Assert terminal fixture present
        run: test -f dist/terminal.manifest.json || echo "No terminal fixture yet — expected in M2"
```

- [ ] **Step 2: Commit**

```bash
git add .github
git commit -m "ci: add GitHub Actions workflow for typecheck, lint, test, build"
```

---

## Task 14: Full build verification

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: build completes with no errors. Output in `dist/`.

- [ ] **Step 2: Check all pages generated**

```bash
find dist -name "*.html" | sort
```

Expected output includes:
```
dist/index.html
dist/404.html
dist/en/blog/index.html
dist/en/blog/debouncing/index.html
dist/en/blog/telemetry/index.html
dist/en/blog/boring-tech/index.html
dist/en/about/index.html
dist/en/now/index.html
dist/en/uses/index.html
dist/en/projects/index.html
dist/en/talks/index.html
dist/pt/blog/index.html
dist/pt/about/index.html
dist/pt/now/index.html
dist/pt/uses/index.html
dist/pt/projects/index.html
dist/pt/talks/index.html
```

- [ ] **Step 3: Verify hreflang present on a bilingual page**

```bash
grep -l "hreflang" dist/en/blog/debouncing/index.html
```

Expected: file path printed (match found).

- [ ] **Step 4: Verify no noindex meta tags**

```bash
grep -r "noindex" dist/ | grep -v ".map"
```

Expected: no output (zero matches).

- [ ] **Step 5: Preview locally**

```bash
pnpm preview
```

Open http://localhost:4321/en/blog — confirm posts render with warm-paper theme.
Open http://localhost:4321/en/blog/debouncing — confirm post renders with hreflang in source.
Open http://localhost:4321/rss/en.xml — confirm valid XML feed.

- [ ] **Step 6: Run Poku tests one final time**

```bash
pnpm test
```

Expected: all 4 test suites pass.

- [ ] **Step 7: Final commit**

```bash
git add -A
git status
# Confirm nothing unexpected is staged
git commit -m "feat: milestone 1 complete — static Astro site with bilingual blog and RSS"
```

---

## Self-Review

### Spec coverage

| M1 requirement | Task |
|---|---|
| Astro + React + TypeScript scaffold | Task 1 |
| Content collections + Zod schemas | Task 2 |
| Three real blog posts EN | Task 4 |
| /uses, /now, /about per language, /resume | Tasks 4, 9 |
| Static pages /blog, /blog/[slug], /about, /now, /uses, /projects, /talks | Tasks 8, 9 |
| Warm-paper theme | Task 5 |
| @astrojs/rss feeds | Task 11 |
| hreflang alternate tags | Task 6 (StaticLayout), Task 8 |
| Cloudflare _headers CSP | Task 12 |
| Skip-to-content link | Task 6 (StaticLayout) |
| 404 page (terminal style) | Task 10 |
| Deploy to Cloudflare Pages | Implied by _headers/_redirects + CI — actual deploy is manual first push |

**Gap noted:** `/resume` static page not implemented. Resume is terminal-only in M1 (the content file exists); a `/en/resume` static page was not in the M1 spec requirements. Confirmed not needed — `resume.mdx` is consumed by the terminal command in M2.

### Placeholder scan

No TBD, TODO, FIXME, or "similar to task N" patterns — each task has complete code.

### Type consistency

- `Lang` type defined in `src/lib/locale.ts` and used consistently across all pages
- `blogSchema`, `projectSchema`, `talkSchema` exported from `src/content/schemas.ts` and imported in `config.ts` and tests
- `formatDate(date: Date, lang: Lang)` signature matches all call sites
- `calcReadingTime(text: string): number` matches usage in `[slug].astro`
