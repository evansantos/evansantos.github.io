import { test } from 'poku';
import assert from 'node:assert/strict';
import { VISIBLE_THEMES, isVisibleTheme } from '../../src/terminal/themes/registry.js';

test('VISIBLE_THEMES contains exactly the 6 M4 themes in canonical order', () => {
  assert.deepEqual(
    [...VISIBLE_THEMES],
    ['matrix', 'amber', 'nord', 'solarized', 'paper', 'synthwave'],
  );
});

test('VISIBLE_THEMES has no duplicates', () => {
  assert.equal(new Set(VISIBLE_THEMES).size, VISIBLE_THEMES.length);
});

test('isVisibleTheme accepts known themes', () => {
  for (const t of VISIBLE_THEMES) {
    assert.equal(isVisibleTheme(t), true, `expected isVisibleTheme(${t}) true`);
  }
});

test('isVisibleTheme rejects unknown themes', () => {
  assert.equal(isVisibleTheme('dracula'), false);
  assert.equal(isVisibleTheme(''), false);
  assert.equal(isVisibleTheme('MATRIX'), false);
});
