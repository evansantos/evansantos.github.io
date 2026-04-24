export const VISIBLE_THEMES = [
  'matrix',
  'amber',
  'nord',
  'solarized',
  'paper',
  'synthwave',
] as const;

export type VisibleTheme = typeof VISIBLE_THEMES[number];

export function isVisibleTheme(x: string): x is VisibleTheme {
  return (VISIBLE_THEMES as readonly string[]).includes(x);
}
