import { test } from 'poku';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

const HTML_PATH = resolve(process.cwd(), 'dist/index.html');

test('dist/index.html has zero critical axe violations', async () => {
  if (!existsSync(HTML_PATH)) {
    console.warn(`[a11y] ${HTML_PATH} not found — skipping. Run 'pnpm build' first.`);
    return;
  }

  GlobalRegistrator.register();

  const html = readFileSync(HTML_PATH, 'utf8');
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  document.documentElement.replaceWith(parsed.documentElement);

  const axe = (await import('axe-core')).default;
  const results = await axe.run(document, {
    rules: { 'color-contrast': { enabled: false } },
  });

  const critical = results.violations.filter(v => v.impact === 'critical');
  assert.equal(
    critical.length,
    0,
    `critical a11y violations:\n${critical.map(v => `- ${v.id}: ${v.help}`).join('\n')}`,
  );

  await GlobalRegistrator.unregister();
});
