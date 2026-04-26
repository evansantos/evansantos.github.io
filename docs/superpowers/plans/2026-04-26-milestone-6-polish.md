# Milestone 6 — Personality + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add personality (joke commands, full neofetch identity card), `bio` and `resume` commands, a CI bundle-size gate, and minimal contributor docs — completing evandro.dev's terminal experience for launch.

**Architecture:** Each joke is a tiny, isolated `Command` module exported from `commands/index.ts`; `cat .bashrc` is handled inside the existing `cat` command (no new command, since `.bashrc` is not a real fixture). `neofetch` upgrades from a stub to a context-aware command that reads `ShellState` for live `lang/theme/found` values. `bio` and `resume` follow the established Result-union pattern (`echo` and `pager`/`navigate` respectively). `size-limit` is wired as a CI step that gates the built `_astro/*.js` bundle. No new runtime deps; one devDep (`size-limit` + its file preset).

**Tech Stack:** Astro 5 · React 19 · TypeScript strict · Poku (test runner) · `size-limit` (new devDep, CI-only)

---

## Success Criteria (verifiable)

1. `vim`, `nano`, `emacs`, `exit`, `quit`, `logout`, `rm`, and `cat .bashrc` all return the in-character joke results from the spec.
2. `neofetch` returns a fully populated `NeofetchData` object (name, title, location, lang, theme, found "N/11", uptime "N years", shell "evandosh 1.0").
3. `bio` returns echo with the bio text. `bio --copy` returns echo and invokes `navigator.clipboard.writeText(bioText)` exactly once.
4. `resume` returns `{ type: 'pager', title: 'Resume' }` with parsed markdown blocks. `resume --print` returns `{ type: 'navigate', href: '/evandro-cv.pdf', target: '_blank' }`.
5. `public/evandro-cv.pdf` exists.
6. `pnpm size-limit` runs locally and in CI; current `Terminal island` budget is **120 KB gzip**.
7. `README.md` and `CONTRIBUTING.md` exist at repo root with the sections listed below.
8. None of the new joke commands appear in `help` output.
9. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:a11y`, `pnpm build`, `pnpm size-limit` all pass.

---

## File Map

### New files (16)

| Path | Purpose |
|---|---|
| `src/terminal/commands/rm.ts` | `rm` joke command |
| `src/terminal/commands/vim.ts` | `vim` joke command |
| `src/terminal/commands/nano.ts` | `nano` joke command |
| `src/terminal/commands/emacs.ts` | `emacs` joke command |
| `src/terminal/commands/exit.ts` | `exit` joke command |
| `src/terminal/commands/quit.ts` | `quit` joke command (re-exports exit) |
| `src/terminal/commands/logout.ts` | `logout` joke command (re-exports exit) |
| `src/terminal/commands/neofetch.ts` | identity-card command |
| `src/terminal/commands/bio.ts` | bio + --copy clipboard |
| `src/terminal/commands/resume.ts` | resume pager + --print PDF |
| `src/terminal/data/bio.ts` | press-kit bio text constant |
| `tests/unit/commands/jokes.test.ts` | covers rm, vim/nano/emacs, exit/quit/logout, cat .bashrc |
| `tests/unit/commands/neofetch.test.ts` | identity-card field assertions |
| `tests/unit/commands/bio.test.ts` | echo + clipboard side-effect spy |
| `tests/unit/commands/resume.test.ts` | pager + --print navigate |
| `public/evandro-cv.pdf` | placeholder PDF (1-page stub) |
| `README.md` | repo overview + dev setup + add-a-post |
| `CONTRIBUTING.md` | how to add a theme + how to add a command |

### Modified files (3)

| Path | Change |
|---|---|
| `src/terminal/commands/index.ts` | register the 10 new commands |
| `src/terminal/commands/cat.ts` | special-case `.bashrc` (returns the fake-aliases echo) |
| `package.json` | add `size-limit` devDep + script + config block |
| `.github/workflows/ci.yml` | add `pnpm size-limit` step after Build |

(Note: `cat.ts` is the only modification to an existing command. The joke commands are pure additions.)

### Out of scope (deferred)

- PT translations of posts
- Per-page language switcher on static pages
- Per-post OG images (Satori)
- Pagefind static search

---

## Task Sequence (TDD, one commit per task)

### Task 1 — Joke commands (rm, vim/nano/emacs, exit/quit/logout, cat .bashrc)

These are tiny and independent — bundle them into one task with one test file.

#### 1.1 — RED: write `tests/unit/commands/jokes.test.ts`

- [ ] Create `tests/unit/commands/jokes.test.ts` with the contents below. Run `pnpm test tests/unit/commands/jokes.test.ts` — it MUST fail (modules do not exist yet).

```ts
import { assert } from 'poku';
import rm     from '../../../src/terminal/commands/rm.js';
import vim    from '../../../src/terminal/commands/vim.js';
import nano   from '../../../src/terminal/commands/nano.js';
import emacs  from '../../../src/terminal/commands/emacs.js';
import exit   from '../../../src/terminal/commands/exit.js';
import quit   from '../../../src/terminal/commands/quit.js';
import logout from '../../../src/terminal/commands/logout.js';
import cat    from '../../../src/terminal/commands/cat.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-26T00:00:00.000Z',
  posts: [], projects: [], talks: [],
  uses: { body: '' },
  now:  { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: () => {},
};

