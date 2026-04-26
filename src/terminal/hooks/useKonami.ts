import { useEffect, useRef } from 'react';

export const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
] as const;

export function useKonami(onMatch: () => void): void {
  const bufferRef = useRef<string[]>([]);
  const cbRef     = useRef(onMatch);
  cbRef.current = onMatch;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const expected = KONAMI_SEQUENCE[bufferRef.current.length];
      if (e.key === expected) {
        bufferRef.current.push(e.key);
        if (bufferRef.current.length === KONAMI_SEQUENCE.length) {
          bufferRef.current = [];
          cbRef.current();
        }
        return;
      }
      // wrong key — reset; if it matches the FIRST key, start fresh with it
      bufferRef.current = e.key === KONAMI_SEQUENCE[0] ? [e.key] : [];
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
