import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLang, currentLang } from '../../src/lib/i18n/index';
import { es } from '../../src/lib/i18n/messages/es';
import { en } from '../../src/lib/i18n/messages/en';

describe('i18n subsystem', () => {
  beforeEach(() => {
    // Reset to ES before each test
    setLang('es');
  });

  it('should have identical key sets in both Spanish and English catalogs', () => {
    function getKeysDeep(obj: any, prefix = ''): string[] {
      let keys: string[] = [];
      for (const key of Object.keys(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          keys.push(...getKeysDeep(obj[key], fullPath));
        } else {
          keys.push(fullPath);
        }
      }
      return keys.sort();
    }

    const esKeys = getKeysDeep(es);
    const enKeys = getKeysDeep(en);

    expect(esKeys).toEqual(enKeys);
    expect(esKeys.length).toBeGreaterThan(0);
  });

  it('should resolve nested keys in ES language by default', () => {
    expect(currentLang.value).toEqual('es');
    expect(t('tabs.plan')).toEqual('Planos');
    expect(t('tabs.inventory')).toEqual('Inventario');
    expect(t('offline.badge')).toEqual('Desconectado');
  });

  it('should resolve nested keys in EN language after switching', () => {
    setLang('en');
    expect(currentLang.value).toEqual('en');
    expect(t('tabs.plan')).toEqual('Plans');
    expect(t('tabs.inventory')).toEqual('Inventory');
    expect(t('offline.badge')).toEqual('Offline');
  });

  it('should fallback to ES if a key is missing in the EN catalog', () => {
    // Dynamically inject a temporary key in ES but not in EN
    (es as any).temporaryFallbackKeyOnly = 'Fallback en Español';

    setLang('en');
    // Calling t with the temporary key should resolve to the ES value since it is absent in EN
    expect(t('temporaryFallbackKeyOnly')).toEqual('Fallback en Español');

    // Clean up
    delete (es as any).temporaryFallbackKeyOnly;
  });

  it('should switch t() output dynamically when setLang is called', () => {
    expect(t('tabs.taxes')).toEqual('Impuestos');
    setLang('en');
    expect(t('tabs.taxes')).toEqual('Taxes');
    setLang('es');
    expect(t('tabs.taxes')).toEqual('Impuestos');
  });

  it('should return the key itself if the key is unknown in both catalogs', () => {
    expect(t('nonexistent.key.path')).toEqual('nonexistent.key.path');
    expect(t('someRandomText')).toEqual('someRandomText');
  });
});
