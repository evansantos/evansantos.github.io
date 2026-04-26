import { assert } from 'poku';
import { parseFixture, SCHEMA_VERSION } from '../../src/terminal/data/load.js';
import type { ContentFixture } from '../../src/terminal/core/types.js';

const validFixture: ContentFixture = {
  schemaVersion: 1,
  generatedAt: '2026-04-23T00:00:00.000Z',
  posts: [],
  projects: [],
  talks: [],
  uses: { body: '' },
  now: { updated: '', location: '', building: '', reading: '', listening: '', learning: '', lookingFor: '', body: '' },
  about: { en: { body: '' }, pt: { body: '' } },
  resume: { body: '' },
};

// Valid fixture
const goodResult = parseFixture(validFixture);
assert.strictEqual(goodResult.ok, true, 'valid fixture returns ok: true');
if (goodResult.ok) {
  assert.strictEqual(goodResult.data.schemaVersion, 1, 'data has schemaVersion 1');
}

// Wrong schema version
const wrongVersion = { ...validFixture, schemaVersion: 99 };
const badResult = parseFixture(wrongVersion);
assert.strictEqual(badResult.ok, false, 'wrong schemaVersion returns ok: false');
if (!badResult.ok) {
  assert.ok(badResult.error.includes('schema'), 'error message mentions schema');
}

// Missing schemaVersion
const noVersion = { ...validFixture, schemaVersion: undefined };
const noVerResult = parseFixture(noVersion);
assert.strictEqual(noVerResult.ok, false, 'missing schemaVersion returns ok: false');

// SCHEMA_VERSION constant
assert.strictEqual(SCHEMA_VERSION, 1, 'SCHEMA_VERSION exported as 1');

console.log('load: all tests passed');
