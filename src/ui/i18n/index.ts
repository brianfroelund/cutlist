import type { Length, UnitSystem } from '../../core/model';
import { formatArea, formatLength, formatTotal, formatWithUnit } from '../../core/units';
import { en, type Messages } from './en';

const loaders = {
  en: async () => en,
  da: async () => (await import('./da')).da,
  sv: async () => (await import('./sv')).sv,
  nb: async () => (await import('./nb')).nb,
  de: async () => (await import('./de')).de,
  nl: async () => (await import('./nl')).nl,
  fr: async () => (await import('./fr')).fr,
  es: async () => (await import('./es')).es,
  it: async () => (await import('./it')).it,
  pt: async () => (await import('./pt')).pt,
  pl: async () => (await import('./pl')).pl,
  ja: async () => (await import('./ja')).ja,
  zh: async () => (await import('./zh')).zh,
} satisfies Record<string, () => Promise<Messages>>;

export type Locale = keyof typeof loaders;

/** Native names, so people can find their language whatever is currently shown. */
export const LANGUAGES: Record<Locale, string> = {
  en: 'English',
  da: 'Dansk',
  sv: 'Svenska',
  nb: 'Norsk bokmål',
  de: 'Deutsch',
  nl: 'Nederlands',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  pl: 'Polski',
  ja: '日本語',
  zh: '简体中文',
};

const STORAGE_KEY = 'cutlist:locale';
const ALIASES: Record<string, Locale> = { no: 'nb', nn: 'nb' };

const isLocale = (value: string): value is Locale => value in loaders;

/** Current messages. A live binding: importers always see the active locale. */
export let copy: Messages = en;
export let locale: Locale = 'en';

function detect(): Locale {
  try {
    const param = new URLSearchParams(window.location.search).get('lang')?.toLowerCase();
    if (param) {
      const base = param.split('-')[0]!;
      const match = isLocale(base) ? base : ALIASES[base];
      if (match) return match;
    }
  } catch {
    // search params unavailable
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) return stored;
  } catch {
    // storage unavailable
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0]!;
    const match = isLocale(base) ? base : ALIASES[base];
    if (match) return match;
  }
  return 'en';
}

export async function initLocale(): Promise<void> {
  locale = detect();
  try {
    copy = await loaders[locale]();
  } catch {
    locale = 'en';
    copy = en;
  }
  document.documentElement.lang = locale === 'zh' ? 'zh-Hans' : locale;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    canonical.href =
      locale === 'en'
        ? 'https://brianfroelund.github.io/cutlist/'
        : `https://brianfroelund.github.io/cutlist/?lang=${locale}`;
  }
}

export function setLocale(next: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable
  }
}

export function isLocaleCode(value: string): value is Locale {
  return isLocale(value);
}

const decimalSeparator = () => new Intl.NumberFormat(locale).format(1.5).charAt(1);

/** Swaps the decimal point for the locale's separator (e.g. "1200,5 mm" in Danish). */
export const localizeNumber = (text: string): string => text.replace('.', decimalSeparator());

export const fmtLength = (length: Length, units: UnitSystem): string =>
  localizeNumber(formatWithUnit(length, units));

export const fmtTotal = (length: Length, units: UnitSystem): string =>
  localizeNumber(formatTotal(length, units));

export const fmtArea = (areaVal: number, units: UnitSystem): string =>
  localizeNumber(formatArea(areaVal, units));

export const fmtSize = (length: Length, width: Length, units: UnitSystem): string => {
  const l = localizeNumber(formatLength(length, units));
  const w = localizeNumber(formatLength(width, units));
  return units === 'mm' ? `${l} × ${w} mm` : `${l} × ${w}″`;
};

export const fmtPct = (pct: number): string => localizeNumber(String(Math.round(pct * 10) / 10));

export const fmtDate = (date: Date): string =>
  date.toLocaleDateString(locale === 'zh' ? 'zh-Hans' : locale, { dateStyle: 'long' });