// ─── rm ──────────────────────────────────────────────────────────────────────
const rmRes = await Promise.resolve(rm.run(['-rf', '/'], ctx));
assert.strictEqual(rmRes.type, 'error', 'rm returns error');
if (rmRes.type === 'error') {
  assert.ok(/operation not permitted/i.test(rmRes.text), 'rm denies politely');
  assert.ok(/all I have/i.test(rmRes.text),               'rm includes signature line');
}

// ─── vim / nano / emacs ──────────────────────────────────────────────────────
for (const editor of [vim, nano, emacs]) {
  const r = await Promise.resolve(editor.run([], ctx));
  assert.strictEqual(r.type, 'echo', `${editor.name} returns echo`);
  if (r.type === 'echo') {
    assert.ok(r.text.includes(editor.name),     `${editor.name} mentions itself`);
    assert.ok(/use:\s+cat/i.test(r.text),       `${editor.name} hints at cat`);
  }
}

// ─── exit / quit / logout ────────────────────────────────────────────────────
for (const cmd of [exit, quit, logout]) {
  const r = await Promise.resolve(cmd.run([], ctx));
  assert.strictEqual(r.type, 'echo', `${cmd.name} returns echo`);
  if (r.type === 'echo') {
    assert.ok(/no exit/i.test(r.text), `${cmd.name} replies with no-exit line`);
    assert.ok(r.text.includes('~'),    `${cmd.name} mentions ~`);
  }
}

// ─── cat .bashrc ─────────────────────────────────────────────────────────────
const bashrc = await cat.run(['.bashrc'], ctx);
assert.strictEqual(bashrc.type, 'echo', 'cat .bashrc returns echo (not error)');
if (bashrc.type === 'echo') {
  assert.ok(/alias/i.test(bashrc.text), 'cat .bashrc shows aliases');
}

console.log('commands/jokes: all tests passed');
```

#### 1.2 — GREEN: create the seven joke command files

- [ ] `src/terminal/commands/rm.ts`:

```ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'rm',
  describe: 'remove files',
  run() {
    return {
      type: 'error',
      text: 'rm: operation not permitted — this site is all I have',
      exitCode: 1,
    };
  },
});
```

- [ ] `src/terminal/commands/vim.ts`:

```ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'vim',
  describe: 'open vim',
  run() {
    return {
      type: 'echo',
      text: 'opening vim in vim... [no seriously, use: cat <file>]',
    };
  },
});
```

- [ ] `src/terminal/commands/nano.ts` — same shape, replace `vim` with `nano`.
- [ ] `src/terminal/commands/emacs.ts` — same shape, replace `vim` with `emacs`.

- [ ] `src/terminal/commands/exit.ts`:

```ts
import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'exit',
  describe: 'exit shell',
  run() {
    return { type: 'echo', text: 'there is no exit. only ~' };
  },
});
```

- [ ] `src/terminal/commands/quit.ts`:

```ts
import { defineCommand } from '../core/types.js';
import exit from './exit.js';

