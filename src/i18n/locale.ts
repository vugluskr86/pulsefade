export type Lang = 'ru' | 'en';

const dictionaries: Record<Lang, Record<string, string>> = {
  ru: {},
  en: {},
};

let currentLang: Lang = 'ru';

export function registerLocale(lang: Lang, dict: Record<string, string>): void {
  Object.assign(dictionaries[lang], dict);
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  try {
    localStorage.setItem('pulsefade:lang', lang);
  } catch {
    /* ignore */
  }
}

export function getLang(): Lang {
  return currentLang;
}

export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem('pulsefade:lang');
    if (stored === 'ru' || stored === 'en') return stored as Lang;
  } catch {
    /* ignore */
  }
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('ru')) return 'ru';
  return 'en';
}

export function t(key: string, lang?: Lang): string {
  const l = lang ?? currentLang;
  return dictionaries[l]?.[key] ?? dictionaries['en']?.[key] ?? key;
}

/** Форматирует строку с подстановкой {var}. */
export function fmt(key: string, vars?: Record<string, string | number>): string {
  let text = t(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
