import { assert } from 'poku';
import { isValidLang, getLangLabel, getAlternateLang } from '../../src/lib/locale.js';

assert.strictEqual(isValidLang('en'), true,  'en is valid');
assert.strictEqual(isValidLang('pt'), true,  'pt is valid');
assert.strictEqual(isValidLang('fr'), false, 'fr is not valid');

assert.strictEqual(getLangLabel('en'), 'English',    'EN label');
assert.strictEqual(getLangLabel('pt'), 'Português',  'PT label');

assert.strictEqual(getAlternateLang('en'), 'pt', 'alternate of en is pt');
assert.strictEqual(getAlternateLang('pt'), 'en', 'alternate of pt is en');