export default defineCommand({
  ...exit,
  name: 'quit',
});
```

- [ ] `src/terminal/commands/logout.ts`:

```ts
import { defineCommand } from '../core/types.js';
import exit from './exit.js';

export default defineCommand({
  ...exit,
  name: 'logout',
});
```

#### 1.3 — Special-case `cat .bashrc`

- [ ] In `src/terminal/commands/cat.ts`, add this branch immediately after the `if (!target)` guard, **before** any blog/post handling:

```ts
if (target === '.bashrc') {
  return {
    type: 'echo',
    text: [
      '# ~/.bashrc — evandro',
      "alias please='sudo'",
      "alias yolo='git push --force'",
      "alias k='kubectl'",
      "alias serve='python3 -m http.server'",
      "alias ohno='git reflog'",
      "alias tldr='cat'",
      'export EDITOR=cat   # see also: vim, nano, emacs',
    ].join('\n'),
  };
}
```

#### 1.4 — Register in `commands/index.ts`

- [ ] Add the imports and append to `cmdList` (preserve existing order, add new commands at the end so they don't reshuffle the existing layout):

```ts
import rm       from './rm.js';
import vim      from './vim.js';
import nano     from './nano.js';
import emacs    from './emacs.js';
import exit     from './exit.js';
import quit     from './quit.js';
import logout   from './logout.js';
```

Then append to `cmdList`:
```ts
const cmdList: Command[] = [
  help, whoami, pwd, date, echo, clear, uptime, lang, history,
  cd, ls, tree, cat,
  grep, find, head, tail, wc,
  now, about, contact, rss,
  theme,
  // jokes (intentionally excluded from help output)
  rm, vim, nano, emacs, exit, quit, logout,
];
```

#### 1.5 — Verify

- [ ] `pnpm test tests/unit/commands/jokes.test.ts` — MUST pass.
- [ ] `pnpm test tests/unit/commands/cat.test.ts` — MUST still pass (no regressions in existing cat behavior).
- [ ] `pnpm test tests/unit/commands/help.test.ts` — MUST still pass; verify `help` output does NOT contain `vim`, `nano`, `emacs`, `exit`, `rm`. (The test already doesn't assert their absence; visually inspect once.)
- [ ] `pnpm typecheck` and `pnpm lint` — green.
- [ ] **Commit:** `feat(terminal): add joke commands (rm, editors, exit family, .bashrc)`

---

### Task 2 — `neofetch` full identity card

#### 2.1 — RED: `tests/unit/commands/neofetch.test.ts`

- [ ] Create:

```ts
import { assert } from 'poku';
import neofetch from '../../../src/terminal/commands/neofetch.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'pt', theme: 'amber', found: 3, degraded: false },
  setState: () => {},
};

const r = await Promise.resolve(neofetch.run([], ctx));
assert.strictEqual(r.type, 'neofetch', 'returns neofetch result');
if (r.type === 'neofetch') {
  const d = r.data;
  assert.strictEqual(d.name,     'evandro santos',         'name');
  assert.ok(d.title.length > 0,                            'title set');
  assert.strictEqual(d.location, 'Brooklyn, NYC',          'location');
  assert.strictEqual(d.lang,     'pt',                     'lang reflects state');
  assert.strictEqual(d.theme,    'amber',                  'theme reflects state');
  assert.strictEqual(d.found,    '3/11',                   'found counter');
  assert.strictEqual(d.shell,    'evandosh 1.0',           'shell label');
  assert.ok(/year/i.test(d.uptime),                        'uptime mentions years');
}

console.log('commands/neofetch: all tests passed');
```

- [ ] Run — MUST fail (file doesn't exist yet).

#### 2.2 — GREEN: `src/terminal/commands/neofetch.ts`

- [ ] Create:

```ts
import { defineCommand } from '../core/types.js';

const LAUNCH_YEAR = 2014;

