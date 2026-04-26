# evandro.dev — Project Specification

**Spec version:** 1.1
**Last updated:** 2026-04-23
**Status:** Design locked, ready to build.
**Owner:** Evandro Santos

---

## Non-goals

The following are explicitly out of scope and should not influence implementation decisions:

- Real shell execution — no system calls, no file I/O, no network requests from commands
- User accounts, authentication, or any server-side state
- SSR at `/` — the terminal is a client-side React island only
- CMS or database — content lives in version-controlled markdown files
- Real-time collaboration or multiplayer
- Mobile app or PWA installation
- Support for IE or any browser without ES2022 support

---

## About

I'm Evan (Evandro Cavalcante Santos). Senior front-end / full-stack engineer with over 10 years of experience, currently obsessed with spec-driven development and AI agents as collaborators, not autocomplete.

Born in Santos, raised on the east side of São Paulo, passed through Katowice in Poland, and now writing this from Brooklyn. Portuguese is native, English is fluent, and I mix both whenever it feels right.

By day: shipping product, arguing about architecture, and trying to leave codebases better than I found them. I've built GenAI tools at Cox, financial dashboards at Broadridge, Next.js SSR at Philip Morris, and a11y-first UIs at Acoustic. The through-line is the same: React, TypeScript, Node, and a stubborn belief that good tooling beats heroic effort.

Self-described as misfit, lifelong emo/punk kid, permanently curious.

Say hi if you want to talk React, AI agents, guitar tone, or why Letterboxd beats Trakt.

---

## 0.1 — Defaults

- Name: Evan (Evandro Cavalcante Santos)
- Based in: Brooklyn, NYC (Williamsburg)
- Origin: Santos → São Paulo → Katowice → NYC
- Bilingual: EN/PT
- Years of experience: over 10
- Title: Senior Front-End / Full-Stack Engineer
- Core stack: React, TypeScript, Node.js
- Also fluent in: Next.js, Vite, Tailwind, Vitest, Playwright
- Current obsession: spec-driven development + AI agents
- Editor: VS Code with Claude Code
- Package manager: pnpm
- Runtime of choice: Node (Bun when it earns it)

## 0.2 — Contact

