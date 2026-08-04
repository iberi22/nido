import { es } from './messages/es';
import { en } from './messages/en';

export const catalogs = { es, en } as const;
export type SupportedLang = keyof typeof catalogs;

// Module-level reactive state using Svelte 5 $state
let _currentLang = $state<SupportedLang>('es');

/**
 * Object holding a reactive getter for the current language.
 */
export const currentLang = {
  get value(): SupportedLang {
    return _currentLang;
  }
};

/**
 * Returns the current active language code.
 */
export function getLang(): SupportedLang {
  return _currentLang;
}

/**
 * Changes the current language.
 */
export function setLang(lang: SupportedLang) {
  _currentLang = lang;
}

/**
 * Performs a dot-path lookup on a nested object.
 */
function getDotPath(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return acc[part];
    }
    return undefined;
  }, obj);
}

/**
 * Translation helper with dot-path lookup and fallback to ES.
 */
export function t(key: string): string {
  const lang = _currentLang;

  // 1. Look up in active language catalog
  let val = getDotPath(catalogs[lang], key);

  // 2. Fallback to ES if not found and active is not ES
  if (val === undefined && lang !== 'es') {
    val = getDotPath(catalogs.es, key);
  }

  // 3. Fallback to key itself
  if (val === undefined || typeof val !== 'string') {
    return key;
  }

  return val;
}
