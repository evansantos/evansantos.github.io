import { defineCommand } from '../core/types.js';
import exit from './exit.js';

export default defineCommand({
  name:     'quit',
  describe: exit.describe,
  run:      exit.run,
});
