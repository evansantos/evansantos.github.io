export type Lang = 'en' | 'pt';
export type ErrorCode = 'ENOENT' | 'EINVAL' | 'EPERM' | 'EACCES' | 'ENOTDIR';

// ─── Fixture shapes ──────────────────────────────────────────────────────────

export interface FixturePost {
  slug:          string;
  lang:          Lang;
  title:         string;
  date:          string;       // ISO YYYY-MM-DD
  tags:          string[];
  dek:           string;
  readingTime:   number;
  featured:      boolean;
  draft:         boolean;
  translationOf?: string;
  body:          string;       // raw markdown (frontmatter stripped)
}

export interface FixtureProject {
  id:       string;
  title:    string;
  year:     number;
  category: 'work' | 'personal' | 'sim-racing' | 'ai-tooling';
  dek:      string;
  featured: boolean;
  stack?:   string;
  metric?:  string;
  url?:     string;
  status:   'active' | 'archived' | 'discontinued';
}

export interface FixtureTalk {
  id:        string;
  title:     string;
  kind:      'talk' | 'podcast' | 'workshop' | 'interview' | 'video';
  venue:     string;
  location?: string;
  date:      string;           // ISO YYYY-MM-DD
  lang:      Lang;
  url:       string;
  views?:    number;
}

export interface FixturePage {
  body: string;
}

export interface FixtureNow {
  updated:    string;
  location:   string;
  building:   string;
  reading:    string;
  listening:  string;
  learning:   string;
  lookingFor: string;
  body:       string;
}

export interface ContentFixture {
  schemaVersion: 1;
  generatedAt:   string;
  posts:         FixturePost[];
  projects:      FixtureProject[];
  talks:         FixtureTalk[];
  uses:          FixturePage;
  now:           FixtureNow;
  about:         { en: FixturePage; pt: FixturePage };
  resume:        FixturePage;
}

// ─── Markdown ────────────────────────────────────────────────────────────────

export interface MarkdownBlock {
  type:   'paragraph' | 'heading' | 'code' | 'blockquote' | 'list' | 'hr';
  raw:    string;
  level?: number;              // heading level (1-6)
}

// ─── Terminal result types ────────────────────────────────────────────────────

export interface Column {
  key:    string;
  label:  string;
  align?: 'left' | 'right';
}

export interface NeofetchData {
  name:     string;
  title:    string;
  location: string;
  lang:     Lang;
  theme:    string;
  found:    string;
  uptime:   string;
  shell:    string;
}

export interface GrepMatch {
  slug:       string;
  title:      string;
  excerpt:    string;
  matchStart: number;
  matchEnd:   number;
}

export type Result =
  | { type: 'echo';         text: string;                                    exitCode?: number }
  | { type: 'error';        text: string; hint?: string; code?: ErrorCode;   exitCode: 1 }
  | { type: 'clear' }
  | { type: 'navigate';     href: string; target?: '_self' | '_blank' }
  | { type: 'post-list';    items: FixturePost[];     meta?: { tag?: string; lang?: Lang } }
  | { type: 'post-view';    post: FixturePost }
  | { type: 'project-list'; items: FixtureProject[];  meta?: object }
  | { type: 'table';        columns: Column[];         rows: string[][] }
  | { type: 'neofetch';     data: NeofetchData }
  | { type: 'grep-result';  matches: GrepMatch[] }
  | { type: 'pager';        blocks: MarkdownBlock[];   title: string }
  | { type: 'empty' };

// ─── Shell state ─────────────────────────────────────────────────────────────

export interface ShellState {
  cwd:      string;   // '~' | 'blog' | 'projects' | 'talks' | 'uses'
  lang:     Lang;
  theme:    string;
  found:    number;   // unlocked theme count (derived from unlocked.length + visible count)
  unlocked: string[]; // hidden themes the user has discovered (M5+)
  degraded: boolean;
}

// ─── ContentStore interface ───────────────────────────────────────────────────

export interface ContentStore {
  degraded:   boolean;
  posts(lang: Lang): FixturePost[];
  post(lang: Lang, slug: string): FixturePost | undefined;
  loadPost(lang: Lang, slug: string): Promise<FixturePost | undefined>;
  projects(): FixtureProject[];
  talks(): FixtureTalk[];
  now(): FixtureNow;
  about(lang: Lang): FixturePage;
  uses(): FixturePage;
  resume(): FixturePage;
}

// ─── Command system ───────────────────────────────────────────────────────────

export interface Context {
  store:    ContentStore;
  state:    ShellState;
  setState: (update: Partial<ShellState>) => void;
}

export interface Command {
  name:      string;
  describe:  string;
  run(args: string[], ctx: Context): Result | Promise<Result>;
  complete?(partial: string, ctx: Context): string[];
}

export function defineCommand(cmd: Command): Command {
  return cmd;
}
