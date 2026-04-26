import type { Command } from '../core/types.js';
import help    from './help.js';
import whoami   from './whoami.js';
import neofetch from './neofetch.js';
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
import resume  from './resume.js';
import bio     from './bio.js';
import contact from './contact.js';
import rss     from './rss.js';
import theme   from './theme.js';
import sudo    from './sudo.js';
import rm      from './rm.js';
import vim     from './vim.js';
import nano    from './nano.js';
import emacs   from './emacs.js';
import exit    from './exit.js';
import quit    from './quit.js';
import logout  from './logout.js';

const cmdList: Command[] = [
  help, whoami, neofetch, pwd, date, echo, clear, uptime, lang, history,
  cd, ls, tree, cat,
  grep, find, head, tail, wc,
  now, about, resume, bio, contact, rss,
  theme, sudo,
  rm, vim, nano, emacs, exit, quit, logout,
];

export const commands: Map<string, Command> = new Map(
  cmdList.map(cmd => [cmd.name, cmd])
);
