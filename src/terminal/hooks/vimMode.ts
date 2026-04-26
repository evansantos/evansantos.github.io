import type { MarkdownBlock } from '../core/types.js';

export interface VimModeState {
  active:      boolean;
  blocks:      MarkdownBlock[];
  title:       string;
  currentLine: number;
  searchQuery: string;
  searchIndex: number;
  searchInput: boolean;
}

export function createVimMode(blocks: MarkdownBlock[], title: string): VimModeState {
  return {
    active:      true,
    blocks,
    title,
    currentLine: 0,
    searchQuery: '',
    searchIndex: 0,
    searchInput: false,
  };
}

const HALF_PAGE = 10;

export function applyVimKey(state: VimModeState, key: string): VimModeState {
  const last  = state.blocks.length - 1;
  const clamp = (n: number) => Math.max(0, Math.min(last, n));

  // While in search input mode, only Escape exits it
  if (state.searchInput) {
    if (key === 'Escape') {
      return { ...state, searchInput: false };
    }
    return state;
  }

  switch (key) {
    case 'j':
      return { ...state, currentLine: clamp(state.currentLine + 1) };

    case 'k':
      return { ...state, currentLine: clamp(state.currentLine - 1) };

    case 'd':
      return { ...state, currentLine: clamp(state.currentLine + HALF_PAGE) };

    case 'u':
      return { ...state, currentLine: clamp(state.currentLine - HALF_PAGE) };

    case 'G':
      return { ...state, currentLine: last };

    case 'g':
      return { ...state, currentLine: 0 };

    case 'q':
    case 'Escape':
      return { ...state, active: false };

    case '/':
      return { ...state, searchInput: true, searchQuery: '' };

    case 'n': {
      if (!state.searchQuery) return state;
      const next = (state.searchIndex + 1) % state.blocks.length;
      return { ...state, searchIndex: next, currentLine: next };
    }

    case 'N': {
      if (!state.searchQuery) return state;
      const prev = (state.searchIndex - 1 + state.blocks.length) % state.blocks.length;
      return { ...state, searchIndex: prev, currentLine: prev };
    }

    default:
      return state;
  }
}
