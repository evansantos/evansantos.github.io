import { test, afterEach } from 'poku';
import assert from 'node:assert/strict';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

const { renderHook, cleanup } = await import('@pokujs/react');
const { useKonami, KONAMI_SEQUENCE } = await import('../../src/terminal/hooks/useKonami.js');

afterEach(() => cleanup());

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

test('KONAMI_SEQUENCE is the canonical 10-key list', () => {
  assert.deepEqual(KONAMI_SEQUENCE, [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a',
  ]);
});

test('useKonami fires onMatch on the full sequence', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 1);
});

test('useKonami does not fire on partial sequence', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  for (const k of KONAMI_SEQUENCE.slice(0, 9)) press(k);
  assert.equal(calls, 0);
});

test('useKonami resets buffer on a wrong key', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  press('ArrowUp'); press('ArrowUp'); press('z');
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 1);
});

test('useKonami fires twice across two complete sequences', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  for (const k of KONAMI_SEQUENCE) press(k);
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 2);
});

test('useKonami unsubscribes on unmount', () => {
  let calls = 0;
  const { unmount } = renderHook(() => useKonami(() => { calls++; }));
  unmount();
  for (const k of KONAMI_SEQUENCE) press(k);
  assert.equal(calls, 0);
});

test('uppercase B/A should NOT trigger the sequence', () => {
  let calls = 0;
  renderHook(() => useKonami(() => { calls++; }));
  for (const k of KONAMI_SEQUENCE.slice(0, 8)) press(k);
  press('B'); press('A');
  assert.equal(calls, 0);
});
