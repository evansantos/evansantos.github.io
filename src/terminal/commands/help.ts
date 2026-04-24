import { defineCommand } from '../core/types.js';

const HELP_TEXT = [
  'available commands:',
  '',
  '  help              show this help',
  '  whoami            who is evan',
  '  ls                list directory contents',
  '  cd <dir>          change directory (blog, projects, talks, uses, ~)',
  '  cat <slug>        read a post or page (pager for long content)',
  '  pwd               print working directory',
  '  tree              show full site structure',
  '  find <dir>        search posts (-name, -tag, -lang, -after, -before)',
  '  grep <pattern>    search content with highlight',
  '  head [-N] <slug>  show first N blocks of a post',
  '  tail [-N] <slug>  show last N blocks of a post',
  '  wc <slug>         word/block count for a post',
  '  now               what evan is up to right now',
  '  about             who is evan (long form)',
  '  contact           contact info',
  '  rss               open RSS feed in new tab',
  '  clear             clear terminal',
  '  history           show command history',
  '  echo <text>       repeat text',
  '  date              current time',
  '  uptime            site uptime since 2014',
  '  lang [en|pt]      show or switch language',
  '  theme [name|next|random|reset]  switch colour theme',
  '',
  '  pager keys: j/k scroll  d/u half-page  g/G top/bottom  / search  q quit',
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
