const enFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
});

const ptFormatter = new Intl.DateTimeFormat('pt-BR', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
});

export function formatDate(date: Date, lang: 'en' | 'pt'): string {
  return lang === 'pt' ? ptFormatter.format(date) : enFormatter.format(date);
}

export function formatDateISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
