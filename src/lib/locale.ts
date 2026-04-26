export type Lang = 'en' | 'pt';

const LANGS: Lang[] = ['en', 'pt'];

const LABELS: Record<Lang, string> = {
  en: 'English',
  pt: 'Português',
};

const ALTERNATES: Record<Lang, Lang> = {
  en: 'pt',
  pt: 'en',
};

export function isValidLang(lang: string): lang is Lang {
  return LANGS.includes(lang as Lang);
}

export function getLangLabel(lang: Lang): string {
  return LABELS[lang];
}

export function getAlternateLang(lang: Lang): Lang {
  return ALTERNATES[lang];
}
