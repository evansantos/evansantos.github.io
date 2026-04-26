import { useState, useCallback } from 'react';

const STORAGE_KEY = 'evandro.history.v1';
const MAX_ENTRIES = 100;

export function buildHistory(initial: string[]) {
  const entries: string[] = [...initial];
  let cursor = entries.length;
  let navigated = false;

  return {
    entries:  () => [...entries],
    push(cmd: string) {
      if (cmd.trim() === '') return;
      if (!navigated && entries[entries.length - 1] === cmd) return;
      entries.push(cmd);
      if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
      cursor = entries.length;
      navigated = false;
    },
    reset() {
      cursor = entries.length;
      navigated = false;
    },
    navigate(direction: -1 | 1): string {
      navigated = true;
      const next = cursor + direction;
      if (next < 0) return entries[0] ?? '';
      if (next >= entries.length) {
        cursor = entries.length;
        return '';
      }
      cursor = next;
      return entries[cursor] ?? '';
    },
  };
}

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Safari private mode — swallow
  }
}

export function useHistory() {
  const [hist] = useState(() => buildHistory(loadFromStorage()));

  const push = useCallback((cmd: string) => {
    hist.push(cmd);
    saveToStorage(hist.entries());
  }, [hist]);

  const navigate = useCallback((dir: -1 | 1) => hist.navigate(dir), [hist]);
  const reset    = useCallback(() => hist.reset(), [hist]);

  return { push, navigate, reset };
}
