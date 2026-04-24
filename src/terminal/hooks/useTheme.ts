import { useEffect } from 'react';
import { isVisibleTheme } from '../themes/registry.js';

const STATE_KEY = 'evandro.state.v1';

export function loadTheme(): string {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return 'matrix';
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'theme' in parsed) {
      const t = (parsed as { theme: unknown }).theme;
      if (typeof t === 'string' && isVisibleTheme(t)) return t;
    }
    return 'matrix';
  } catch {
    return 'matrix';
  }
}

export function saveTheme(theme: string): void {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    let existing: Record<string, unknown> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
          existing = parsed as Record<string, unknown>;
        }
      } catch {
        // malformed — start fresh
      }
    }
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...existing, theme }));
  } catch {
    // Safari private mode / quota exceeded — silent fail
  }
}

export function useStorageSync(onThemeChange: (theme: string) => void): void {
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STATE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        if (parsed && typeof parsed === 'object' && 'theme' in parsed) {
          const t = (parsed as { theme: unknown }).theme;
          if (typeof t === 'string' && isVisibleTheme(t)) onThemeChange(t);
        }
      } catch {
        // ignore malformed cross-tab writes
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [onThemeChange]);
}
