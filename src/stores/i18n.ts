import { writable } from 'svelte/store';
import { locale } from 'svelte-i18n';

// Available languages
export const availableLocales = ['ja', 'en'] as const;
export type Locale = typeof availableLocales[number];

// Language labels for UI
export const localeLabels: Record<Locale, string> = {
  ja: '日本語',
  en: 'English'
};

// Initialize locale from storage first
const initialStoredLocale = (() => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('frameplanner-locale') as Locale;
    if (saved && availableLocales.includes(saved)) {
      return saved;
    }
  }
  // Fallback to browser language or Japanese
  const browserLang = navigator.language.split('-')[0] as Locale;
  return availableLocales.includes(browserLang) ? browserLang : 'ja';
})();

// Current locale store (synced with svelte-i18n)
export const currentLocale = writable<Locale>(initialStoredLocale);

// Sync with svelte-i18n locale store
currentLocale.subscribe((newLocale) => {
  locale.set(newLocale);
  // Save to localStorage for persistence
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('frameplanner-locale', newLocale);
  }
});

// Initialize from localStorage or browser preference
export function initLocaleFromStorage(): Locale {
  return initialStoredLocale;
}

// Set initial locale (now redundant as currentLocale is initialized properly)
export function setInitialLocale() {
  // This is now handled by currentLocale initialization
}