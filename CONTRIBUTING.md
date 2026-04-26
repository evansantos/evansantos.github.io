# Contributing

## Adding a theme

1. Create `src/terminal/themes/styles/<name>.css` defining `[data-theme="<name>"]` with the CSS variables documented in `src/terminal/themes/styles/matrix.css` (use it as the canonical example).
2. Import it in `src/terminal/themes/styles/index.css`.
3. Add the theme name to the `VISIBLE_THEMES` tuple in `src/terminal/themes/registry.ts`.
4. Run `pnpm test tests/unit/theme-contrast.test.ts` — the theme must pass WCAG AA (`fg/bg >= 4.5`, `accent/bg >= 3.0`).

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
