import { useEffect, useReducer, useRef, useCallback } from 'react';
import { Store } from './core/content.js';
import { loadFixture } from './data/load.js';
import { commands } from './commands/index.js';
import Log, { type LogEntry } from './components/Log.js';
import InputLine from './components/InputLine.js';
import Pager from './components/Pager.js';
import { useHistory } from './hooks/useHistory.js';
import { useVimMode } from './hooks/useVimMode.js';
import { loadTheme, saveTheme, useStorageSync } from './hooks/useTheme.js';
import { VISIBLE_THEMES } from './themes/registry.js';
import type { Result, ShellState } from './core/types.js';
import '../styles/terminal.css';
import './themes/styles/index.css';

const BOOT_SEQUENCE: string[] = [
  '  ███████╗██╗   ██╗ █████╗ ███╗   ██╗',
  '  ██╔════╝██║   ██║██╔══██╗████╗  ██║',
  '  █████╗  ██║   ██║███████║██╔██╗ ██║',
  '  ██╔══╝  ╚██╗ ██╔╝██╔══██║██║╚██╗██║',
  '  ███████╗ ╚████╔╝ ██║  ██║██║ ╚████║',
  '  ╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝',
  '',
  '  Senior Front-End / Full-Stack Engineer',
  '  Brooklyn, NYC  ·  github.com/evansantos',
  '',
  "  type 'help' to get started",
];

interface State {
  log:     LogEntry[];
  shell:   ShellState;
  input:   string;
  loading: boolean;
  store:   Store;
}

type Action =
  | { type: 'BOOT' }
  | { type: 'STORE_READY'; store: Store }
  | { type: 'EXEC'; input: string; result: Result }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SET_SHELL'; update: Partial<ShellState> };

let _nextId = 0;
const mkId = () => _nextId++;

