import { assert } from 'poku';
import bio from '../../../src/terminal/commands/bio.js';
import { BIO_TEXT } from '../../../src/terminal/data/bio.js';
import type { Context } from '../../../src/terminal/core/types.js';
import { Store } from '../../../src/terminal/core/content.js';

const ctx: Context = {
  store:    new Store(null),
  state:    { cwd: '~', lang: 'en', theme: 'matrix', found: 0, unlocked: [], degraded: false },
  setState: () => {},
};

// plain bio
const r1 = await Promise.resolve(bio.run([], ctx));
assert.strictEqual(r1.type, 'echo', 'bio returns echo');
if (r1.type === 'echo') {
  assert.strictEqual(r1.text, BIO_TEXT, 'bio returns the canonical bio text');
}

// bio --copy: spy on navigator.clipboard.writeText
let copied: string | null = null;
const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  writable: true,
  value: {
    clipboard: {
      writeText: async (s: string) => { copied = s; },
    },
  },
});

try {
  const r2 = await Promise.resolve(bio.run(['--copy'], ctx));
  assert.strictEqual(r2.type, 'echo', '--copy returns echo');
  if (r2.type === 'echo') {
    assert.ok(/copied/i.test(r2.text), '--copy result mentions copied');
  }
  // Microtask flush
  await Promise.resolve();
  assert.strictEqual(copied, BIO_TEXT, 'clipboard received the bio text');
} finally {
  if (originalDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalDescriptor);
  } else {
    delete (globalThis as any).navigator;
  }
}

console.log('commands/bio: all tests passed');
