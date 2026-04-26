import { useState, useCallback, useEffect } from 'react';
import type { MarkdownBlock } from '../core/types.js';
import { createVimMode, applyVimKey, type VimModeState } from './vimMode.js';

export interface UseVimModeReturn {
  vimState:       VimModeState | null;
  enterPager:     (blocks: MarkdownBlock[], title: string) => void;
  exitPager:      () => void;
  handleVimKey:   (key: string) => void;
  setSearchQuery: (query: string) => void;
  commitSearch:   () => void;
}

export function useVimMode(): UseVimModeReturn {
  const [vimState, setVimState] = useState<VimModeState | null>(null);

  const enterPager = useCallback((blocks: MarkdownBlock[], title: string) => {
    setVimState(createVimMode(blocks, title));
  }, []);

  const exitPager = useCallback(() => {
    setVimState(null);
  }, []);

  const handleVimKey = useCallback((key: string) => {
    setVimState(prev => {
      if (!prev) return null;
      const next = applyVimKey(prev, key);
      return next.active ? next : null;
    });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setVimState(prev => {
      if (!prev) return null;
      return { ...prev, searchQuery: query };
    });
  }, []);

  const commitSearch = useCallback(() => {
    setVimState(prev => {
      if (!prev) return null;
      const re = prev.searchQuery ? new RegExp(prev.searchQuery, 'i') : null;
      if (!re) return { ...prev, searchInput: false };

      const start = prev.currentLine;
      const n     = prev.blocks.length;
      for (let offset = 0; offset < n; offset++) {
        const idx = (start + offset) % n;
        if (re.test(prev.blocks[idx].raw)) {
          return { ...prev, searchInput: false, searchIndex: idx, currentLine: idx };
        }
      }
      return { ...prev, searchInput: false };
    });
  }, []);

  useEffect(() => {
    if (!vimState) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (vimState.searchInput) {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitSearch();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleVimKey('Escape');
        }
        return;
      }

      const handled = ['j', 'k', 'd', 'u', 'g', 'G', 'q', 'Escape', '/', 'n', 'N'];
      if (handled.includes(e.key)) {
        e.preventDefault();
        handleVimKey(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [vimState, handleVimKey, commitSearch]);

  return { vimState, enterPager, exitPager, handleVimKey, setSearchQuery, commitSearch };
}
