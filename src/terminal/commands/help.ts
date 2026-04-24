import { defineCommand } from '../core/types.js';

const HELP_TEXT = [
  'available commands:',
  '',
  '  help          show this help',
  '  whoami        who is evan',
  '  ls            list directory contents',
  '  cd <dir>      change directory (blog, projects, talks, uses, ~)',
  '  cat <slug>    read a post or page',
  '  pwd           print working directory',
  '  tree          show full site structure',
  '  find          unix-style search (M3)',
  '  grep          search content (M3)',
  '  clear         clear terminal',
  '  history       show command history',
  '  echo <text>   repeat text',
  '  date          current time',
  '  uptime        site uptime since 2014',
  '  lang [en|pt]  show or switch language',
  '',
  "  type '<command>' to run",
].join('\n');

export default defineCommand({
  name:     'help',
  describe: 'show available commands',
  run() {
    return { type: 'echo', text: HELP_TEXT };
  },
});
