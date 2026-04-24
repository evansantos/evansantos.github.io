import { assert } from 'poku';
import { defineCommand } from '../../src/terminal/core/types.js';

const cmd = defineCommand({
  name: 'test',
  describe: 'test command',
  run: (_args, _ctx) => ({ type: 'echo' as const, text: 'ok' }),
});

assert.strictEqual(cmd.name, 'test', 'defineCommand returns command with correct name');
assert.strictEqual(cmd.describe, 'test command', 'defineCommand returns command with correct describe');

const result = cmd.run([], {} as Parameters<typeof cmd.run>[1]);
assert.ok(result instanceof Promise || typeof result === 'object', 'run returns Result or Promise<Result>');
