import { useEffect } from 'react';
import { isVisibleTheme } from '../themes/registry.js';
import { isHiddenTheme } from '../themes/unlocks.js';

const STATE_KEY = 'evandro.state.v1';

function readBlob(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

function writeBlob(blob: Record<string, unknown>): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(blob));
  } catch {
    // Safari private mode / quota exceeded — silent fail
  }
}

export function loadTheme(): string {
  const blob = readBlob();
  const t = blob.theme;
  if (typeof t === 'string' && isVisibleTheme(t)) return t;
  if (typeof t === 'string' && isHiddenTheme(t)) return t;
  return 'matrix';
}

export function saveTheme(theme: string): void {
  writeBlob({ ...readBlob(), theme });
}

export function loadUnlocked(): string[] {
  const blob = readBlob();
  const arr = blob.unlocked;
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === 'string' && isHiddenTheme(x));
}

export function saveUnlocked(unlocked: readonly string[]): void {
  writeBlob({ ...readBlob(), unlocked: [...unlocked] });
}

export function addUnlocked(theme: string): string[] {
  if (!isHiddenTheme(theme)) return loadUnlocked();
  const current = loadUnlocked();
  if (current.includes(theme)) return current;
  const next = [...current, theme];
  saveUnlocked(next);
  return next;
}

export function useStorageSync(
  onThemeChange: (theme: string) => void,
  onUnlockedChange?: (unlocked: string[]) => void,
): void {
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STATE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        if (!parsed || typeof parsed !== 'object') return;
        const obj = parsed as Record<string, unknown>;
        const t = obj.theme;
        if (typeof t === 'string' && (isVisibleTheme(t) || isHiddenTheme(t))) {
          onThemeChange(t);
        }
        if (onUnlockedChange && Array.isArray(obj.unlocked)) {
          const u = obj.unlocked.filter(
            (x): x is string => typeof x === 'string' && isHiddenTheme(x),
          );
          onUnlockedChange(u);
        }
      } catch {
        // ignore malformed cross-tab writes
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [onThemeChange, onUnlockedChange]);
}
