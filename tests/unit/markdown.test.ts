import { assert } from 'poku';
import { parseMarkdownBlocks } from '../../src/terminal/core/markdown.js';

// Heading detection
const h1 = parseMarkdownBlocks('# Hello World\n\nSome paragraph.');
assert.strictEqual(h1[0].type, 'heading', 'h1 is heading');
assert.strictEqual(h1[0].level, 1, 'h1 level is 1');
assert.strictEqual(h1[1].type, 'paragraph', 'paragraph follows heading');

// H2
const h2 = parseMarkdownBlocks('## Section\n\nText.');
assert.strictEqual(h2[0].level, 2, 'h2 level is 2');

// Code block
const code = parseMarkdownBlocks('Some text.\n\n```ts\nconst x = 1;\n```');
assert.strictEqual(code[1].type, 'code', 'fenced code block detected');

// Blockquote
const bq = parseMarkdownBlocks('> A quote\n\nText after.');
assert.strictEqual(bq[0].type, 'blockquote', 'blockquote detected');

// Unordered list
const ul = parseMarkdownBlocks('- item one\n- item two\n\nParagraph.');
assert.strictEqual(ul[0].type, 'list', 'unordered list detected');

// Ordered list
const ol = parseMarkdownBlocks('1. first\n2. second\n\nText.');
assert.strictEqual(ol[0].type, 'list', 'ordered list detected');

// HR
const hr = parseMarkdownBlocks('Before.\n\n---\n\nAfter.');
assert.strictEqual(hr[1].type, 'hr', 'horizontal rule detected');

// Empty input
const empty = parseMarkdownBlocks('');
assert.strictEqual(empty.length, 0, 'empty string returns empty array');

// Frontmatter is NOT expected in body — body is already stripped
const nofm = parseMarkdownBlocks('First paragraph.\n\nSecond paragraph.');
assert.strictEqual(nofm.length, 2, 'two blocks from two paragraphs');
assert.strictEqual(nofm[0].type, 'paragraph', 'first is paragraph');
assert.strictEqual(nofm[1].type, 'paragraph', 'second is paragraph');

console.log('markdown: all tests passed');
