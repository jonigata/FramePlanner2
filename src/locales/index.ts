import { register, init } from 'svelte-i18n';
import { initLocaleFromStorage } from '../stores/i18n';

import en from './en.json';
import ja from './ja.json';

// Register locale dictionaries
register('en', () => Promise.resolve(en));
register('ja', () => Promise.resolve(ja));

// Initialize i18n
export function initI18n() {
  const savedLocale = initLocaleFromStorage();
  init({
    fallbackLocale: 'ja',
    initialLocale: savedLocale,
  });
}

// Export locale data for reference
export { en, ja };