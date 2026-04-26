import { assert } from 'poku';
import { buildHistory } from '../../src/terminal/hooks/useHistory.js';

// buildHistory is the pure (non-hook) logic for testing
const h = buildHistory([]);

h.push('ls');
h.push('cat debouncing');
h.push('pwd');

assert.strictEqual(h.entries().length, 3, 'history has 3 entries');
assert.strictEqual(h.entries()[0], 'ls', 'oldest entry is first');
assert.strictEqual(h.entries()[2], 'pwd', 'newest entry is last');

// Navigation
h.reset();
assert.strictEqual(h.navigate(-1), 'pwd', 'navigate(-1) = last entry');
assert.strictEqual(h.navigate(-1), 'cat debouncing', 'navigate(-1) again goes further back');
assert.strictEqual(h.navigate(1), 'pwd', 'navigate(1) goes forward');
assert.strictEqual(h.navigate(1), '', 'navigate(1) past end returns empty string');

// Deduplication — duplicate consecutive entries not added
h.push('pwd');
h.push('pwd');
assert.strictEqual(h.entries().filter(e => e === 'pwd').length, 2, 'duplicate at end not added');

// Cap at 100
const big = buildHistory([]);
for (let i = 0; i < 110; i++) big.push(`cmd-${i}`);
assert.strictEqual(big.entries().length, 100, 'history capped at 100 entries');

console.log('history: all tests passed');
