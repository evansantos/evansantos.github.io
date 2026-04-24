import { useEffect, useReducer, useRef, useCallback } from 'react';
import { Store } from './core/content.js';
import { loadFixture } from './data/load.js';
import { commands } from './commands/index.js';
import Log, { type LogEntry } from './components/Log.js';
import InputLine from './components/InputLine.js';
import { useHistory } from './hooks/useHistory.js';
import type { Result, ShellState } from './core/types.js';
import '../styles/terminal.css';
import './themes/styles/matrix.css';

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
  log:       LogEntry[];
  shell:     ShellState;
  input:     string;
  loading:   boolean;
  store:     Store;
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
                  type: 'error' as const,
                  text: 'failed to load content — try whoami, date, help',
                  exitCode: 1 as const,
                },
              },
            ]
          : state.log,
      };

    case 'EXEC': {
      if (action.result.type === 'clear') {
        return { ...state, input: '' };
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
  const [state, dispatch] = useReducer(reducer, INIT_STATE);
  const logEndRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const hist       = useHistory();

  // Boot and load fixture
  useEffect(() => {
    dispatch({ type: 'BOOT' });

    loadFixture().then(result => {
      dispatch({
        type:  'STORE_READY',
        store: new Store(result.ok ? result.data : null),
      });

      // Deep-link: execute ?cmd= on mount
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

  // Auto-scroll to bottom after new entries
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [state.loading]);

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
    dispatch({ type: 'EXEC', input: trimmed, result });

    setTimeout(() => inputRef.current?.focus(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.store, state.shell, hist]);

  const { shell } = state;
  const statusText = `shell: unix · theme: ${shell.theme} · lang: ${shell.lang} · found: ${shell.found}/11`;

  return (
    <div
      role="application"
      aria-label="evandro.dev terminal"
      className="terminal"
      data-theme={shell.theme}
    >
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
          state.log.length;
          dispatch({ type: 'EXEC', input: 'clear', result: { type: 'clear' } });
        }}
        disabled={state.loading}
      />

      <div
        role="status"
        aria-live="polite"
        aria-label="shell status"
        className="terminal__status"
      >
        {statusText}
      </div>
    </div>
  );
}
