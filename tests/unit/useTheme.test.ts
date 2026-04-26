import { test, beforeEach } from 'poku';
import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

const { loadTheme, saveTheme } = await import('../../src/terminal/hooks/useTheme.js');

const KEY = 'evandro.state.v1';

beforeEach(() => {
  localStorage.clear();
});

test('loadTheme returns "matrix" when localStorage is empty', () => {
  assert.equal(loadTheme(), 'matrix');
});

test('loadTheme returns stored theme string', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'nord' }));
  assert.equal(loadTheme(), 'nord');
});

test('loadTheme returns "matrix" when stored JSON is malformed', () => {
  localStorage.setItem(KEY, '{not-json');
  assert.equal(loadTheme(), 'matrix');
});

test('loadTheme returns "matrix" when theme field is missing', () => {
  localStorage.setItem(KEY, JSON.stringify({ found: 3 }));
  assert.equal(loadTheme(), 'matrix');
});

test('loadTheme returns "matrix" when theme field is non-string', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 42 }));
  assert.equal(loadTheme(), 'matrix');
});

test('saveTheme writes theme into localStorage', () => {
  saveTheme('amber');
  const raw = localStorage.getItem(KEY);
  assert.ok(raw);
  assert.equal(JSON.parse(raw!).theme, 'amber');
});

test('saveTheme preserves other fields in the state blob', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'matrix', found: 7, unlocked: ['x'] }));
  saveTheme('synthwave');
  const parsed = JSON.parse(localStorage.getItem(KEY)!);
  assert.equal(parsed.theme, 'synthwave');
  assert.equal(parsed.found, 7);
  assert.deepEqual(parsed.unlocked, ['x']);
});

test('saveTheme tolerates malformed JSON by overwriting with a fresh blob', () => {
  localStorage.setItem(KEY, '{garbage');
  saveTheme('paper');
  const parsed = JSON.parse(localStorage.getItem(KEY)!);
  assert.equal(parsed.theme, 'paper');
});

const { loadUnlocked, saveUnlocked, addUnlocked } =
  await import('../../src/terminal/hooks/useTheme.js');

test('loadUnlocked returns [] when localStorage is empty', () => {
  assert.deepEqual(loadUnlocked(), []);
});

test('loadUnlocked returns array when stored', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'matrix', unlocked: ['sandwich', 'lazy'] }));
  assert.deepEqual(loadUnlocked(), ['sandwich', 'lazy']);
});

test('loadUnlocked filters non-strings and unknown themes silently', () => {
  localStorage.setItem(KEY, JSON.stringify({ unlocked: ['sandwich', 42, 'dracula', 'konami'] }));
  assert.deepEqual(loadUnlocked(), ['sandwich', 'konami']);
});

test('loadUnlocked returns [] when unlocked is not an array', () => {
  localStorage.setItem(KEY, JSON.stringify({ unlocked: 'sandwich' }));
  assert.deepEqual(loadUnlocked(), []);
});

test('loadUnlocked returns [] when JSON is malformed', () => {
  localStorage.setItem(KEY, '{garbage');
  assert.deepEqual(loadUnlocked(), []);
});

test('saveUnlocked writes the array and preserves theme', () => {
  localStorage.setItem(KEY, JSON.stringify({ theme: 'amber', unlocked: [] }));
  saveUnlocked(['sandwich']);
  const parsed = JSON.parse(localStorage.getItem(KEY)!);
  assert.equal(parsed.theme, 'amber');
  assert.deepEqual(parsed.unlocked, ['sandwich']);
});

test('addUnlocked dedupes and returns the new array', () => {
  saveUnlocked(['sandwich']);
  const next = addUnlocked('sandwich');
  assert.deepEqual(next, ['sandwich']);
  const next2 = addUnlocked('konami');
  assert.deepEqual(next2.sort(), ['konami', 'sandwich']);
});

test('addUnlocked rejects unknown hidden themes silently', () => {
  saveUnlocked([]);
  const next = addUnlocked('dracula');
  assert.deepEqual(next, []);
});
