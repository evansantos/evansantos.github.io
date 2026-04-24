import { defineCommand } from '../core/types.js';

const TREE = [
  '/home/evandro',
  '├── blog/',
  '│   └── [posts]',
  '├── projects/',
  '├── talks/',
  '├── uses',
  '├── about',
  '├── now',
  '└── resume',
].join('\n');

export default defineCommand({
  name:     'tree',
  describe: 'show full site structure',
  run() {
    return { type: 'echo', text: TREE };
  },
});
