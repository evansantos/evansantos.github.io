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

  return { ok: true, data: obj as unknown as ContentFixture };
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