export default defineCommand({
  name:     'neofetch',
  describe: 'identity card',
  run(_args, ctx) {
    const years = new Date().getFullYear() - LAUNCH_YEAR;
    return {
      type: 'neofetch',
      data: {
        name:     'evandro santos',
        title:    'Senior Front-End / Full-Stack Engineer',
        location: 'Brooklyn, NYC',
        lang:     ctx.state.lang,
        theme:    ctx.state.theme,
        found:    `${ctx.state.found}/11`,
        uptime:   `${years} year${years === 1 ? '' : 's'} (since ${LAUNCH_YEAR})`,
        shell:    'evandosh 1.0',
      },
    };
  },
});
```

#### 2.3 — Register and render

- [ ] Add `import neofetch from './neofetch.js';` to `src/terminal/commands/index.ts` and include it in `cmdList` (insert next to other identity commands like `whoami`).
- [ ] In `src/terminal/components/Log.tsx`, replace the `case 'neofetch': return null;` line with a real renderer. Add a new `Neofetch.tsx` component or render inline:

```tsx
case 'neofetch': {
  const d = result.data;
  const ascii = [
    '   ___       ',
    '  / _ \\__   ',
    ' | |/ \\ \\  ',
    '  \\___/_/   ',
  ];
  return (
    <pre className="terminal__neofetch">
      {ascii.map((line, i) => {
        const fields = [
          `${d.name}`,
          `─────────────`,
          `title:    ${d.title}`,
          `location: ${d.location}`,
          `lang:     ${d.lang}`,
          `theme:    ${d.theme}`,
          `found:    ${d.found}`,
          `uptime:   ${d.uptime}`,
          `shell:    ${d.shell}`,
        ];
        return `${line.padEnd(16, ' ')}${fields[i] ?? ''}\n`;
      }).join('')}
    </pre>
  );
}
```

Note: the ASCII has 4 lines but there are 9 fields — render the full identity card by switching to a two-section approach. Use this simpler version instead:

```tsx
case 'neofetch': {
  const d = result.data;
  const text = [
    '  ___    ',
    ' / _ \\__ ',
    '| |/ \\ \\',
    ' \\___/_/ ',
    '',
    `${d.name}`,
    `─────────────`,
    `title:    ${d.title}`,
    `location: ${d.location}`,
    `lang:     ${d.lang}`,
    `theme:    ${d.theme}`,
    `found:    ${d.found}`,
    `uptime:   ${d.uptime}`,
    `shell:    ${d.shell}`,
  ].join('\n');
  return <pre className="terminal__neofetch" aria-label="identity card">{text}</pre>;
}
```

(Worker note: the ASCII art is intentionally minimal; refine later. The plan focuses on field correctness, not glyph polish.)

#### 2.4 — Verify

- [ ] `pnpm test tests/unit/commands/neofetch.test.ts` — passes.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:a11y` — all green.
- [ ] **Commit:** `feat(terminal): neofetch returns full identity card`

---

### Task 3 — `bio` command + `--copy` clipboard side-effect

#### 3.1 — Create the bio data module

- [ ] `src/terminal/data/bio.ts`:

```ts
export const BIO_TEXT = [
  'Evandro Santos — Senior Front-End / Full-Stack Engineer based in Brooklyn, NYC.',
  '10+ years building product. Currently focused on AI/LLM systems, spec-driven',
  'development, and tooling that makes engineering teams faster. React, TypeScript,',
  'Node.js, AWS. Brazilian, NYC-based, available for senior IC and tech-lead roles.',
  '',
  'Contact: evan.its.me@gmail.com · github.com/evansantos',
].join('\n');
```

#### 3.2 — RED: `tests/unit/commands/bio.test.ts`

- [ ] Create:

```ts
import { assert } from 'poku';
import bio from '../../../src/terminal/commands/bio.js';
import { BIO_TEXT } from '../../../src/terminal/data/bio.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: () => {},
};

// plain bio
const r1 = await Promise.resolve(bio.run([], ctx));
assert.strictEqual(r1.type, 'echo', 'bio returns echo');
if (r1.type === 'echo') {
  assert.strictEqual(r1.text, BIO_TEXT, 'bio returns the canonical bio text');
}

// bio --copy: spy on navigator.clipboard.writeText
let copied: string | null = null;
const originalNav = (globalThis as any).navigator;
(globalThis as any).navigator = {
  clipboard: {
    writeText: async (s: string) => { copied = s; },
  },
};

try {
  const r2 = await Promise.resolve(bio.run(['--copy'], ctx));
  assert.strictEqual(r2.type, 'echo', '--copy returns echo');
  if (r2.type === 'echo') {
    assert.ok(/copied/i.test(r2.text), '--copy result mentions copied');
  }
  // Microtask flush
  await Promise.resolve();
  assert.strictEqual(copied, BIO_TEXT, 'clipboard received the bio text');
} finally {
  (globalThis as any).navigator = originalNav;
}

console.log('commands/bio: all tests passed');
```

