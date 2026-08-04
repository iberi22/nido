import { t as _t } from './index.svelte';
export { setLang, currentLang, catalogs } from './index.svelte';
export type { SupportedLang } from './index.svelte';

export function t(key: string): string {
  return _t(key);
}
