import type { Command } from '../core/types.js';
import help    from './help.js';
import whoami  from './whoami.js';
import pwd     from './pwd.js';
import date    from './date.js';
import echo    from './echo.js';
import clear   from './clear.js';
import uptime  from './uptime.js';
import lang    from './lang.js';
import history from './history.js';
import cd      from './cd.js';
import ls      from './ls.js';
import tree    from './tree.js';
import cat     from './cat.js';
import grep    from './grep.js';
import find    from './find.js';
import head    from './head.js';
import tail    from './tail.js';
import wc      from './wc.js';
import now     from './now.js';
import about   from './about.js';
import contact from './contact.js';
import rss     from './rss.js';
import theme   from './theme.js';
import sudo    from './sudo.js';

const cmdList: Command[] = [
  help, whoami, pwd, date, echo, clear, uptime, lang, history,
  cd, ls, tree, cat,
  grep, find, head, tail, wc,
  now, about, contact, rss,
  theme, sudo,
];

export const commands: Map<string, Command> = new Map(
  cmdList.map(cmd => [cmd.name, cmd])
);
