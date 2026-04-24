import type {
  ContentFixture, ContentStore, FixturePost, FixtureProject,
  FixtureTalk, FixtureNow, FixturePage, Lang,
} from './types.js';

const EMPTY_PAGE: FixturePage = { body: '' };
const EMPTY_NOW: FixtureNow = {
  updated: '', location: '', building: '', reading: '',
  listening: '', learning: '', lookingFor: '', body: '',
};

export class Store implements ContentStore {
  private fixture: ContentFixture | null;

  constructor(fixture: ContentFixture | null) {
    this.fixture = fixture;
  }

  get degraded(): boolean {
    return this.fixture === null;
  }

  posts(lang: Lang): FixturePost[] {
    if (!this.fixture) return [];
    return this.fixture.posts.filter(p => p.lang === lang && !p.draft);
  }

  post(lang: Lang, slug: string): FixturePost | undefined {
    if (!this.fixture) return undefined;
    return this.fixture.posts.find(p => p.lang === lang && p.slug === slug && !p.draft);
  }

  async loadPost(slug: string): Promise<FixturePost | undefined> {
    if (!this.fixture) return undefined;
    return this.fixture.posts.find(p => p.slug === slug && !p.draft);
  }

  projects(): FixtureProject[] {
    return this.fixture?.projects ?? [];
  }

  talks(): FixtureTalk[] {
    return this.fixture?.talks ?? [];
  }

  now(): FixtureNow {
    return this.fixture?.now ?? EMPTY_NOW;
  }

  about(lang: Lang): FixturePage {
    return this.fixture?.about[lang] ?? EMPTY_PAGE;
  }

  uses(): FixturePage {
    return this.fixture?.uses ?? EMPTY_PAGE;
  }

  resume(): FixturePage {
    return this.fixture?.resume ?? EMPTY_PAGE;
  }
}
