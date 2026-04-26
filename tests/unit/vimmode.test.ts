import { assert } from 'poku';
import { createVimMode, applyVimKey } from '../../src/terminal/hooks/vimMode.js';
import type { MarkdownBlock } from '../../src/terminal/core/types.js';

function makeBlocks(n: number): MarkdownBlock[] {
  return Array.from({ length: n }, (_, i) => ({
    type: 'paragraph' as const,
    raw:  `Paragraph ${i + 1}`,
  }));
}

const blocks = makeBlocks(20);

// createVimMode initial state
const initial = createVimMode(blocks, 'Test Post');
assert.strictEqual(initial.active, true, 'createVimMode sets active = true');
assert.strictEqual(initial.currentLine, 0, 'createVimMode starts at line 0');
assert.strictEqual(initial.title, 'Test Post', 'createVimMode stores title');
assert.strictEqual(initial.searchQuery, '', 'createVimMode has empty searchQuery');
assert.strictEqual(initial.searchIndex, 0, 'createVimMode has searchIndex 0');
assert.strictEqual(initial.searchInput, false, 'createVimMode has searchInput false');
assert.deepStrictEqual(initial.blocks, blocks, 'createVimMode stores blocks');

// j: move down
const afterJ = applyVimKey(initial, 'j');
assert.strictEqual(afterJ.currentLine, 1, 'j moves down by 1');

// j at end: clamp
const atEnd = { ...initial, currentLine: 19 };
const afterJEnd = applyVimKey(atEnd, 'j');
assert.strictEqual(afterJEnd.currentLine, 19, 'j at last line clamps');

// k: move up
const atLine5 = { ...initial, currentLine: 5 };
const afterK = applyVimKey(atLine5, 'k');
assert.strictEqual(afterK.currentLine, 4, 'k moves up by 1');

// k at top: clamp
const afterKTop = applyVimKey(initial, 'k');
assert.strictEqual(afterKTop.currentLine, 0, 'k at top clamps to 0');

// d: half-page down (10 lines)
const afterD = applyVimKey(initial, 'd');
assert.strictEqual(afterD.currentLine, 10, 'd moves down by 10');

// d clamps at end
const nearEnd = { ...initial, currentLine: 15 };
const afterDNearEnd = applyVimKey(nearEnd, 'd');
assert.strictEqual(afterDNearEnd.currentLine, 19, 'd clamps at last block');

// u: half-page up
const atLine15 = { ...initial, currentLine: 15 };
const afterU = applyVimKey(atLine15, 'u');
assert.strictEqual(afterU.currentLine, 5, 'u moves up by 10');

// u clamps at top
const atLine3 = { ...initial, currentLine: 3 };
const afterUTop = applyVimKey(atLine3, 'u');
assert.strictEqual(afterUTop.currentLine, 0, 'u clamps at 0');

// G: go to end
const afterG = applyVimKey(initial, 'G');
assert.strictEqual(afterG.currentLine, 19, 'G jumps to last line');

// g: go to start
const atMiddle = { ...initial, currentLine: 10 };
const afterg = applyVimKey(atMiddle, 'g');
assert.strictEqual(afterg.currentLine, 0, 'g jumps to first line');

// q: deactivate
const afterQ = applyVimKey(initial, 'q');
assert.strictEqual(afterQ.active, false, 'q deactivates pager');

// Escape: deactivate
const afterEsc = applyVimKey(initial, 'Escape');
assert.strictEqual(afterEsc.active, false, 'Escape deactivates pager');

// /: enter search input mode
const afterSlash = applyVimKey(initial, '/');
assert.strictEqual(afterSlash.searchInput, true, '/ sets searchInput = true');
assert.strictEqual(afterSlash.searchQuery, '', '/ clears searchQuery');

// Escape while in searchInput: cancel search
const inSearch = { ...initial, searchInput: true, searchQuery: 'test' };
const afterEscSearch = applyVimKey(inSearch, 'Escape');
assert.strictEqual(afterEscSearch.searchInput, false, 'Escape exits search input mode');

// n: no-op when no query
const afterN = applyVimKey(initial, 'n');
assert.strictEqual(afterN.currentLine, 0, 'n with no query stays at 0');

// N: no-op when no query
const afterShiftN = applyVimKey(initial, 'N');
assert.strictEqual(afterShiftN.currentLine, 0, 'N with no query stays at 0');

// n advances searchIndex, wraps
const withSearch = { ...initial, searchQuery: 'Paragraph', searchIndex: 0, searchInput: false };
const afterSearchN = applyVimKey(withSearch, 'n');
assert.strictEqual(afterSearchN.searchIndex, 1, 'n advances searchIndex');

const atLastMatch = { ...withSearch, searchIndex: 19 };
const afterWrapN = applyVimKey(atLastMatch, 'n');
assert.strictEqual(afterWrapN.searchIndex, 0, 'n wraps searchIndex at end');

// N reverses
const atIndex3 = { ...withSearch, searchIndex: 3 };
const afterShiftNAdv = applyVimKey(atIndex3, 'N');
assert.strictEqual(afterShiftNAdv.searchIndex, 2, 'N decrements searchIndex');

const atIndex0 = { ...withSearch, searchIndex: 0 };
const afterShiftNWrap = applyVimKey(atIndex0, 'N');
assert.strictEqual(afterShiftNWrap.searchIndex, 19, 'N wraps searchIndex at start');

console.log('vimmode: all tests passed');