- [ ] Run — MUST fail.

#### 3.3 — GREEN: `src/terminal/commands/bio.ts`

- [ ] Create:

```ts
import { defineCommand } from '../core/types.js';
import { BIO_TEXT } from '../data/bio.js';

export default defineCommand({
  name:     'bio',
  describe: 'short press-kit bio',
  run(args) {
    if (args.includes('--copy')) {
      // Side effect: fire-and-forget. We don't await so the Result returns immediately;
      // the test flushes one microtask to observe the call.
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(BIO_TEXT);
      }
      return { type: 'echo', text: 'copied to clipboard.' };
    }
    return { type: 'echo', text: BIO_TEXT };
  },
});
```

#### 3.4 — Register

- [ ] Add `import bio from './bio.js';` to `src/terminal/commands/index.ts` and include in `cmdList`.
- [ ] Add `bio` to the help text in `src/terminal/commands/help.ts` (e.g. between `contact` and `rss`):
  ```
  '  bio [--copy]      short press-kit bio (--copy to clipboard)',
  ```

#### 3.5 — Verify

- [ ] `pnpm test tests/unit/commands/bio.test.ts` — passes.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` — green.
- [ ] **Commit:** `feat(terminal): add bio command with --copy clipboard support`

---

### Task 4 — `resume` command + `--print` PDF navigate

#### 4.1 — RED: `tests/unit/commands/resume.test.ts`

- [ ] Create:

```ts
import { assert } from 'poku';
import resume from '../../../src/terminal/commands/resume.js';
import type { Context, ContentFixture } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const fixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-26T00:00:00.000Z',
  posts: [], projects: [], talks: [],
  uses: { body: '' },
  now:  { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '# Evandro Santos\n\nSenior Engineer\n\n## Experience\n\nCox Enterprises — 2023-Present' },
};

const ctx: Context = {
  store:    new Store(fixture),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  setState: () => {},
};

// resume → pager
const r1 = await Promise.resolve(resume.run([], ctx));
assert.strictEqual(r1.type, 'pager', 'resume returns pager');
if (r1.type === 'pager') {
  assert.strictEqual(r1.title, 'Resume', 'pager titled "Resume"');
  assert.ok(r1.blocks.length > 0, 'parsed at least one block');
}

// resume --print → navigate
const r2 = await Promise.resolve(resume.run(['--print'], ctx));
assert.strictEqual(r2.type, 'navigate', '--print returns navigate');
if (r2.type === 'navigate') {
  assert.strictEqual(r2.href,   '/evandro-cv.pdf',  'href = /evandro-cv.pdf');
  assert.strictEqual(r2.target, '_blank',           'opens in new tab');
}

console.log('commands/resume: all tests passed');
```

- [ ] Run — MUST fail.

#### 4.2 — GREEN: `src/terminal/commands/resume.ts`

- [ ] Create:

```ts
import { defineCommand } from '../core/types.js';
import { parseMarkdownBlocks } from '../core/markdown.js';

export default defineCommand({
  name:     'resume',
  describe: 'CV / resume',
  run(args, ctx) {
    if (args.includes('--print')) {
      return { type: 'navigate', href: '/evandro-cv.pdf', target: '_blank' };
    }
    const { body } = ctx.store.resume();
    return { type: 'pager', blocks: parseMarkdownBlocks(body), title: 'Resume' };
  },
});
```

#### 4.3 — Register

- [ ] Add `import resume from './resume.js';` to `src/terminal/commands/index.ts` and include in `cmdList`.
- [ ] Add to `help.ts`:
  ```
  '  resume [--print]  read CV (--print → PDF)',
  ```

#### 4.4 — Verify

- [ ] `pnpm test tests/unit/commands/resume.test.ts` — passes.
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint` — green.
- [ ] **Commit:** `feat(terminal): add resume command (pager + --print PDF)`