function bootEntries(): LogEntry[] {
  return BOOT_SEQUENCE.map(text => ({
    id:     mkId(),
    result: { type: 'echo' as const, text },
  }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'BOOT':
      return { ...state, log: bootEntries() };

    case 'STORE_READY':
      return {
        ...state,
        loading: false,
        store:   action.store,
        shell:   { ...state.shell, degraded: action.store.degraded },
        log: action.store.degraded
          ? [
              ...state.log,
              {
                id:     mkId(),
                result: {
                  type:     'error' as const,
                  text:     'failed to load content — try whoami, date, help',
                  exitCode: 1 as const,
                },
              },
            ]
          : state.log,
      };

    case 'EXEC': {
      if (action.result.type === 'clear') {
        return { ...state, input: '', log: [] };
      }
      if (action.result.type === 'navigate') {
        const { href, target } = action.result;
        if (target === '_blank') {
          window.open(href, '_blank', 'noopener');
        } else {
          window.location.href = href;
        }
        return { ...state, input: '' };
      }
      return {
        ...state,
        input: '',
        log:   [...state.log, { id: mkId(), input: action.input, result: action.result }],
      };
    }

    case 'SET_INPUT':
      return { ...state, input: action.value };

    case 'SET_SHELL':
      return { ...state, shell: { ...state.shell, ...action.update } };

    default:
      return state;
  }
}

const INIT_STATE: State = {
  log:     [],
  shell:   { cwd: '~', lang: 'en', theme: 'matrix', found: 0, degraded: false },
  input:   '',
  loading: true,
  store:   new Store(null),
};

export default function Shell() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...INIT_STATE,
    shell: { ...INIT_STATE.shell, theme: loadTheme() },
  }));
  const logEndRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const hist       = useHistory();
  const vim        = useVimMode();

  // Boot and load fixture
  useEffect(() => {
    dispatch({ type: 'BOOT' });

    loadFixture().then(result => {
      dispatch({
        type:  'STORE_READY',
        store: new Store(result.ok ? result.data : null),
      });

      const params = new URLSearchParams(window.location.search);
      const cmd = params.get('cmd');
      if (cmd) {
        setTimeout(() => executeCommand(cmd), 50);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS visualViewport keyboard offset
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty('--keyboard-offset', `${Math.max(0, offset)}px`);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  // Auto-scroll to bottom after new log entries (not when pager is open)
  useEffect(() => {
    if (!vim.vimState) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.log, vim.vimState]);

  // Focus input after pager exits and on initial load
  useEffect(() => {
    if (!state.loading && !vim.vimState) {
      inputRef.current?.focus();
    }
  }, [state.loading, vim.vimState]);

  // Persist theme changes to localStorage
  useEffect(() => {
    saveTheme(state.shell.theme);
  }, [state.shell.theme]);

  // Cross-tab theme sync
  useStorageSync(useCallback((theme: string) => {
    dispatch({ type: 'SET_SHELL', update: { theme } });
  }, []));

  const executeCommand = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    hist.push(trimmed);
    hist.reset();

    const [name, ...args] = trimmed.split(/\s+/);
    const cmd = commands.get(name);

    if (!cmd) {
      dispatch({
        type:   'EXEC',
        input:  trimmed,
        result: {
          type:     'error',
          text:     `${name}: command not found`,
          hint:     "type 'help' to see available commands",
          code:     'ENOENT',
          exitCode: 1,
        },
      });
      return;
    }

    const ctx = {
      store:    state.store,
      state:    state.shell,
      setState: (update: Partial<ShellState>) =>
        dispatch({ type: 'SET_SHELL', update }),
    };

    const result = await Promise.resolve(cmd.run(args, ctx));

    // Intercept pager: activate overlay instead of logging the raw blocks
    if (result.type === 'pager') {
      dispatch({
        type:   'EXEC',
        input:  trimmed,
        result: { type: 'echo', text: `[pager: ${result.title}]` },
      });
      vim.enterPager(result.blocks, result.title);
      return;
    }

    dispatch({ type: 'EXEC', input: trimmed, result });
    setTimeout(() => inputRef.current?.focus(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.store, state.shell, hist, vim]);

  // Tab completion: command names (token 1), dirs (cd), slugs (cat/head/tail/wc), themes
  const handleTabComplete = useCallback((partial: string): string | null => {
    if (!partial) return null;
    const parts = partial.split(/\s+/);

    if (parts.length === 1) {
      const names = Array.from(commands.keys()).sort();
      return names.find(n => n.startsWith(partial)) ?? null;
    }

    const [cmd, ...rest] = parts;
    const partialArg = rest[rest.length - 1] ?? '';

    if (cmd === 'cd') {
      const dirs = ['~', 'blog', 'projects', 'talks', 'uses'];
      const match = dirs.find(d => d.startsWith(partialArg));
      return match !== undefined ? `${cmd} ${match}` : null;
    }

    if (['cat', 'head', 'tail', 'wc'].includes(cmd)) {
      const slugs = state.store.posts(state.shell.lang).map(p => p.slug);
      const match = slugs.find(s => s.startsWith(partialArg));
      return match !== undefined ? `${cmd} ${match}` : null;
    }

    if (cmd === 'theme') {
      const names = [...VISIBLE_THEMES, 'next', 'random', 'reset'];
      const match = names.find(n => n.startsWith(partialArg));
      return match !== undefined ? `${cmd} ${match}` : null;
    }

    return null;
  }, [state.store, state.shell.lang]);

  const { shell } = state;
  const statusText = `shell: unix · theme: ${shell.theme} · lang: ${shell.lang} · found: ${shell.found}/11`;

  return (
    <div
      role="application"
      aria-label="evandro.dev terminal"
      className="terminal"
      data-theme={shell.theme}
    >
      {vim.vimState ? (
        <Pager
          vimState={vim.vimState}
          onKey={vim.handleVimKey}
          onSearchChange={vim.setSearchQuery}
          onSearchCommit={vim.commitSearch}
        />
      ) : (
        <>
          <Log entries={state.log} lang={shell.lang} />
          <div ref={logEndRef} aria-hidden="true" />

          <InputLine
            value={state.input}
            cwd={shell.cwd}
            onChange={v => dispatch({ type: 'SET_INPUT', value: v })}
            onSubmit={executeCommand}
            onNavigate={hist.navigate}
            onCancel={() => {
              dispatch({ type: 'EXEC', input: '^C', result: { type: 'empty' } });
              dispatch({ type: 'SET_INPUT', value: '' });
            }}
            onClear={() => {
              dispatch({ type: 'EXEC', input: 'clear', result: { type: 'clear' } });
            }}
            disabled={state.loading}
            onTabComplete={handleTabComplete}
          />

          <div
            role="status"
            aria-live="polite"
            aria-label="shell status"
            className="terminal__status"
          >
            {statusText}
          </div>
        </>
      )}
    </div>
  );
}
