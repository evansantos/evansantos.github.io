import { assert } from 'poku';
import { calcReadingTime } from '../../src/lib/reading-time.js';

assert.strictEqual(calcReadingTime(''), 1, 'empty string returns minimum 1 min');

const twoHundredWords = Array(200).fill('word').join(' ');
assert.strictEqual(calcReadingTime(twoHundredWords), 1, '200 words = 1 min');

const fiveHundredWords = Array(500).fill('word').join(' ');
assert.strictEqual(calcReadingTime(fiveHundredWords), 2, '500 words = 2 min at 250wpm');

const thousandWords = Array(1000).fill('word').join(' ');
assert.strictEqual(calcReadingTime(thousandWords), 4, '1000 words = 4 min at 250wpm');