---

### Task 5 — Resume PDF placeholder

The test in Task 4 already validates the navigate Result; this task adds the actual file so the link doesn't 404 in the browser.

#### 5.1 — Create the placeholder PDF

- [ ] Verify `src/content/resume.mdx` already exists (it does; Read confirmed). The fixture builder picks it up via `src/content/config.ts` → `resume` collection. No change needed there.
- [ ] Create `public/evandro-cv.pdf` as a minimal valid 1-page PDF placeholder. Use this command:

  ```bash
  printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 100 700 Td (Resume placeholder) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000098 00000 n\n0000000165 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n255\n%%EOF\n' > public/evandro-cv.pdf
  ```

- [ ] Verify it exists: `ls -la public/evandro-cv.pdf`. Worker note: this is a deliberate stub. The real CV will replace this file later — same path, same name, no code changes required.

#### 5.2 — Verify

- [ ] `pnpm build` — green (Astro should copy `public/evandro-cv.pdf` into `dist/`).
- [ ] `ls dist/evandro-cv.pdf` — file is present in the build output.
- [ ] **Commit:** `chore(public): add placeholder evandro-cv.pdf`

---

### Task 6 — `size-limit` devDep + CI step

#### 6.1 — Add devDeps

- [ ] **Stop and ask Evan before installing.** When approved, run:

  ```bash
  pnpm add -D size-limit @size-limit/file
  ```

  Rationale: `size-limit` is the harness; `@size-limit/file` is the preset that measures file size on disk (no headless-browser overhead — perfect for static assets).

#### 6.2 — Add config + script to `package.json`

- [ ] Add a `size-limit` script:
  ```json
  "size-limit:check": "size-limit"
  ```
  (Use the `:check` suffix to avoid colliding with the `size-limit` config key on some shell completions.)

- [ ] Add the `size-limit` config block at the top level of `package.json`:
  ```json
  "size-limit": [
    {
      "path": "dist/_astro/*.js",
      "name": "Terminal island",
      "limit": "120 KB",
      "gzip": true
    }
  ]
  ```

#### 6.3 — Local verification

- [ ] Run `pnpm build && pnpm size-limit:check`. Expected: green, with the bundle reported well under 120 KB gzip.
- [ ] If the bundle is *over* budget: STOP and escalate to Evan. Do not raise the limit unilaterally — the budget is a deliberate constraint.

#### 6.4 — CI integration

- [ ] Edit `.github/workflows/ci.yml` to add a step **after** the existing `Build` step and **before** `A11y audit`:

  ```yaml
      - name: Bundle size budget
        run: pnpm size-limit:check
  ```

#### 6.5 — Verify

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:a11y`, `pnpm build`, `pnpm size-limit:check` — all green locally.
- [ ] **Commit:** `ci: enforce 120KB gzip budget on terminal island via size-limit`

---

### Task 7 — `README.md` + `CONTRIBUTING.md`

#### 7.1 — `README.md` at repo root

- [ ] Create `README.md` with these sections (concise — under 100 lines total):

```markdown
# evandro.dev

A personal site that's actually a terminal.

Built with Astro 5, React 19, TypeScript (strict), and a custom REPL. Themes,
search, vim-style pager, multi-language. No JS frameworks beyond React on the
single terminal island.

## Dev setup

```bash
pnpm install
pnpm dev
```

Open <http://localhost:4321>. Type `help` to start.

## Scripts

| Command              | Purpose                          |
|----------------------|----------------------------------|
| `pnpm dev`           | dev server (rebuilds fixture)    |
| `pnpm build`         | production build                 |
| `pnpm test`          | unit tests (Poku)                |
| `pnpm test:a11y`     | a11y audit (axe-core)            |
| `pnpm typecheck`     | tsc --noEmit                     |
| `pnpm lint`          | oxlint                           |
| `pnpm size-limit:check` | bundle size budget            |

## Adding a blog post

1. Create `src/content/blog/<slug>.mdx` with the frontmatter from `src/content/schemas.ts → blogSchema`.
2. (Optional) Add a `pt` translation under the same slug with `lang: pt` and `translationOf: <en-slug>`.
3. `pnpm dev` regenerates the terminal fixture; the post appears in `ls`, `find`, `grep`, `cat`.

