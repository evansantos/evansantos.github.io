import { VISIBLE_THEMES, isVisibleTheme } from './registry.js';

export const HIDDEN_THEMES = [
  'sandwich',
  'night',
  'lazy',
  'konami',
  'hacker',
] as const;

export type HiddenTheme = typeof HIDDEN_THEMES[number];

export function isHiddenTheme(x: string): x is HiddenTheme {
  return (HIDDEN_THEMES as readonly string[]).includes(x);
}

export const ALL_THEMES = [...VISIBLE_THEMES, ...HIDDEN_THEMES] as const;
export type KnownTheme = typeof ALL_THEMES[number];

export function isKnownTheme(x: string): x is KnownTheme {
  return isVisibleTheme(x) || isHiddenTheme(x);
}

export type UnlockCondition =
  | { kind: 'always' }
  | { kind: 'flag';      hint: string }
  | { kind: 'time';      startHour: number; endHour: number; hint: string }
  | { kind: 'composite'; requires: readonly HiddenTheme[]; hint: string };

export const UNLOCK_CONDITIONS: Record<HiddenTheme, UnlockCondition> = {
  sandwich: { kind: 'flag', hint: 'try: sudo make me a sandwich' },
  night:    { kind: 'time', startHour: 22, endHour: 6,
              hint: 'come back between 10pm and 6am local time' },
  lazy:     { kind: 'flag', hint: 'run uptime three times in a session' },
  konami:   { kind: 'flag', hint: 'up up down down left right left right b a' },
  hacker:   { kind: 'composite',
              requires: ['sandwich', 'night', 'lazy', 'konami'],
              hint: 'unlock the other four hidden themes first' },
};

export interface UnlockState {
  unlocked: readonly string[];
}

export interface UnlockEnv {
  now: Date;
}

function inNightWindow(d: Date, startHour: number, endHour: number): boolean {
  const h = d.getHours();
  // Window wraps midnight: [startHour .. 23] | [0 .. endHour-1]
  if (startHour > endHour) {
    return h >= startHour || h < endHour;
  }
  return h >= startHour && h < endHour;
}

export function isUnlocked(
  theme: string,
  state: UnlockState,
  env: UnlockEnv = { now: new Date() },
): boolean {
  if (isVisibleTheme(theme)) return true;
  if (!isHiddenTheme(theme)) return false;

  const cond = UNLOCK_CONDITIONS[theme];
  switch (cond.kind) {
    case 'always':
      return true;
    case 'flag':
      return state.unlocked.includes(theme);
    case 'time':
      return inNightWindow(env.now, cond.startHour, cond.endHour);
    case 'composite':
      return cond.requires.every(req => {
        const reqCond = UNLOCK_CONDITIONS[req];
        if (reqCond.kind === 'time') {
          return inNightWindow(env.now, reqCond.startHour, reqCond.endHour)
              || state.unlocked.includes(req);
        }
        return state.unlocked.includes(req);
      });
  }
}
