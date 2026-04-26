# evandro.dev — Spec Resolution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the evandro.dev project spec to resolve all findings from the ARCH and SPEC agent reviews, incorporate Evan's decisions, and add the vim mode / keyboard navigation feature.

**Architecture:** All changes are to the spec document (`docs/spec.md`). No code is written in this plan. The spec is the source of truth before implementation begins.

**Decisions locked:**
1. Bilingual routing — `lang` command (Unix-style locale switch), EN default, no server redirect
2. terminal.json delivery — fetch + `<link rel="preload">` + content-hashed filename
3. Initial terminal state — TUI-style boot: ASCII art / banner + prompt + hint line
4. Deep-link — `/?cmd=cat+blog/slug` executes on load (Milestone 2)
5. Resume — renders markdown inline; `print` command opens PDF in new tab (Milestone 6)
6. History — localStorage persistence
7. Test runners — Poku + poku ecosystem packages (https://github.com/pokujs)
8. Tab completion — M3: command names only; M4: path completion
9. Vim mode — pager mode for long output + full keyboard navigation matrix

---

## Files

- Create: `docs/spec.md` — full updated spec (replaces the conversation document)

---

## Task 1 — Create spec file with meta header and non-goals

**Files:**
- Create: `docs/spec.md`

- [ ] Create `docs/spec.md` with the following header block:

```markdown
# evandro.dev — Project Specification

**Spec version:** 1.1
**Last updated:** 2026-04-23
**Status:** Design locked, ready to build.
**Owner:** Evandro Santos

---

## Non-goals

The following are explicitly out of scope:

- Real shell execution — no system calls, no file I/O, no network requests from commands
- User accounts, authentication, or any server-side state
- SSR at `/` — the terminal is a client-side React island only
- CMS or database — content lives in version-controlled markdown files
- Real-time collaboration or multiplayer
- Mobile app or PWA installation
- Support for IE or any browser without ES2022 support
```

- [ ] Commit: `docs: create spec file with version header and non-goals`

---

## Task 2 — About + defaults + contact (unchanged)

**Files:**
- Modify: `docs/spec.md`

- [ ] Append sections 0.1 (Defaults), 0.2 (Contact), and the About intro verbatim from the original spec.

- [ ] Commit: `docs: add about, defaults, and contact sections`

---

## Task 3 — Overview and success criteria

**Files:**
- Modify: `docs/spec.md`

- [ ] Append Section 1 (Overview) with updated success criteria. Add these to the existing list:

```markdown
- Terminal input stays visible above the virtual keyboard on iOS Safari and Android Chrome
- Prompt row touch target is >= 44px; input font-size is >= 16px to prevent auto-zoom
- `/?cmd=<command>` executes the command on load — terminal output is deep-linkable
- `lang <code>` switches the active language; content queries and status bar update immediately
- Long output (> 30 blocks) enters pager mode automatically; navigable with vim keybindings
- Lighthouse accessibility score >= 95 on all static pages, enforced in CI
- Terminal island bundle <= 120 KB gzipped, enforced in CI via size-limit
```

- [ ] Commit: `docs: update success criteria with mobile, deep-link, lang, and pager`

---

## Task 4 — Stack table

**Files:**
- Modify: `docs/spec.md`

- [ ] Append Section 2 (Stack) with the following table:

```markdown
## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Astro 5** | Static-first with islands, first-class MDX, good i18n |
| UI | **React 19** | Developer is fluent; ecosystem depth |
| Language | **TypeScript** | Strict mode across content + command layers |
| Content | **MDX + Astro Content Collections** | Typed frontmatter via Zod |
| Styling | **Vanilla CSS + custom properties** | Themes are CSS variable overrides |
| Search (static) | **Pagefind** | Build-time index, zero server |
| Feeds | **@astrojs/rss** | RSS + Atom feeds from content collections |
| OG images | **Satori** | Build-time per-post cards; fonts bundled, not fetched |
| Hosting | **Cloudflare Pages** | Free, edge-cached, `_headers` for CSP |
| Package manager | **pnpm** | Faster, less disk |
| Linter | **oxlint** | 50-100x faster than ESLint, 720+ rules. Pin exact version |
| Formatter | **oxfmt** | 30x faster than Prettier, 100% Prettier conformance. Pin exact version |
| Testing | **Poku + poku ecosystem** | Zero-overhead runner on Node built-in assert. Pure command/core layer. See https://github.com/pokujs |
| Component testing | **Vitest + happy-dom** | React component tests — Poku cannot test DOM |
| Bundle budget | **size-limit** | Terminal island <= 120 KB gzipped, enforced in CI |
| CI | **GitHub Actions** | Typecheck + lint + build + size-limit + axe-core on every PR |

### Pinning policy

`oxfmt` and `oxlint` are pinned to exact versions (no `^` or `~`).
Upgrades are manual and reviewed — beta formatting output changes produce large noisy diffs.

### react-markdown

Pin to `react-markdown@^9` explicitly. v8 does not support React 19.
Vet all transitive remark/rehype plugins before adding — one unmaintained plugin blocks upgrades.

### Hydration directive

The terminal island at `/` uses `client:load`. Not `client:idle` (causes prompt delay).
Not `client:visible` (terminal is the entire page).
```

- [ ] Commit: `docs: add stack section with pinning policy and test runner split`

---

## Task 5 — Architecture: terminal.json delivery and HMR

**Files:**
- Modify: `docs/spec.md`

- [ ] Append the terminal.json subsection to Section 3:

```markdown
### The content fixture

`scripts/build-fixture.ts` reads all content collections and emits
`public/terminal.<hash>.json`. The hash is SHA-256 of the content inputs, truncated to 8 chars.

A manifest file (`public/terminal.manifest.json`) maps `"current"` to the hashed filename:

    { "current": "terminal.a1b2c3d4.json" }

The terminal loads the manifest, then fetches the fixture. The hashed file uses:
`Cache-Control: public, max-age=31536000, immutable`

The Astro layout for `/` includes a preload hint:

    <link rel="preload" as="fetch" href="/terminal.manifest.json" crossorigin>

**Schema versioning:** `terminal.json` includes `"schemaVersion": 1` at the root.
`data/load.ts` hard-fails into degraded mode on version mismatch.
Incrementing the version is a deliberate act — treated like a DB migration.

**Dev HMR:** In development, `src/pages/terminal.json.ts` is a live Astro endpoint
that reads directly from content collections on every request. In production, the same
URL serves the static file. The terminal fetch code is identical in both environments.

**Scale ceiling:** 100-300 KB gzipped covers ~200-400 posts.
When the site approaches 150 posts, split the fixture:
- `terminal.index.<hash>.json` — metadata only (titles, slugs, dates, tags)
- `terminal.posts/<slug>.json` — per-post body, lazy loaded on `cat`

`ContentStore` exposes `async loadPost(slug: string): Promise<Post>` from day one,
returning from memory in v1. This paves the split without a rewrite.
```

- [ ] Commit: `docs: add terminal.json delivery, HMR fix, and schema versioning`

---

## Task 6 — Architecture: deep-link and noscript

**Files:**
- Modify: `docs/spec.md`

- [ ] Append the following subsections to Section 3:

```markdown
### Deep-link behavior

`/?cmd=cat+blog%2Fdebouncing` — the terminal reads the `cmd` query parameter on mount
and executes it after the fixture loads. The URL is not cleared after execution.

    const params = new URLSearchParams(window.location.search);
    const cmd = params.get('cmd');
    if (cmd) executeCommand(cmd);

### noscript fallback

The homepage noscript block provides meaningful content for crawlers:

    <noscript>
      <main>
        <h1>Evandro Santos — Senior Front-End / Full-Stack Engineer</h1>
        <p>Based in Brooklyn. React, TypeScript, Node.js. 10+ years.</p>
        <p><a href="/blog">Blog</a> · <a href="/projects">Projects</a> · <a href="/about">About</a></p>
      </main>
    </noscript>
```

- [ ] Commit: `docs: add deep-link and noscript fallback to architecture`

---

## Task 7 — Content model: bilingual routing and lang command

**Files:**
- Modify: `docs/spec.md`

- [ ] Append Section 4 (Content model). Replace bilingual handling block with:

```markdown
### Bilingual handling

**Language is a shell session variable, not a URL.**
The `lang` command switches the active language; ContentStore filters queries at runtime.

    ~ $ lang
    current: en | available: en, pt

    ~ $ lang pt
    language set to pt -- content queries now return Portuguese posts

    ~ $ lang en
    language set to en

Status bar updates immediately: `shell: unix · theme: amber · lang: pt · found: 6/11`

**Static pages** use URL-based locale: `/en/blog/slug` and `/pt/blog/slug`.
`/blog/slug` redirects to `/en/blog/slug` via Cloudflare `_redirects`.

**hreflang tags** on every bilingual static page:

    <link rel="alternate" hreflang="en"        href="https://evandro.dev/en/blog/slug" />
    <link rel="alternate" hreflang="pt"        href="https://evandro.dev/pt/blog/slug" />
    <link rel="alternate" hreflang="x-default" href="https://evandro.dev/en/blog/slug" />

**Graceful fallback:** `cat missing-post` in PT falls back to EN with a notice:

    note: no Portuguese version -- showing original (en)

**RSS feeds:** `/rss/en.xml` and `/rss/pt.xml` — one per language.
```

- [ ] Commit: `docs: update bilingual handling to lang command with hreflang and per-language RSS`

---

## Task 8 — Theme system: FOUC fix, CSP, localStorage hardening

**Files:**
- Modify: `docs/spec.md`

- [ ] Append the following additions to Section 5 (Theme system):

```markdown
### Anti-FOUC

A small blocking inline script in `<head>` sets `data-theme` before first paint:

    (function(){
      var t = localStorage.getItem('evandro.theme');
      if (t) document.documentElement.dataset.theme = t;
    })();

This script is byte-stable across builds. Its SHA-256 hash is emitted into `_headers`:

    Content-Security-Policy: script-src 'self' 'sha256-<anti-fouc-hash>';

This is the only inline script on the site.

### localStorage hardening

All storage access uses safe wrappers (try/catch for Safari private mode compatibility).
State keys are versioned: `evandro.state.v1`. On version mismatch, reset to defaults.
`evandro.counts` is capped at 50 keys — oldest evicted when cap is reached.
Listen to the `storage` event to sync theme changes across open tabs.

### WCAG contrast in CI

A Poku test loads each theme's CSS, resolves `--fg` / `--bg` / `--accent`, and asserts
contrast ratios meet WCAG AA (4.5:1 body, 3:1 large text). CI gate — fails on violation.
```

- [ ] Commit: `docs: add FOUC fix, CSP hash strategy, and localStorage hardening to themes`

---

## Task 9 — Command system: updated Result union and Context

**Files:**
- Modify: `docs/spec.md`

- [ ] Replace the core types block in Section 6 with:

```markdown
### The core types

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

Notes:
- `run` may return `Promise<Result>` for async commands
- `{ type: 'clear' }` signals the shell to empty the log; not rendered
- `{ type: 'navigate' }` triggers client-side routing or window.open
- `{ type: 'pager' }` activates vim pager mode; triggered automatically for output > 30 blocks
- `exitCode` defaults to 0; explicitly 1 on error
- `stdin` removed from Context — pipes are not in v1
- `{ type: 'raw' }` does not exist — React's unsafe HTML injection API is banned site-wide
```

- [ ] Commit: `docs: update Result union with clear, navigate, pager, exitCode, and async run`

---

## Task 10 — Command system: lang and resume commands

**Files:**
- Modify: `docs/spec.md`

- [ ] Add `lang` and updated `resume` to the day-one command table in Section 6:

```
| lang [code]  | Show current language or switch to en/pt. Persists to localStorage. Updates status bar and ContentStore filter immediately. |
| resume       | Renders CV markdown inline as pager. `resume --print` opens /evandro-cv.pdf in new tab. |
```

- [ ] Add the following `resume` behavior note:

```markdown
#### resume command

`resume` returns `{ type: 'pager', blocks: [...], title: 'Resume' }` from `src/content/resume.mdx`.
`resume --print` returns `{ type: 'navigate', href: '/evandro-cv.pdf', target: '_blank' }`.
The PDF at `public/evandro-cv.pdf` is added in Milestone 6.
```

- [ ] Commit: `docs: add lang command and resume pager+print behavior`

---

## Task 11 — Vim mode and keyboard navigation (new section)

**Files:**
- Modify: `docs/spec.md`

- [ ] Insert new Section 7 (Vim mode and keyboard navigation):

```markdown
## 7. Vim mode and keyboard navigation

### Pager mode

When a command returns `{ type: 'pager', blocks, title }`, the terminal enters pager mode --
a vim-like read-only navigator for long output (post bodies, career timelines, uses page).

Pager mode activates automatically when output exceeds 30 markdown blocks.
`cat` always returns `pager` for posts. `career`, `uses`, and `now` may also return `pager`.

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

### vim joke command (updated)

The existing joke `vim` is updated now that pager mode exists:

    ~ $ vim debouncing.mdx
    opening debouncing.mdx in vim...
    [no seriously, use: cat debouncing.mdx]

### useVimMode hook

`src/terminal/hooks/useVimMode.ts` manages pager state:

    interface VimModeState {
      active:      boolean;
      blocks:      MarkdownBlock[];
      title:       string;
      currentLine: number;
      searchQuery: string;
      searchIndex: number;
    }

Listens to `keydown` only when pager is active. Returns focus to input on `q` or `Esc`.

### Files added for this feature

- `src/terminal/hooks/useVimMode.ts` — pager state machine
- `src/terminal/components/Pager.tsx` — renders pager view, handles vim keys
- `src/terminal/commands/lang.ts` — lang command
- Update `src/terminal/components/Log.tsx` — dispatch `pager` type to `Pager`
- Update `src/terminal/commands/cat.ts` — return `pager` for posts > 30 blocks
- Update `src/terminal/Shell.tsx` — forward keyboard events to useVimMode when active
```

- [ ] Commit: `docs: add vim pager mode and keyboard navigation section`

---

## Task 12 — Updated directory structure

**Files:**
- Modify: `docs/spec.md`

- [ ] Append Section 8 (Directory structure — renumbered from 7) with delta vs original:

```markdown
### Changes vs original spec

New files:
- `src/terminal/hooks/useVimMode.ts`
- `src/terminal/components/Pager.tsx`
- `src/terminal/commands/lang.ts`
- `src/content/resume.mdx`
- `public/terminal.manifest.json`
- `public/evandro-cv.pdf` (Milestone 6)

Renamed/replaced:
- `biome.json` -> `oxlint.json`

Updated `package.json` scripts:
    "predev":     "tsx scripts/build-fixture.ts",
    "prebuild":   "tsx scripts/build-fixture.ts",
    "dev":        "astro dev",
    "build":      "astro build",
    "preview":    "astro preview",
    "size-limit": "size-limit"
```

- [ ] Commit: `docs: update directory structure with new files and revised scripts`

---

## Task 13 — Updated build plan with specific exit criteria

**Files:**
- Modify: `docs/spec.md`

- [ ] Append Section 9 (Build plan — renumbered from 8):

```markdown
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
- `curl https://evandro.dev/en/blog/[slug]` contains hreflang alternate links
- Lighthouse performance >= 90 on /blog (mobile)
- No noindex meta on any page

---

### Milestone 2 — Terminal skeleton (Week 2)

- [ ] Shell.tsx with input, log, status bar, full ARIA structure
- [ ] ARIA: role="application", role="log" aria-live="polite", role="status", keyboard trap escape (Shift+Tab out, Esc to blur)
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
- ls -> directories; cd blog -> ls -> posts; cat [slug] -> post body in pager
- lang pt -> status bar shows lang: pt; ls blog -> PT posts only
- /?cmd=cat+blog%2F[slug] executes command on load without user input
- VoiceOver (macOS): output area announces results; input gets focus on mount
- Mobile: input stays above virtual keyboard; prompt row >= 44px touch target
- Shift+Tab from input moves focus outside terminal (no keyboard trap)

---

### Milestone 3 — Search + filters + pager (Week 3)

- [ ] parseFlags utility
- [ ] globToRegex utility
- [ ] find command (full flags: -name, -tag, -lang, -after, -before)
- [ ] grep command with React element highlighting (mark elements, no raw HTML)
- [ ] head, tail (markdown-block semantics), wc
- [ ] Tab completion: command names only
- [ ] Pager mode: useVimMode, Pager.tsx, vim keybindings (j/k/d/u/g/G/q//)
- [ ] cat returns pager for posts > 30 blocks
- [ ] Command history with up/down arrows

**Exit criteria:**
- find blog -tag ai -lang en returns only EN posts tagged ai
- grep postgres highlights matches as React mark elements (DOM inspection: no innerHTML)
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
- Terminal island <= 120 KB gzipped (size-limit passes)

---

### Milestone 5 — Discovery + unlocks (Week 5)

- [ ] Unlocks module with condition functions
- [ ] Five hidden themes: sandwich, night, lazy, konami, hacker
- [ ] Konami code listener (useKonami)
- [ ] sudo make me a sandwich trigger
- [ ] uptime-3x tracking (localStorage, capped map)
- [ ] Achievement cascade (hacker requires 4 others)
- [ ] Hacker theme Matrix rain canvas; fully disabled under prefers-reduced-motion
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

- [ ] Joke commands: sudo, rm -rf, vim (updated), exit/quit/logout, cat .bashrc
- [ ] neofetch with full identity card (lang indicator, found counter, ASCII art)
- [ ] bio --copy copies to clipboard via Clipboard API
- [ ] resume command: renders resume.mdx as pager; --print opens /evandro-cv.pdf
- [ ] public/evandro-cv.pdf added
- [ ] PT translations of 2-3 posts (translationOf frontmatter set)
- [ ] Language switcher link on static blog post pages
- [ ] Per-post OG images (Satori, fonts bundled at build)
- [ ] Pagefind for static pages
- [ ] README.md: what this is, dev setup, how to add a post
- [ ] CONTRIBUTING.md: how to add a theme (with contrast check step), how to add a command
- [ ] Open-source the repo

**Exit criteria:**
- bio --copy -> clipboard contains press-kit bio
- resume -> markdown CV in pager; resume --print -> PDF opens in new tab
- PT posts show read-in-English / ler-em-Portugues link on static page
- Satori OG exists for each post at /og/[slug].png (curl returns 200)
- size-limit passes
- All CI checks green on main
```

- [ ] Commit: `docs: add updated build plan with specific exit criteria per milestone`

---

## Task 14 — Conventions, security, accessibility, mobile

**Files:**
- Modify: `docs/spec.md`

- [ ] Append Section 10 (Conventions) with updated theme authoring:

```markdown
### Theme authoring (updated — 4 steps)

1. Create `src/terminal/themes/styles/mytheme.css` with `[data-theme="mytheme"]` variable overrides
2. Add entry to `THEMES` in `src/terminal/themes/registry.ts`
3. If hidden: add unlock condition to `UNLOCKS`
4. Verify all foreground/background pairs pass WCAG AA before opening a PR (CI also catches failures)
```

- [ ] Append Section 11 (Security):

```markdown
## 11. Security

### Content Security Policy (public/_headers)

    /*
      Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-<fouc-hash>'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';
      X-Content-Type-Options: nosniff
      X-Frame-Options: DENY
      Referrer-Policy: strict-origin-when-cross-origin

`'unsafe-inline'` on `style-src` is a known concession for scoped styles.
`connect-src 'none'` means no network egress from the terminal -- update if analytics is added.

### XSS prevention

- `{ type: 'raw' }` does not exist in the Result union
- `react/no-danger` set to `"error"` in oxlint -- React's unsafe HTML injection API is banned
- Post bodies rendered via `react-markdown@^9` (React elements, never HTML strings)
- Grep highlighting uses React mark elements, not string concatenation
- All JSX text node content is auto-escaped by React
```

- [ ] Append Section 12 (Accessibility) — full content from the accessibility conversation, plus:

```markdown
### Keyboard trap (WCAG 2.1.2)

`role="application"` absorbs all keyboard input. Users who Tab into the terminal must be
able to Tab back out:

- Shift+Tab from the terminal input moves focus to the first focusable element outside
- Esc when input is empty and pager is inactive blurs the terminal and moves focus to <header>
- Document this in the terminal's aria-description or a visually-hidden help element
```

- [ ] Append Section 13 (Mobile UX) — full content from the mobile conversation.

- [ ] Commit: `docs: add conventions update, security, accessibility, and mobile sections`

---

## Task 15 — Open questions resolved and repository hygiene

**Files:**
- Modify: `docs/spec.md`

- [ ] Append Section 14 (Open questions resolved):

```markdown
## 14. Open questions resolved

| Question | Resolution |
|---|---|
| Bilingual routing | `lang` command; EN default; no server redirect |
| terminal.json delivery | Fetch + preload + content-hashed filename |
| Neofetch ASCII art | Placeholder in M2; custom design in M6 |
| Analytics | Cloudflare Web Analytics post-launch -- no M1 blocker |
| Comments | giscus post-launch |
| Additional shells | Post-launch |
| Accept-Language redirect | Not implemented; `lang` command is the mechanism |
| talks.views data source | Manually entered in frontmatter |
| Now page update cadence | Author-driven; no automated reminder in v1 |
| Empty projects/talks at launch | Acceptable; empty-state copy rendered |
| RSS feed structure | One per language: /rss/en.xml and /rss/pt.xml |
| History persistence | localStorage |
| resume PDF strategy | public/evandro-cv.pdf, added in Milestone 6 |
```

- [ ] Append Section 15 (Repository hygiene) with CI additions:

```markdown
### CI additions

- `pnpm run size-limit` -- fails build if terminal island > 120 KB gzipped
- `test -f dist/terminal.json` -- fails build if fixture was not generated
- axe-core via @axe-core/playwright on /, one post, /about
- Poku WCAG contrast test on all 11 themes
- oxlint and oxfmt at exact pinned versions -- no auto-upgrade in Renovate
```

- [ ] Commit: `docs: resolve all open questions and add CI gates to repo hygiene`

---

## Self-Review

**ARCH blocking issues:**
- [x] CSP vs anti-FOUC -> hash-based CSP (Task 8 + Task 14)
- [x] HMR for terminal.json -> dev endpoint (Task 5)
- [x] stdin removed from Context (Task 9)
- [x] Bilingual routing -> lang command (Task 7)
- [x] Schema versioning on terminal.json (Task 5)
- [x] Terminal keybindings matrix (Task 11)
- [x] Poku + Vitest story (Task 4)
- [x] Result union gaps: clear, navigate, exitCode, Promise<Result>, error.code (Task 9)
- [x] hreflang alternate links (Task 7)
- [x] size-limit budget in CI (Task 4 + Task 15)

**SPEC blocking issues:**
- [x] ARIA moved to Milestone 2 (Task 13)
- [x] Exit criteria specific and testable per milestone (Task 13)
- [x] Mobile smoke test in Milestone 2 exit criteria (Task 13)
- [x] History persistence defined (Task 15)
- [x] Deep-link in Milestone 2 (Task 13)
- [x] Tab completion scope bounded (Task 13)
- [x] Keyboard trap WCAG 2.1.2 (Task 14)
- [x] WCAG CI gate in Milestone 4 (Task 13)
- [x] Resume PDF strategy defined (Task 10 + Task 13)
- [x] All open questions resolved (Task 15)

**Evan's new decisions:**
- [x] lang command (Task 7 + Task 10)
- [x] Vim pager mode (Task 11)
- [x] Full keyboard navigation matrix (Task 11)
- [x] TUI boot / initial state (Task 13 M2 exit criteria)
- [x] Deep-link fun (Task 6)
- [x] Resume markdown + print (Task 10)

**No placeholders:** every task has concrete content.
**No duplicate sections:** each task appends a distinct section.