## Architecture

See `docs/superpowers/spec.md` for the full spec and `docs/superpowers/plans/` for milestone plans.
```

#### 7.2 — `CONTRIBUTING.md` at repo root

- [ ] Create:

```markdown
# Contributing

## Adding a theme

1. Create `src/terminal/themes/styles/<name>.css` defining `[data-theme="<name>"]` with the CSS variables documented in `src/terminal/themes/styles/matrix.css` (use it as the canonical example).
2. Import it in `src/terminal/themes/styles/index.css`.
3. Add the theme name to the `VISIBLE_THEMES` tuple in `src/terminal/themes/registry.ts`.
4. Run `pnpm test tests/unit/theme-contrast.test.ts` — the theme must pass WCAG AA (`fg/bg ≥ 4.5`, `accent/bg ≥ 3.0`).

## Adding a command

1. Create `src/terminal/commands/<name>.ts`. Export a default `defineCommand({ name, describe, run })`.
2. Add it to `cmdList` in `src/terminal/commands/index.ts`.
3. (If user-facing) Add a row to the help text in `src/terminal/commands/help.ts`. Joke commands stay out of `help`.
4. Write a test at `tests/unit/commands/<name>.test.ts`. RED → GREEN → REFACTOR. Mandatory.
5. Run `pnpm test tests/unit/commands/<name>.test.ts`.

## Tests

Poku is the runner. Tests live under `tests/unit/`. Each test file is standalone (no `describe`/`it`) — see existing tests for the style. Use `assert` from `poku`.

## CI

Every PR runs typecheck, lint, unit tests, build, size-limit, and a11y audit. All must pass before merge.
```

#### 7.3 — Verify

- [ ] `cat README.md CONTRIBUTING.md` — sanity-check rendering.
- [ ] **Commit:** `docs: add README and CONTRIBUTING`

---

### Task 8 — Full verification

Run the entire pipeline end-to-end. This is a verification gate — if anything fails, fix forward (do not paper over).

- [ ] `pnpm typecheck` — PASS
- [ ] `pnpm lint` — PASS
- [ ] `pnpm test` — PASS (jokes, neofetch, bio, resume tests included)
- [ ] `pnpm test:a11y` — PASS
- [ ] `pnpm build` — PASS
- [ ] `pnpm size-limit:check` — PASS, terminal island under 120 KB gzip
- [ ] Spot-check in browser:
  - `vim` → joke echo
  - `rm -rf /` → polite denial
  - `exit` → no-exit line
  - `cat .bashrc` → fake aliases
  - `neofetch` → identity card with current theme/lang/found
  - `bio` → press-kit text; `bio --copy` → "copied to clipboard." (paste somewhere to verify)
  - `resume` → pager opens with CV
  - `resume --print` → new tab opens `/evandro-cv.pdf`
- [ ] **Hand off to BUG → ARCH → SPEC review pipeline.** Do not merge directly.

---

## Risks and mitigations

- **Risk:** `bio --copy` test relies on a fragile `globalThis.navigator` shim. **Mitigation:** the test restores the original navigator in a `try/finally` and uses one microtask flush — see Task 3.2.
- **Risk:** `size-limit` may report >120 KB on first run if React 19 + theme CSS bloat the island. **Mitigation:** the plan instructs the worker to escalate rather than raise the limit. The budget is the design intent.
- **Risk:** `cat .bashrc` joke could clash with a future real `.bashrc` in fixtures. **Mitigation:** the special case lives at the top of `cat.run()` and short-circuits before any fixture lookup. If a real `.bashrc` is ever added, change the precedence intentionally.
- **Risk:** Joke commands appearing in tab-completion. **Acceptable trade-off:** they will tab-complete (since `commands.keys()` returns all registered names). This is fine — discovery is part of the joke.

---

## Out of scope (explicit deferrals)

- `sudo` command — already shipped in M5, do not re-implement.
- PT translations of posts — content work, not engineering.
- Per-page language switcher — needs translated content first.
- Per-post OG images via Satori — separate milestone.
- Pagefind static search — separate milestone.