- Email: evan.its.me@gmail.com
- GitHub: [@evansantos](https://github.com/evansantos)
- LinkedIn: [@evandrocsantos](https://linkedin.com/in/evandrocsantos)

---

## 1. Overview

### What this is

A personal website where the homepage is a fully interactive terminal — a fake UNIX shell you navigate with `cd`, `ls`, `cat`, `find`, `grep`, etc. Every feature (blog, projects, talks, uses, now, about) is accessible as both a shell command and a conventional URL.

The terminal supports multiple visual themes (palettes), some visible by default, others earned through discovery (typing a specific phrase, finding a hidden command, hitting a key combination, etc.).

### Why this shape

- **Identity.** The site itself is the first engineering artifact — it signals technical taste before anyone reads a post.
- **SEO + sharing.** Every command maps to a crawlable URL. Google crawls `/blog/debouncing`, humans get the terminal.
- **Low maintenance cost.** Content lives in version-controlled markdown files. Adding a post is a `git commit`. No CMS, no database.
- **Open source.** Public repo. Forks are welcomed. The "since 2014 · source code" footer on every page links to the repo.

### Success criteria

- Terminal works on mobile and desktop, keyboard-first but also fully navigable by click.
- Static pages render in under 100ms on first contentful paint.
- Adding a new blog post requires zero code changes — just a markdown file.
- Adding a new theme requires creating one CSS file and one registry entry.
- Adding a new command requires one TypeScript file.
- Bilingual content (EN/PT) works with graceful fallback when a translation doesn't exist.
- Terminal input stays visible above the virtual keyboard on iOS Safari and Android Chrome.
- Prompt row touch target is >= 44px; input font-size is >= 16px to prevent auto-zoom.
- `/?cmd=<command>` executes the command on load — terminal output is deep-linkable.
- `lang <code>` switches the active language; content queries and status bar update immediately.
- Long output (> 30 blocks) enters pager mode automatically; navigable with vim keybindings.
- Lighthouse accessibility score >= 95 on all static pages, enforced in CI.
- Terminal island bundle <= 120 KB gzipped, enforced in CI via size-limit.

---

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Astro 5** | Static-first with islands, first-class MDX, good i18n, lightweight |
| UI | **React 19** | Developer is fluent; ecosystem depth justifies ~45 KB cost |
| Language | **TypeScript** | Strict mode across content + command layers |
| Content | **MDX + Astro Content Collections** | Typed frontmatter via Zod, MDX lets posts embed React components |
| Styling | **Vanilla CSS + custom properties** | Themes are CSS variable overrides; no Tailwind needed |
| Search (static) | **Pagefind** | Build-time index, zero server, works with just static HTML |
| Feeds | **@astrojs/rss** | RSS + Atom feeds from content collections |
| OG images | **Satori** | Build-time per-post cards; fonts bundled, not fetched at build |
| Hosting | **Cloudflare Pages** | Free, edge-cached, `_headers` for CSP, no egress surprises |
| Package manager | **pnpm** | Faster, less disk, workspace-ready |
| Linter | **oxlint** | 50-100x faster than ESLint, 720+ rules, production-ready. Pinned to exact version |
| Formatter | **oxfmt** | 30x faster than Prettier, 100% Prettier conformance, MDX support. Pinned to exact version |
| Testing | **Poku + poku ecosystem** | Zero-overhead runner using Node built-in assert. Pure command/core layer. See https://github.com/pokujs |
| Component testing | **@pokujs/react + happy-dom** | Poku plugin for React component testing with DOM adapters — stays within the Poku ecosystem |
| Bundle budget | **size-limit** | Enforces terminal island <= 120 KB gzipped in CI |
| CI | **GitHub Actions** | Typecheck + lint + build + size-limit + axe-core on every PR |

### Node version

Node 22 LTS. `package.json` must include `"engines": { "node": ">=22" }`.

### Pinning policy

`oxfmt` and `oxlint` are pinned to exact versions (no `^` or `~`). Upgrades are manual and reviewed. Reason: formatting output has changed between beta releases — unpinned upgrades produce large noisy diffs. Consider Renovate with manual approval for these two packages specifically.

### @pokujs/react

`@pokujs/react` is the Poku plugin for React component testing (`src/terminal/components/`, `Shell.tsx`, hooks). Requires a DOM adapter — use `happy-dom` + `@happy-dom/global-registrator`. No Vitest anywhere in the project.

```bash
pnpm add -D @pokujs/react happy-dom @happy-dom/global-registrator
```

### react-markdown

Pin to `react-markdown@^9` explicitly. v8 does not support React 19. Vet all transitive remark/rehype plugins before adding — one unmaintained plugin blocks upgrades.

### Hydration directive

The terminal island at `/` uses `client:load`. Not `client:idle` (causes visible prompt delay). Not `client:visible` (terminal is the entire page).

---

## 3. Architecture

### High-level model

Content lives in version-controlled markdown files under `src/content/`. Astro Content Collections parse and validate these at build time, producing typed data.

Two rendering targets consume the same content:

1. **Static HTML pages** — `/blog`, `/blog/[slug]`, `/about`, `/projects`, etc. Zero JS by default. Used by Google, RSS readers, link previews, curl, JS-disabled browsers.

2. **The terminal** — a React island at `/`. Loads a build-time JSON fixture derived from the same content collections, operates entirely client-side after initial load.

A user who lands at `/` sees the terminal. A user who lands at `/blog/debouncing` sees the static page. Small `[ view as pages ]` / `[ view as shell ]` affordances let either user cross over.

### The content fixture

`scripts/build-fixture.ts` reads all content collections and emits `public/terminal.<hash>.json`. The hash is SHA-256 of the content inputs, truncated to 8 characters.

A manifest file (`public/terminal.manifest.json`) maps `"current"` to the hashed filename:

```json
{ "current": "terminal.a1b2c3d4.json" }
```

The terminal loads the manifest first, then fetches the fixture. The hashed fixture is served with `Cache-Control: public, max-age=31536000, immutable`.

The Astro layout for `/` includes a preload hint:

```html
<link rel="preload" as="fetch" href="/terminal.manifest.json" crossorigin>
```

**Schema versioning:** `terminal.json` includes `"schemaVersion": 1` at the root. `data/load.ts` hard-fails into degraded mode if the version does not match a compile-time constant. Incrementing the version is a deliberate act, treated like a DB migration.

**Dev HMR fix:** In development, `/terminal.json` is served by a live Astro endpoint (`src/pages/terminal.json.ts`) that reads directly from content collections on every request. In production, the same URL is a static file from the build. The terminal fetch code is identical in both environments.

**Scale ceiling:** 100-300 KB gzipped covers ~200-400 posts. When the site approaches 150 posts, split the fixture:
- `terminal.index.<hash>.json` — metadata only (titles, slugs, dates, tags) — always loaded
- `terminal.posts/<slug>.json` — per-post body — lazy loaded on `cat`

`ContentStore` exposes `async loadPost(slug: string): Promise<Post>` from day one, returning from memory in v1. This paves the split path without a rewrite.

### Graceful degradation — terminal.json

```ts
type LoadResult =
  | { ok: true;  data: ContentFixture }
  | { ok: false; error: string };
```

- `ContentStore` accepts undefined data, returns empty arrays in degraded mode
- Shell shows `error: failed to load content — try whoami, date, theme, help` if degraded
- Commands check `ctx.store.degraded` and return friendly errors
- Terminal never renders blank — loading state shows blinking cursor, then prompt

### Deep-link behavior

`/?cmd=cat+blog%2Fdebouncing` — the terminal reads the `cmd` query parameter on mount and executes it after the fixture loads. The URL is not cleared after execution — sharing the link re-executes the command.

```ts
const params = new URLSearchParams(window.location.search);
const cmd = params.get('cmd');
if (cmd) executeCommand(cmd);
```

### noscript fallback

The homepage `<noscript>` block provides meaningful content for crawlers and JS-disabled browsers:

```html
<noscript>
  <main>
    <h1>Evandro Santos — Senior Front-End / Full-Stack Engineer</h1>
    <p>Based in Brooklyn. React, TypeScript, Node.js. 10+ years.</p>
    <p>
      <a href="/blog">Blog</a> ·
      <a href="/projects">Projects</a> ·
      <a href="/about">About</a>
    </p>
  </main>
</noscript>
```

### What goes in React vs what stays static

| Lives in React | Lives in static Astro |
|---|---|
| Terminal shell (`Shell.tsx`) | Blog index page |
| In-post interactive demos | Blog post pages |
| Language switcher (if animated) | About page |
| | Projects / Talks / Uses / Now pages |
| | RSS + feed routes |
| | OG image endpoints |

---

## 4. Content model

### Directory layout

```
src/content/
├── config.ts
├── blog/
│   ├── en/
│   └── pt/
├── projects/
├── talks/
├── uses.mdx
├── now.mdx
├── resume.mdx
└── about/
    ├── en.mdx
    └── pt.mdx
```

### Frontmatter schemas (Zod, in `src/content/config.ts`)

**Blog:**
```ts
{
  title:        string,
  date:         Date,
  lang:         'en' | 'pt',
  tags:         string[],
  dek:          string,
  readingTime:  number,       // derived at build if absent
  featured:     boolean,      // default false
  draft:        boolean,      // default false
  translationOf?: string,     // slug of the EN original
}
```

**Projects:**
```ts
{
  title:    string,
  year:     number,
  category: 'work' | 'personal' | 'sim-racing' | 'ai-tooling',
  dek:      string,
  featured: boolean,
  stack?:   string,
  metric?:  string,
  url?:     string,
  status:   'active' | 'archived' | 'discontinued',
}
```

**Talks:**
```ts
{
  title:     string,
  kind:      'talk' | 'podcast' | 'workshop' | 'interview' | 'video',
  venue:     string,
  location?: string,
  date:      Date,
  lang:      'en' | 'pt',
  url:       string,
  views?:    number,          // manually entered, no external fetch
}
```

**Uses:** single MDX with structured sections (desk, racing-rig, coding, apps, services).

**Now:** single MDX with frontmatter fields (`updated`, `location`, `building`, `reading`, `listening`, `learning`, `lookingFor`). Updated author-driven, no automated cadence.

**Resume:** single MDX (`src/content/resume.mdx`) — CV content used by the `resume` command.

**About:** one per language. Bio + career timeline.

### Bilingual handling

**Language is a shell session variable, not a URL.** The `lang` command switches the active language; `ContentStore` filters all queries by the active language at runtime.

```
~ $ lang
current: en | available: en, pt

~ $ lang pt
language set to pt -- content queries now return Portuguese posts

~ $ lang en
language set to en
```

Status bar updates immediately: `shell: unix · theme: amber · lang: pt · found: 6/11`

**Static pages** use URL-based locale: `/en/blog/slug` and `/pt/blog/slug`. `/blog/slug` redirects to `/en/blog/slug` via Cloudflare `_redirects`. No Accept-Language server redirect.

**hreflang tags** on every bilingual static page (required for SEO):

```html
<link rel="alternate" hreflang="en"        href="https://evandro.dev/en/blog/slug" />
<link rel="alternate" hreflang="pt"        href="https://evandro.dev/pt/blog/slug" />
<link rel="alternate" hreflang="x-default" href="https://evandro.dev/en/blog/slug" />
```

**Graceful fallback:** `cat missing-post` in PT falls back to EN with a notice:

```
note: no Portuguese version -- showing original (en)
```

**RSS feeds:** one per language — `/rss/en.xml` and `/rss/pt.xml`.

---

## 5. Theme system

### The concept

Themes are palettes, not layouts. The shell markup is theme-agnostic. Themes redefine CSS custom properties (`--bg`, `--fg`, `--accent`, etc.) and optionally font choices.

### Visible themes (6)

1. **matrix** — green on black, default
2. **amber** — amber CRT, 80s terminal
3. **nord** — cool blues, modern
4. **solarized** — solarized dark, classic
5. **paper** — black on warm paper (only light theme)
6. **synthwave** — magenta + cyan, 80s arcade

### Hidden themes (5)

| Theme | Unlock condition |
|---|---|
| `sandwich` | Type `sudo make me a sandwich` |
| `night` | Only available between 10pm-6am local time |
| `lazy` | Run `uptime` three times in one session |
| `konami` | Enter konami code: up up down down left right left right b a |
| `hacker` | Unlock 4 other hidden themes first — includes Matrix rain background |

### Theme command

```
theme              # list visible themes + show current + found count
theme <name>       # switch (must be unlocked)
theme next         # cycle through visible themes
theme random       # pick a random unlocked theme
theme reset        # return to matrix
```

Locked theme attempts return a hint:

```
~ $ theme konami
theme: 'konami' is locked
hint: up up down down left right left right b a
```

### Persistence

- `localStorage` key `evandro.state.v1` — versioned state object containing theme, unlocked themes, counts
- On version mismatch, reset to defaults rather than attempting migration

### Anti-FOUC

A small blocking inline script in `<head>` sets `data-theme` before first paint:

```js
(function(){
  try {
    var s = JSON.parse(localStorage.getItem('evandro.state.v1') || '{}');
    if (s.theme) document.documentElement.dataset.theme = s.theme;
  } catch(e) {}
})();
```

This script is byte-stable across builds. Its SHA-256 hash is emitted into `_headers`:

```
Content-Security-Policy: script-src 'self' 'sha256-<anti-fouc-hash>';
```

This is the only inline script on the site.

### localStorage hardening

All storage access uses safe wrappers (try/catch for Safari private mode compatibility). State keys are versioned (`evandro.state.v1`) — on version mismatch, reset to defaults. `counts` map is capped at 50 keys; oldest evicted when cap is reached. Listen to the `storage` event to sync theme changes across open tabs.

### WCAG contrast in CI

A Poku test loads each theme's CSS, resolves `--fg` / `--bg` / `--accent`, and asserts contrast ratios meet WCAG AA (4.5:1 body, 3:1 large text). This is a CI gate — a theme that fails contrast cannot merge.

### Cross-shell consistency

A status bar at the bottom always shows `shell: unix · theme: amber · lang: en · found: 6/11`.

---

## 6. Command system

### Design principle

Commands return data, not HTML. Commands are pure functions that take arguments and a context object, and return a `Result` object. A separate renderer maps `Result` types to React components.

### The core types

```ts
interface Command {
  name:      string;
  describe:  string;
  run:       (args: string[], ctx: Context) => Result | Promise<Result>;
  complete?: (partial: string, ctx: Context) => string[];
}

interface Context {
  store: ContentStore;
  state: ShellState;
  // Piping: add ctx.stdin when pipe support lands
}

type ErrorCode = 'ENOENT' | 'EINVAL' | 'EPERM' | 'EACCES' | 'ENOTDIR';

type Result =
  | { type: 'echo';         text: string;                                  exitCode?: number }
  | { type: 'error';        text: string; hint?: string; code?: ErrorCode; exitCode: 1 }
  | { type: 'clear' }
  | { type: 'navigate';     href: string; target?: '_self' | '_blank' }
  | { type: 'post-list';    items: Post[];     meta?: object }
  | { type: 'post-view';    post: Post }
  | { type: 'project-list'; items: Project[];  meta?: object }
  | { type: 'table';        columns: Column[]; rows: string[][] }
  | { type: 'neofetch';     data: NeofetchData }
  | { type: 'grep-result';  matches: GrepMatch[] }
  | { type: 'pager';        blocks: MarkdownBlock[]; title: string }
  | { type: 'empty' };

interface Column {
  key:    string;
  label:  string;
  align?: 'left' | 'right';
}
```

Notes:
- `run` may return `Promise<Result>` for async commands (animated neofetch, etc.)
- `{ type: 'clear' }` signals the shell to empty the log; not rendered as a component
- `{ type: 'navigate' }` triggers client-side routing or `window.open`
- `{ type: 'pager' }` activates vim pager mode; auto-triggered for output > 30 blocks
- `exitCode` defaults to 0; explicitly 1 on error
- `stdin` is absent from Context — pipes are not in v1
- A `raw` HTML result type does not exist — React's unsafe HTML injection API is banned site-wide

### Day-one command set

| Command | Behavior |
|---|---|
| `help` | List all commands with one-line descriptions |
| `whoami` | Returns `evandro` |
| `neofetch` | ASCII-art identity card with theme counter and lang indicator |
| `pwd` | Print current directory |
| `cd <dir>` | Change directory (blog, projects, talks, uses, .., ~) |
| `ls [-l] [--tag] [--lang]` | List directory contents with optional filtering |
| `tree` | Full site structure as a tree |
| `cat <file>` | Read a post or page — returns `pager` for content > 30 blocks |
| `find <path> [-name] [-tag] [-lang] [-after] [-before]` | UNIX-style search |
| `grep <pattern> [path]` | Substring search; highlights matches as React mark elements |
| `head -<n> <file>` | First N markdown blocks (frontmatter stripped) |
| `tail -<n> <file>` | Last N markdown blocks |
| `wc [file]` | Word count, block count, char count |
| `now` | Show /now page |
| `about` | Show about page |
| `contact` | Email + socials |
| `resume` | Renders CV markdown in pager; `--print` opens PDF in new tab |
| `bio [--copy]` | Press-kit bio; `--copy` copies to clipboard |
| `career` | Work history timeline |
| `uses [group]` | Gear list |
| `rss` | Feed URLs (`/rss/en.xml`, `/rss/pt.xml`) |
| `date` | Current time |
| `uptime` | "Site up N years since 2014" |
| `clear` | Clear screen |
| `history` | Command history (persisted in localStorage) |
| `echo <text>` | Repeat text |
| `lang [code]` | Show current language or switch to `en` / `pt`. Persists to localStorage. Updates status bar and ContentStore filter immediately. |
| `theme [name\|next\|random\|reset]` | See or switch themes |

### head and tail semantics

In the terminal, post content is rendered markdown — raw lines are meaningless to a reader. **A line is one top-level markdown block** after frontmatter is stripped: paragraph, heading, fenced code block, blockquote, list, or horizontal rule. `head -3` returns the first 3 blocks. On list output (`ls`, `find`, `grep`), `head`/`tail` trim to N items — standard UNIX behavior.

### resume command behavior

`resume` returns `{ type: 'pager', blocks, title: 'Resume' }` from `src/content/resume.mdx`.

`resume --print` returns `{ type: 'navigate', href: '/evandro-cv.pdf', target: '_blank' }`.

`public/evandro-cv.pdf` is added in Milestone 6.

### Joke commands (personality layer)

Not in `help`:

| Command | Behavior |
|---|---|
| `sudo <anything>` | "authentication failure" (except `sudo make me a sandwich` — unlocks sandwich theme) |
| `rm -rf <anything>` | "operation not permitted — this site is all I have" |
| `vim`, `nano`, `emacs` | "opening [file] in vim... [no seriously, use: cat [file]]" |
| `exit`, `quit`, `logout` | "there is no exit. only ~" |
| `cat .bashrc` | Fake aliases hinting at personality |

### Flag parsing

Commands use a shared `parseFlags(args)` utility handling `-flag value`, `--flag=value`, positional arguments, and boolean flags.

### Glob support

`find -name "*debounce*"` uses `globToRegex(glob: string): RegExp` — simple `*` → `.*` mapping.

### Tab completion

`complete?: (partial, ctx) => string[]` is called by `InputLine`.

- M3: command names only
- M4: paths (`cd`, `cat`, `head`, `tail`, `wc`), tags (after `-tag`), lang values (after `-lang`), unlocked theme names (after `theme`)

---

## 7. Vim mode and keyboard navigation

### Pager mode

When a command returns `{ type: 'pager', blocks, title }`, the terminal enters pager mode — a vim-like read-only navigator for long output (post bodies, career timelines, uses page).

Pager mode activates automatically when output exceeds 30 markdown blocks. `cat` always returns `pager` for posts. `career`, `uses`, and `now` may also return `pager`.

**Pager keybindings:**

| Key | Action |
|---|---|
| `j` / down arrow | Scroll down one block |
| `k` / up arrow | Scroll up one block |
| `d` / Ctrl+D | Scroll down half page |
| `u` / Ctrl+U | Scroll up half page |
| `g` / `gg` | Jump to top |
| `G` | Jump to bottom |
| `/pattern` | Search within pager content |
| `n` | Next search match |
| `N` | Previous search match |
| `q` / Esc | Exit pager, return to prompt |

Status bar shows `-- PAGER -- j/k scroll · / search · q quit` while in pager mode.

### Terminal keyboard shortcuts

Active whenever the input line is focused:

| Key | Action |
|---|---|
| up / down | Navigate command history |
| Tab | Autocomplete (M3: command names; M4: paths) |
| Ctrl+C | Cancel input, print `^C`, new prompt |
| Ctrl+L | Clear screen (same as `clear`) |
| Ctrl+A | Move cursor to start of line |
| Ctrl+E | Move cursor to end of line |
| Ctrl+K | Delete from cursor to end of line |
| Ctrl+U | Delete entire line |
| Ctrl+W | Delete previous word |
| Esc | Exit pager if active; clear input otherwise |

### useVimMode hook

`src/terminal/hooks/useVimMode.ts` manages pager state:

```ts
interface VimModeState {
  active:      boolean;
  blocks:      MarkdownBlock[];
  title:       string;
  currentLine: number;
  searchQuery: string;
  searchIndex: number;
}
```

Listens to `keydown` events only when pager is active. Returns focus to input on `q` or `Esc`.

### Files for this feature

- `src/terminal/hooks/useVimMode.ts` — pager state machine
- `src/terminal/components/Pager.tsx` — renders pager view, handles vim keys
- Update `src/terminal/components/Log.tsx` — dispatch `pager` type to `Pager`
- Update `src/terminal/commands/cat.ts` — return `pager` for posts > 30 blocks
- Update `src/terminal/Shell.tsx` — forward keyboard events to useVimMode when active

---

## 8. Directory structure

```
evandro.dev/
├── .github/
│   └── workflows/
│       └── ci.yml
├── public/
│   ├── fonts/
│   ├── images/
│   ├── evandro-cv.pdf              # added in Milestone 6
│   ├── terminal.manifest.json      # maps "current" to hashed fixture filename
│   └── terminal.<hash>.json        # generated at build — gitignored
├── scripts/
│   ├── build-fixture.ts            # reads content, writes public/terminal.<hash>.json
│   └── reading-time.ts
├── src/
│   ├── content/
│   │   ├── config.ts               # Zod schemas
│   │   ├── blog/
│   │   │   ├── en/
│   │   │   └── pt/
│   │   ├── projects/
│   │   ├── talks/
│   │   ├── uses.mdx
│   │   ├── now.mdx
│   │   ├── resume.mdx
│   │   └── about/
│   │       ├── en.mdx
│   │       └── pt.mdx
│   ├── pages/
│   │   ├── index.astro             # terminal entry (client:load)
│   │   ├── terminal.json.ts        # dev-only live endpoint (HMR)
│   │   ├── [lang]/
│   │   │   ├── blog/
│   │   │   │   ├── index.astro
│   │   │   │   └── [slug].astro
│   │   │   ├── about.astro
│   │   │   ├── now.astro
│   │   │   ├── uses.astro
│   │   │   ├── projects.astro
│   │   │   └── talks.astro
│   │   ├── rss/
│   │   │   ├── en.xml.ts
│   │   │   └── pt.xml.ts
│   │   ├── feed.json.ts
│   │   └── og/
│   │       └── [slug].png.ts
│   ├── terminal/
│   │   ├── Shell.tsx
│   │   ├── components/
│   │   │   ├── Log.tsx
│   │   │   ├── InputLine.tsx
│   │   │   ├── Pager.tsx           # vim pager renderer
│   │   │   ├── PostList.tsx
│   │   │   ├── PostView.tsx
│   │   │   ├── Neofetch.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── EchoLine.tsx
│   │   │   └── ErrorLine.tsx
│   │   ├── hooks/
│   │   │   ├── useTheme.ts
│   │   │   ├── useHistory.ts
│   │   │   ├── useCompletion.ts
│   │   │   ├── useKonami.ts
│   │   │   └── useVimMode.ts       # pager state machine
│   │   ├── commands/
│   │   │   ├── index.ts
│   │   │   ├── help.ts
│   │   │   ├── find.ts
│   │   │   ├── grep.ts
│   │   │   ├── ls.ts
│   │   │   ├── cat.ts
│   │   │   ├── head.ts
│   │   │   ├── tail.ts
│   │   │   ├── wc.ts
│   │   │   ├── theme.ts
│   │   │   ├── lang.ts             # lang command
│   │   │   ├── neofetch.ts
│   │   │   ├── now.ts
│   │   │   ├── about.ts
│   │   │   ├── contact.ts
│   │   │   ├── bio.ts
│   │   │   ├── career.ts
│   │   │   ├── resume.ts
│   │   │   ├── uses.ts
│   │   │   ├── rss.ts
│   │   │   ├── cd.ts
│   │   │   ├── pwd.ts
│   │   │   ├── tree.ts
│   │   │   ├── clear.ts
│   │   │   ├── history.ts
│   │   │   ├── echo.ts
│   │   │   ├── date.ts
│   │   │   ├── uptime.ts
│   │   │   └── jokes.ts
│   │   ├── core/
│   │   │   ├── types.ts
│   │   │   ├── flags.ts
│   │   │   ├── glob.ts
│   │   │   ├── content.ts
│   │   │   └── markdown.ts
│   │   ├── themes/
│   │   │   ├── registry.ts
│   │   │   ├── unlocks.ts
│   │   │   └── styles/
│   │   │       ├── matrix.css
│   │   │       ├── amber.css
│   │   │       ├── nord.css
│   │   │       ├── solarized.css
│   │   │       ├── paper.css
│   │   │       ├── synthwave.css
│   │   │       ├── sandwich.css
│   │   │       ├── night.css
│   │   │       ├── lazy.css
│   │   │       ├── konami.css
│   │   │       └── hacker.css
│   │   └── data/
│   │       └── load.ts
│   ├── components/
│   │   └── (e.g.) DebounceDemo.tsx
│   ├── layouts/
│   │   ├── StaticLayout.astro
│   │   └── PostLayout.astro
│   ├── lib/
│   │   ├── date.ts
│   │   └── locale.ts
│   └── styles/
│       ├── global.css
│       ├── static.css
│       └── terminal.css
├── astro.config.mjs
├── oxlint.json
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

### package.json scripts

```json
{
  "scripts": {
    "predev":     "tsx scripts/build-fixture.ts",
    "prebuild":   "tsx scripts/build-fixture.ts",
    "dev":        "astro dev",
    "build":      "astro build",
    "preview":    "astro preview",
    "size-limit": "size-limit"
  },
  "engines": { "node": ">=22" }
}
```

---

## 9. Build plan

### Milestone 1 — Foundation (Week 1)

- [ ] Astro + React + TypeScript scaffold
- [ ] Content collections + Zod schemas for blog, projects, uses, now, about, resume
- [ ] Three real blog posts in EN
- [ ] One /uses, one /now, one /about per language, one /resume
- [ ] Static pages: /blog, /blog/[slug], /about, /now, /uses, /projects, /talks
- [ ] Warm-paper theme for static pages
- [ ] @astrojs/rss feeds: /rss/en.xml and /rss/pt.xml
- [ ] hreflang alternate tags on all bilingual pages
- [ ] Cloudflare _headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [ ] Skip-to-content link on every static page
- [ ] 404 page (terminal-style "command not found" feel)
- [ ] Deploy to Cloudflare Pages

**Exit criteria:**
- `curl -I https://evandro.dev/blog` returns 200
- `curl https://evandro.dev/rss/en.xml` passes W3C Feed Validator
- Any bilingual page contains `<link rel="alternate" hreflang` tags
- Lighthouse performance >= 90 on /blog (mobile)
- No `<meta name="robots" content="noindex">` on any page

---

### Milestone 2 — Terminal skeleton (Week 2)

- [ ] Shell.tsx with input, log, status bar, full ARIA structure
- [ ] ARIA: role="application", role="log" aria-live="polite", role="status", keyboard trap escape (Shift+Tab out, Esc to blur when idle)
- [ ] TUI boot sequence: ASCII banner + prompt + hint ("type help to get started")
- [ ] scripts/build-fixture.ts with schemaVersion: 1 and content-hashed output
- [ ] terminal.manifest.json pointing to current hash
- [ ] Dev endpoint src/pages/terminal.json.ts for live HMR
- [ ] ContentStore class with async loadPost(slug) signature
- [ ] Full Result type union (clear, navigate, pager, exitCode, error.code)
- [ ] data/load.ts: LoadResult, degraded mode, schema version check
- [ ] Anti-FOUC inline script + SHA-256 hash emitted to _headers
- [ ] Core commands: help, whoami, ls, cat, cd, pwd, tree, clear, history, echo, date, uptime, lang
- [ ] /?cmd= deep-link execution on mount
- [ ] History persistence in localStorage
- [ ] Matrix theme only
- [ ] Mobile: dvh layout, visualViewport iOS fix, 44px touch targets, font-size 16px
- [ ] Keyboard shortcuts: Ctrl+C, Ctrl+L, Ctrl+A, Ctrl+E, Ctrl+K, Ctrl+U, Ctrl+W

**Exit criteria:**
- / renders terminal with TUI boot and prompt within 3s on simulated 3G
- ls -> directories; cd blog -> ls -> posts; cat [slug] -> post body renders
- lang pt -> status bar shows lang: pt; ls blog -> PT posts only
- /?cmd=cat+blog%2F[slug] executes command on load without user input
- VoiceOver (macOS): output area announces results; input gets focus on mount
- Mobile (iOS Safari): input stays above virtual keyboard; prompt row >= 44px
- Shift+Tab from input moves focus outside terminal (no keyboard trap)

---

### Milestone 3 — Search + filters + pager (Week 3)

- [ ] parseFlags utility
- [ ] globToRegex utility
- [ ] find command (full flags: -name, -tag, -lang, -after, -before)
- [ ] grep command with React element highlighting (mark elements, no raw HTML strings)
- [ ] head, tail (markdown-block semantics), wc
- [ ] Tab completion: command names only
- [ ] Pager mode: useVimMode, Pager.tsx, vim keybindings (j/k/d/u/g/G/q//)
- [ ] cat returns pager for posts > 30 blocks
- [ ] Command history with up/down arrows

**Exit criteria:**
- find blog -tag ai -lang en returns only EN posts tagged ai
- grep postgres highlights matches as React mark elements (DOM inspection shows mark tags, not innerHTML)
- head -3 [slug] returns first 3 markdown blocks (no frontmatter)
- Tab after partial command name completes or lists candidates
- cat [long-post] enters pager; j/k scrolls; / searches; q returns to prompt

---

### Milestone 4 — Themes (Week 4)

- [ ] Theme registry + CSS variable system
- [ ] Six visible themes (matrix, amber, nord, solarized, paper, synthwave)
- [ ] theme command: list/switch/next/random/reset
- [ ] useTheme hook: localStorage persistence + storage event cross-tab sync
- [ ] Status bar shows current theme
- [ ] 250ms fade transition, disabled under prefers-reduced-motion
- [ ] Anti-FOUC script + SHA-256 hash baked into _headers
- [ ] localStorage hardening: try/catch, versioned keys, counts cap
- [ ] WCAG AA contrast CI gate (Poku test, all 6 themes)
- [ ] Tab completion: path completion (cd, cat, head, tail, wc)
- [ ] axe-core CI on /, one post, /about

**Exit criteria:**
- All 6 themes render correctly with no FOUC on hard reload
- theme amber -> reload -> amber theme still active
- Poku WCAG contrast test passes for all 6 themes in CI
- axe-core: zero critical violations on tested pages
- Lighthouse a11y >= 95 on /blog and /about
- Terminal island <= 120 KB gzipped (size-limit passes in CI)

---

### Milestone 5 — Discovery + unlocks (Week 5)

- [ ] Unlocks module with condition functions
- [ ] Five hidden themes: sandwich, night, lazy, konami, hacker
- [ ] Konami code listener (useKonami)
- [ ] sudo make me a sandwich trigger
- [ ] uptime-3x tracking (localStorage, capped counts map)
- [ ] Achievement cascade (hacker requires 4 others first)
- [ ] Hacker theme Matrix rain canvas; fully disabled under prefers-reduced-motion (not slowed — disabled)
- [ ] Lock hints on locked theme attempts
- [ ] Found counter in status bar and neofetch
- [ ] WCAG contrast CI test extended to all 11 themes

**Exit criteria:**
- All 11 themes reachable via documented unlock paths
- theme konami before unlock -> hint shown; after code -> theme available
- found: X/11 increments on unlock and persists across reloads
- Matrix rain canvas absent from DOM under prefers-reduced-motion: reduce

---

### Milestone 6 — Personality + polish (Week 6+)

- [ ] Joke commands: sudo, rm -rf, vim (updated message), exit/quit/logout, cat .bashrc
- [ ] neofetch with full identity card (lang indicator, found counter, ASCII art)
- [ ] bio --copy copies to clipboard via Clipboard API
- [ ] resume command: renders resume.mdx as pager; --print opens /evandro-cv.pdf in new tab
- [ ] public/evandro-cv.pdf added
- [ ] PT translations of 2-3 posts (translationOf frontmatter set)
- [ ] Language switcher link on static blog post pages (links to PT/EN version if it exists)
- [ ] Per-post OG images (Satori, fonts bundled at build)
- [ ] Pagefind for static pages
- [ ] README.md: what this is, dev setup, how to add a post
- [ ] CONTRIBUTING.md: how to add a theme (with contrast check step), how to add a command
- [ ] Open-source the repo

**Exit criteria:**
- bio --copy -> clipboard contains press-kit bio text
- resume -> markdown CV renders in pager; resume --print -> PDF opens in new tab
- PT posts show read-in-English / ler-em-Portugues link on static page
- Satori OG exists for each post at /og/[slug].png (curl returns 200)
- size-limit passes
- All CI checks green on main

---

## 10. Conventions

### Code style

- TypeScript everywhere, strict mode on
- oxlint handles linting (see `oxlint.json`); oxfmt handles formatting
- Poku + poku ecosystem for pure command/core tests; `@pokujs/react` + happy-dom for React components
- Commit messages: conventional commits (feat:, fix:, docs:, chore:)
- One feature or fix per PR
- No framework-specific code in `src/terminal/commands/` or `src/terminal/core/` — pure TS

### Content style

Frontmatter required fields: `title`, `date`, `lang`, `tags`, `dek`. Everything else optional.

Writing rules:
- No em dashes in prose; use hyphens or commas
- No filler phrases
- Experience phrased as "over 10 years"
- No invented metrics or unapproved personal projects

### Theme authoring (4 steps)

1. Create `src/terminal/themes/styles/mytheme.css` with `[data-theme="mytheme"]` variable overrides
2. Add entry to `THEMES` in `src/terminal/themes/registry.ts`
3. If hidden: add unlock condition to `UNLOCKS` in `src/terminal/themes/unlocks.ts`
4. **Verify all foreground/background pairs pass WCAG AA** before opening a PR — the CI Poku contrast test will also catch failures

### Command authoring

One file in `src/terminal/commands/`:

```ts
import { defineCommand } from '../core/types';

export default defineCommand({
  name: 'myCommand',
  describe: 'what it does',
  run(args, ctx) {
    return { type: 'echo', text: 'hello' };
  },
  complete(partial, ctx) {
    return [];
  }
});
```

Register in `src/terminal/commands/index.ts`. Done.

---

## 11. Security

### Content Security Policy (`public/_headers`)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-<fouc-hash>'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

- `<fouc-hash>` is the SHA-256 of the anti-FOUC inline script, emitted by a build step
- `'unsafe-inline'` on `style-src` is a known concession for scoped component styles
- `connect-src 'none'` means no network egress from the terminal — update when analytics is added
- `frame-ancestors 'none'` prevents clickjacking
- `base-uri 'self'` prevents base tag injection
- `object-src 'none'` blocks Flash and plugins

### XSS prevention

- A `raw` HTML result type does not exist in the Result union
- `react/no-danger` is set to `"error"` in oxlint — React's unsafe HTML injection API is banned site-wide
- Post bodies are rendered via `react-markdown@^9` (outputs React elements, never HTML strings)
- Grep highlighting builds React `<mark>` elements, not string concatenation
- All JSX text node content is auto-escaped by React

---

## 12. Accessibility

Accessibility is a first-class requirement. Both the terminal and static pages must meet WCAG 2.1 AA.

### Terminal ARIA structure

```tsx
<div role="application" aria-label="evandro.dev terminal">
  <div
    role="log"
    aria-live="polite"
    aria-relevant="additions text"
    aria-label="terminal output"
  >
    {/* rendered command output */}
  </div>

  <input
    aria-label="terminal input"
    aria-autocomplete="list"
    aria-describedby="completion-hint"
    spellCheck={false}
    autoCapitalize="none"
    autoCorrect="off"
  />

  <div role="status" aria-live="polite" aria-label="shell status">
    {/* status bar */}
  </div>
</div>
```

- `role="application"` signals a keyboard-driven widget
- `role="log"` + `aria-live="polite"` announces each result without interrupting speech
- Error results must render inside a sibling element with `aria-live="assertive"`
- On mount, focus moves to the input automatically
- After every command execution, focus returns to the input

### Keyboard trap (WCAG 2.1.2)

`role="application"` absorbs all keyboard input. Users who Tab into the terminal must be able to exit:

- Shift+Tab from the terminal input moves focus to the first focusable element outside
- Esc when input is empty and pager is inactive blurs the terminal and moves focus to `<header>`

### Motion

Theme transitions and canvas must respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  [data-theme] { transition: none; }
}
```

The hacker theme's Matrix rain canvas is fully disabled — not slowed — under `prefers-reduced-motion: reduce`.

### Themes and contrast

Every theme must pass WCAG AA:
- Body text on background: **4.5:1 minimum**
- Large text and UI labels: **3:1 minimum**

This is a CI gate enforced by a Poku test. Themes that fail contrast do not merge.

### Static pages

- Landmark structure per page: `<header>`, `<nav>`, `<main>`, `<footer>`
- `<article>` wraps each blog post body
- Heading hierarchy is strictly linear — no skipping levels
- All images require meaningful `alt` text; decorative images use `alt=""`
- Skip-to-content link as first focusable element:

```html
<a href="#main-content" class="skip-link">Skip to content</a>
```

```css
.skip-link { position: absolute; top: -100%; }
.skip-link:focus { top: 0; }
```

### Testing accessibility

- `axe-core` via `@axe-core/playwright` on `/`, one blog post, and `/about` in CI
- Manually test the terminal with VoiceOver (macOS) before each milestone ships
- Lighthouse accessibility score target: >= 95 on all static pages

---

## 13. Mobile UX

### Layout

```css
.terminal {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal__log {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.terminal__input-row {
  flex-shrink: 0;
}
```

### iOS Safari — visualViewport

iOS overlays the keyboard rather than shrinking the viewport. Use the `visualViewport` API:

```ts
useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const handler = () => {
    const offset = window.innerHeight - vv.height - vv.offsetTop;
    document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
  };
  vv.addEventListener('resize', handler);
  vv.addEventListener('scroll', handler);
  return () => {
    vv.removeEventListener('resize', handler);
    vv.removeEventListener('scroll', handler);
  };
}, []);
```

```css
.terminal__input-row {
  padding-bottom: var(--keyboard-offset, 0px);
  transition: padding-bottom 120ms ease;
}
```

### Input visibility and touch targets

```ts
const onFocus = () => {
  inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
```

```css
.terminal__input { font-size: max(16px, 1em); }
```

```tsx
<div
  className="terminal__input-row"
  onClick={() => inputRef.current?.focus()}
  style={{ minHeight: '44px' }}
>
  <span className="prompt">~ $</span>
  <input ref={inputRef} onFocus={onFocus} />
</div>
```

---

## 14. Open questions resolved

| Question | Resolution |
|---|---|
| Bilingual routing | `lang` command; EN default; no server redirect |
| terminal.json delivery | Fetch + preload + content-hashed filename |
| Neofetch ASCII art | Placeholder in M2; custom design in M6 |
| Analytics | Cloudflare Web Analytics post-launch — no M1 blocker |
| Comments | giscus post-launch |
| Additional shells (DOS, REPL, SQL) | Post-launch |
| Accept-Language redirect | Not implemented; `lang` command is the mechanism |
| talks.views data source | Manually entered in frontmatter |
| Now page update cadence | Author-driven; no automated reminder in v1 |
| Empty projects/talks at launch | Acceptable; empty-state copy rendered |
| RSS feed structure | One per language: /rss/en.xml and /rss/pt.xml |
| History persistence | localStorage |
| Resume PDF strategy | public/evandro-cv.pdf, added in Milestone 6 |
| Deep-link behavior | /?cmd= executes on load |
| Initial terminal state | TUI boot: ASCII banner + prompt + "type help to get started" |

---

## 15. Repository hygiene

- `README.md`: what this is, dev setup (`pnpm install && pnpm dev`), how to add a post
- `CONTRIBUTING.md`: how to add a theme (4 steps including contrast check), how to add a command
- `LICENSE`: MIT
- `.gitignore`: `node_modules`, `dist`, `.astro`, `public/terminal.*.json`, `public/terminal.manifest.json`, `.env*`
- GitHub Actions: typecheck + lint + build + size-limit + axe-core on PRs; deploy on push to main
- Cloudflare Pages auto-deploys from main

### CI gates

- `pnpm run size-limit` — fails build if terminal island > 120 KB gzipped
- `test -f dist/terminal.a*.json` — fails build if fixture was not generated
- axe-core via `@axe-core/playwright` on `/`, one post, `/about`
- Poku WCAG contrast test on all 11 themes
- oxlint and oxfmt at exact pinned versions — no auto-upgrade in Renovate

---

## 16. References

Design inspiration:
- https://www.fellipe.com/
- https://felipefialho.com/
- https://zenorocha.com/
- https://www.jopcmelo.com/

Technical references:
- Astro docs: https://docs.astro.build
- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
- Astro i18n: https://docs.astro.build/en/guides/internationalization/
- React 19: https://react.dev
- Pagefind: https://pagefind.app
- oxlint: https://oxc.rs/docs/guide/usage/linter.html
- oxfmt: https://oxc.rs/docs/guide/usage/formatter.html
- Poku: https://poku.io
