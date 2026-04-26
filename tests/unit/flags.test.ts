import { assert } from 'poku';
import { parseFlags, globToRegex } from '../../src/terminal/core/flags.js';

// positional only
const p1 = parseFlags(['blog', 'posts']);
assert.deepStrictEqual(p1.positional, ['blog', 'posts'], 'positional args captured');
assert.deepStrictEqual(p1.flags, {}, 'no flags when args are positional');

// --flag=value
const p2 = parseFlags(['--name=*.md']);
assert.strictEqual(p2.flags['name'], '*.md', '--flag=value parsed correctly');
assert.deepStrictEqual(p2.positional, [], 'no positional with --flag=value');

// -flag value (next arg is value)
const p3 = parseFlags(['-tag', 'ai']);
assert.strictEqual(p3.flags['tag'], 'ai', '-flag value parsed correctly');
assert.deepStrictEqual(p3.positional, [], 'no positional with -flag value');

// -flag value where next arg starts with - (boolean)
const p4 = parseFlags(['-tag', '-other']);
assert.strictEqual(p4.flags['tag'], true, '-flag followed by -arg is boolean true');
assert.strictEqual(p4.flags['other'], true, 'second -flag also boolean true');

// -flag alone at end
const p5 = parseFlags(['-lang']);
assert.strictEqual(p5.flags['lang'], true, 'sole -flag is boolean true');

// -3 numeric shorthand -> flags.n = '3'
const p6 = parseFlags(['-3']);
assert.strictEqual(p6.flags['n'], '3', '-N numeric shorthand maps to flags.n');

// -10 numeric shorthand
const p7 = parseFlags(['-10']);
assert.strictEqual(p7.flags['n'], '10', '-NN numeric shorthand maps to flags.n');

// mixed
const p8 = parseFlags(['blog', '-tag', 'ai', '-lang', 'en', '--after=2024-01-01']);
assert.deepStrictEqual(p8.positional, ['blog'], 'mixed: positional extracted');
assert.strictEqual(p8.flags['tag'], 'ai', 'mixed: -tag ai');
assert.strictEqual(p8.flags['lang'], 'en', 'mixed: -lang en');
assert.strictEqual(p8.flags['after'], '2024-01-01', 'mixed: --after=value');

// globToRegex: literal match
const r1 = globToRegex('hello');
assert.ok(r1.test('hello'), 'literal glob matches exact string');
assert.ok(!r1.test('world'), 'literal glob does not match other string');

// globToRegex: * wildcard
const r2 = globToRegex('*.md');
assert.ok(r2.test('readme.md'), '* wildcard matches prefix');
assert.ok(r2.test('.md'), '* matches empty prefix');
assert.ok(!r2.test('readme.txt'), '* does not match different extension');

// globToRegex: ? wildcard
const r3 = globToRegex('b?g');
assert.ok(r3.test('bag'), '? matches single char');
assert.ok(r3.test('big'), '? matches single char variant');
assert.ok(!r3.test('baag'), '? does not match two chars');

// globToRegex: special chars escaped
const r4 = globToRegex('file.ts');
assert.ok(r4.test('file.ts'), 'dot in glob is literal');
assert.ok(!r4.test('filexts'), 'escaped dot does not act as regex dot');

// globToRegex: case-insensitive
const r5 = globToRegex('README');
assert.ok(r5.test('readme'), 'globToRegex is case-insensitive');
assert.ok(r5.test('README'), 'globToRegex matches original case');

console.log('flags: all tests passed');
