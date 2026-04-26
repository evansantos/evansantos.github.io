# evandro.dev

A personal site that's actually a terminal.

Built with Astro 5, React 19, TypeScript (strict), and a custom REPL. Themes,
vim-style pager, multi-language. No JS frameworks beyond React on the single
terminal island.

## Dev setup

```bash
pnpm install
pnpm dev
```

Open <http://localhost:4321>. Type `help` to start.

## Scripts

| Command                  | Purpose                          |
|--------------------------|----------------------------------|
| `pnpm dev`               | dev server (rebuilds fixture)    |
| `pnpm build`             | production build                 |
| `pnpm test`              | unit tests (Poku)                |
| `pnpm test:a11y`         | a11y audit (axe-core)            |
| `pnpm typecheck`         | tsc --noEmit                     |
| `pnpm lint`              | oxlint                           |
| `pnpm size-limit:check`  | bundle size budget               |

## Adding a blog post

1. Create `src/content/blog/<slug>.mdx` with the frontmatter from `src/content/schemas.ts → blogSchema`.
2. (Optional) Add a `pt` translation under the same slug with `lang: pt` and `translationOf: <en-slug>`.
3. `pnpm dev` regenerates the terminal fixture; the post appears in `ls`, `find`, `grep`, `cat`.

## Architecture

See `docs/superpowers/plans/` for milestone implementation plans.
