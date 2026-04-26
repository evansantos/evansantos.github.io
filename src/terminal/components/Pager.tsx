import { useRef, useEffect, type ChangeEvent, type KeyboardEvent } from 'react';
import type { VimModeState } from '../hooks/vimMode.js';

interface Props {
  vimState:       VimModeState;
  onKey:          (key: string) => void;
  onSearchChange: (query: string) => void;
  onSearchCommit: () => void;
}

function renderBlock(raw: string, searchQuery: string): import('react').ReactNode {
  if (!searchQuery) return raw;
  try {
    const re    = new RegExp(`(${searchQuery})`, 'gi');
    const parts = raw.split(re);
    return parts.map((part, i) =>
      re.test(part)
        ? <mark key={i} className="terminal__grep-mark">{part}</mark>
        : part,
    );
  } catch {
    return raw;
  }
}

export default function Pager({ vimState, onKey, onSearchChange, onSearchCommit }: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const blockRefs      = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (vimState.searchInput) {
      searchInputRef.current?.focus();
    }
  }, [vimState.searchInput]);

  useEffect(() => {
    const el = blockRefs.current[vimState.currentLine];
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [vimState.currentLine]);

  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onKey('Escape');
    }
  };

  const percent = vimState.blocks.length === 0
    ? 100
    : Math.round(((vimState.currentLine + 1) / vimState.blocks.length) * 100);

  return (
    <>
      <div
        className="terminal__pager"
        role="region"
        aria-label={`pager: ${vimState.title}`}
        aria-live="polite"
      >
        {vimState.blocks.map((block, i) => {
          const isCurrent = i === vimState.currentLine;
          const isMatch   = vimState.searchQuery
            ? (() => { try { return new RegExp(vimState.searchQuery, 'i').test(block.raw); } catch { return false; } })()
            : false;

          const classes = [
            'terminal__pager-block',
            isCurrent ? 'terminal__pager-block--current' : '',
            isMatch   ? 'terminal__pager-block--match'   : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={i}
              ref={el => { blockRefs.current[i] = el; }}
              className={classes}
              aria-current={isCurrent ? 'true' : undefined}
            >
              {renderBlock(block.raw, vimState.searchQuery)}
            </div>
          );
        })}
      </div>

      {vimState.searchInput ? (
        <div className="terminal__pager-search">
          <span className="terminal__pager-search-prefix" aria-hidden="true">/</span>
          <input
            ref={searchInputRef}
            type="text"
            className="terminal__pager-search-input"
            value={vimState.searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKey}
            aria-label="pager search"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="terminal__pager-status" role="status" aria-live="polite">
          {vimState.title}  ·  {vimState.currentLine + 1}/{vimState.blocks.length}  ·  {percent}%  ·  j/k scroll  ·  / search  ·  q quit
        </div>
      )}
    </>
  );
}
