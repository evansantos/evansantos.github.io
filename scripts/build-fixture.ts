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
