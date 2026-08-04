import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

describe('PWA Registration and Offline Support', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies that vite-plugin-pwa manifest is configured and present', () => {
    const viteConfigPath = join(ROOT, 'vite.config.ts');
    expect(existsSync(viteConfigPath)).toEqual(true);

    const configContent = readFileSync(viteConfigPath, 'utf8');
    // Ensure VitePWA and manifest are present
    expect(configContent).toContain('VitePWA');
    expect(configContent).toContain('manifest');
    expect(configContent).toContain("name: 'NIDO'");
    expect(configContent).toContain("theme_color: '#020617'");
    expect(configContent).toContain('pwa-192x192.png');
    expect(configContent).toContain('pwa-512x512.png');
  });

  it('verifies the service worker registration code path is configured with correct sw.js URL', () => {
    const mainPath = join(ROOT, 'src', 'main.ts');
    expect(existsSync(mainPath)).toEqual(true);

    const mainContent = readFileSync(mainPath, 'utf8');
    // Assert the registration path uses the real URL /sw.js
    expect(mainContent).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(mainContent).toContain("'serviceWorker' in navigator");
  });

  it('verifies offline fallback handler is registered and exists in main.ts', () => {
    const mainPath = join(ROOT, 'src', 'main.ts');
    expect(existsSync(mainPath)).toEqual(true);

    const mainContent = readFileSync(mainPath, 'utf8');
    // Ensure the offline fallback handler exists
    expect(mainContent).toContain('handleOfflineFallback');
    expect(mainContent).toContain("window.addEventListener('offline', handleOfflineFallback)");
    expect(mainContent).toContain("window.addEventListener('online'");
  });

  it('asserts handleOfflineFallback function behavior', async () => {
    // Import from main.ts
    const { handleOfflineFallback } = await import('../../src/main');
    expect(handleOfflineFallback).toBeDefined();
    expect(typeof handleOfflineFallback).toBe('function');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    handleOfflineFallback();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('App is offline. Using cached offline fallback state.')
    );
  });
});
