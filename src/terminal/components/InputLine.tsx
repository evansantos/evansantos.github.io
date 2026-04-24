import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';

interface Props {
  value:       string;
  cwd:         string;
  onChange:    (value: string) => void;
  onSubmit:    (value: string) => void;
  onNavigate:  (dir: -1 | 1) => string;
  onCancel:    () => void;
  onClear:     () => void;
  disabled:    boolean;
}

export default function InputLine({
  value, cwd, onChange, onSubmit, onNavigate, onCancel, onClear, disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  const onFocus = useCallback(() => {
    inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(onNavigate(-1));
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(onNavigate(1));
      setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
      return;
    }

    if (e.ctrlKey) {
      switch (e.key) {
        case 'c': e.preventDefault(); onCancel(); return;
        case 'l': e.preventDefault(); onClear(); return;
        case 'a': e.preventDefault(); input.setSelectionRange(0, 0); return;
        case 'e': e.preventDefault(); {
          const len = input.value.length;
          input.setSelectionRange(len, len);
          return;
        }
        case 'k': e.preventDefault(); onChange(input.value.slice(0, input.selectionStart ?? 0)); return;
        case 'u': e.preventDefault(); onChange(''); return;
        case 'w': e.preventDefault(); {
          const pos = input.selectionStart ?? 0;
          const before = input.value.slice(0, pos);
          const trimmed = before.replace(/\S+\s*$/, '');
          onChange(trimmed + input.value.slice(pos));
          setTimeout(() => input.setSelectionRange(trimmed.length, trimmed.length), 0);
          return;
        }
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    }
  }, [value, onChange, onSubmit, onNavigate, onCancel, onClear]);

  return (
    <div
      className="terminal__input-row"
      onClick={focus}
      role="presentation"
    >
      <span className="terminal__prompt" aria-hidden="true">
        {cwd === '~' ? '~' : `~/${cwd}`} $
      </span>
      <input
        ref={inputRef}
        type="text"
        className="terminal__input"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        aria-label="terminal input"
        aria-autocomplete="list"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        disabled={disabled}
      />
    </div>
  );
}

export type InputLineRef = { focus: () => void };
