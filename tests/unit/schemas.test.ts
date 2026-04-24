import { assert } from 'poku';
import { z } from 'zod';

import {
  blogSchema,
  projectSchema,
  talkSchema,
  usesSchema,
  nowSchema,
  aboutSchema,
  resumeSchema,
} from '../../src/content/schemas.js';

// --- blogSchema ---

assert.doesNotThrow(() => {
  blogSchema.parse({
    title: 'Debouncing in React',
    date: '2025-03-10',
    lang: 'en',
    tags: ['react', 'performance'],
    dek: 'The naive version fires on every keystroke.',
  });
}, 'blogSchema accepts valid EN post');

assert.doesNotThrow(() => {
  blogSchema.parse({
    title: 'Debouncing no React',
    date: '2025-03-10',
    lang: 'pt',
    tags: ['react'],
    dek: 'Resumo.',
    translationOf: 'debouncing',
  });
}, 'blogSchema accepts PT post with translationOf');

assert.throws(() => {
  blogSchema.parse({
    title: 'Missing date',
    lang: 'en',
    tags: [],
    dek: 'x',
  });
}, 'blogSchema rejects post without date');

assert.throws(() => {
  blogSchema.parse({
    title: 'Bad lang',
    date: '2025-03-10',
    lang: 'fr',
    tags: [],
    dek: 'x',
  });
}, 'blogSchema rejects unsupported lang');

// --- projectSchema ---

assert.doesNotThrow(() => {
  projectSchema.parse({
    title: 'Racing Engineer',
    year: 2024,
    category: 'personal',
    dek: 'A sim racing telemetry tool.',
    status: 'active',
  });
}, 'projectSchema accepts valid project');

assert.throws(() => {
  projectSchema.parse({
    title: 'Bad category',
    year: 2024,
    category: 'random',
    dek: 'x',
    status: 'active',
  });
}, 'projectSchema rejects unknown category');

// --- talkSchema ---

assert.doesNotThrow(() => {
  talkSchema.parse({
    title: 'Building AI Agents',
    kind: 'talk',
    venue: 'Front in Sampa',
    date: '2025-11-01',
    lang: 'pt',
    url: 'https://example.com/talk',
  });
}, 'talkSchema accepts valid talk');

assert.throws(() => {
  talkSchema.parse({
    title: 'Missing url',
    kind: 'talk',
    venue: 'Venue',
    date: '2025-01-01',
    lang: 'en',
  });
}, 'talkSchema rejects talk without url');

// --- usesSchema ---

assert.doesNotThrow(() => {
  usesSchema.parse({ title: 'Uses' });
}, 'usesSchema accepts valid entry');

assert.doesNotThrow(() => {
  usesSchema.parse({});
}, 'usesSchema uses default title when omitted');

// --- nowSchema ---

assert.doesNotThrow(() => {
  nowSchema.parse({
    updated: '2026-04-23',
    location: 'Brooklyn',
    building: 'evandro.dev',
    reading: 'A Philosophy of Software Design',
    listening: 'Title Fight',
    learning: 'Spec-driven development',
    lookingFor: 'Interesting problems',
  });
}, 'nowSchema accepts valid entry');

assert.throws(() => {
  nowSchema.parse({
    updated: '2026-04-23',
    location: '',
    building: 'x',
    reading: 'x',
    listening: 'x',
    learning: 'x',
    lookingFor: 'x',
  });
}, 'nowSchema rejects empty location');

assert.throws(() => {
  nowSchema.parse({
    updated: null,
    location: 'Brooklyn',
    building: 'x',
    reading: 'x',
    listening: 'x',
    learning: 'x',
    lookingFor: 'x',
  });
}, 'nowSchema rejects null updated date');

// --- aboutSchema ---

assert.doesNotThrow(() => {
  aboutSchema.parse({ lang: 'en' });
}, 'aboutSchema accepts valid EN entry');

assert.throws(() => {
  aboutSchema.parse({ lang: 'de' });
}, 'aboutSchema rejects unsupported lang');

// --- resumeSchema ---

assert.doesNotThrow(() => {
  resumeSchema.parse({ updated: '2026-04-23' });
}, 'resumeSchema accepts valid entry with default title');

assert.throws(() => {
  resumeSchema.parse({ updated: null });
}, 'resumeSchema rejects null updated date');

// regression: url fields must reject javascript: URIs
assert.throws(() => {
  talkSchema.parse({
    title: 'Bad Talk',
    kind: 'talk',
    venue: 'Test',
    date: '2025-01-01',
    lang: 'en',
    url: 'javascript:alert(1)',
  });
}, 'talkSchema rejects javascript: URL');

assert.throws(() => {
  projectSchema.parse({
    title: 'Bad Project',
    year: 2024,
    category: 'personal',
    dek: 'x',
    status: 'active',
    url: 'javascript:alert(1)',
  });
}, 'projectSchema rejects javascript: URL');

// regression: empty required strings should be rejected
assert.throws(() => {
  blogSchema.parse({
    title: '',
    date: '2025-01-01',
    lang: 'en',
    tags: [],
    dek: 'x',
  });
}, 'blogSchema rejects empty title');
