import { test } from 'poku';
import assert from 'node:assert/strict';
import {
  HIDDEN_THEMES,
  ALL_THEMES,
  isHiddenTheme,
  isKnownTheme,
  isUnlocked,
} from '../../src/terminal/themes/unlocks.js';

test('HIDDEN_THEMES is the canonical 5-tuple in spec order', () => {
  assert.deepEqual(
    [...HIDDEN_THEMES],
    ['sandwich', 'night', 'lazy', 'konami', 'hacker'],
  );
});

test('ALL_THEMES has 11 entries: visible first, then hidden', () => {
  assert.equal(ALL_THEMES.length, 11);
  assert.equal(ALL_THEMES[0], 'matrix');
  assert.equal(ALL_THEMES[6], 'sandwich');
  assert.equal(ALL_THEMES[10], 'hacker');
});

test('isHiddenTheme correctly classifies', () => {
  assert.equal(isHiddenTheme('sandwich'), true);
  assert.equal(isHiddenTheme('hacker'), true);
  assert.equal(isHiddenTheme('matrix'), false);
  assert.equal(isHiddenTheme('dracula'), false);
});

test('isKnownTheme accepts all 11 and rejects others', () => {
  for (const t of ALL_THEMES) assert.equal(isKnownTheme(t), true);
  assert.equal(isKnownTheme('dracula'), false);
  assert.equal(isKnownTheme(''), false);
});

test('visible themes are always unlocked regardless of state', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('matrix',    { unlocked: [] }, env), true);
  assert.equal(isUnlocked('synthwave', { unlocked: [] }, env), true);
});

test('sandwich requires unlocked[] entry', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('sandwich', { unlocked: [] }, env), false);
  assert.equal(isUnlocked('sandwich', { unlocked: ['sandwich'] }, env), true);
});

test('lazy requires unlocked[] entry', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('lazy', { unlocked: [] }, env), false);
  assert.equal(isUnlocked('lazy', { unlocked: ['lazy'] }, env), true);
});

test('konami requires unlocked[] entry', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('konami', { unlocked: [] }, env), false);
  assert.equal(isUnlocked('konami', { unlocked: ['konami'] }, env), true);
});

test('night is unlocked between 22:00 and 05:59 local', () => {
  const state = { unlocked: [] };
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 22, 0)  }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 23, 30) }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 25,  0, 0)  }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 25,  5, 59) }), true);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 25,  6, 0)  }), false);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 12, 0)  }), false);
  assert.equal(isUnlocked('night', state, { now: new Date(2026, 3, 24, 21, 59) }), false);
});

test('hacker requires the other 4 hidden themes to be unlocked', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('hacker', { unlocked: [] },                                       env), false);
  assert.equal(isUnlocked('hacker', { unlocked: ['sandwich', 'lazy', 'konami'] },           env), false);
  // night counts as "unlocked" for the hacker gate when it is currently night
  const nightEnv = { now: new Date(2026, 3, 25, 23, 0) };
  assert.equal(isUnlocked('hacker', { unlocked: ['sandwich', 'lazy', 'konami'] },           nightEnv), true);
  // or when night appears in unlocked[] explicitly
  assert.equal(isUnlocked('hacker', { unlocked: ['sandwich', 'lazy', 'konami', 'night'] }, env), true);
});

test('isUnlocked returns false for unknown theme names', () => {
  const env = { now: new Date('2026-04-24T12:00:00') };
  assert.equal(isUnlocked('dracula', { unlocked: [] }, env), false);
});
