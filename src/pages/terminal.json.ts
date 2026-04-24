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
