import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import OfflineBanner from '../../src/lib/OfflineBanner.svelte';

// NIDO — unit tests for feature: pwa-offline (Wave 5 #84)
// OfflineBanner: online/offline events, initial offline state, and the PWA
// update flow (reload on new SW). No network — all events are dispatched locally.

function setOnlineState(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
}

describe('PWA offline UX — OfflineBanner', () => {
  beforeEach(() => {
    cleanup();
    setOnlineState(true);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1. renders the offline banner when the offline event fires and hides it initially', async () => {
    const { getByTestId, queryByTestId } = render(OfflineBanner);
    await tick();
    expect(queryByTestId('offline-banner')).toBeNull(); // online at start

    setOnlineState(false);
    window.dispatchEvent(new Event('offline'));
    await tick();

    const banner = getByTestId('offline-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Offline');
  });

  it('2. hides the banner when the app comes back online', async () => {
    const { getByTestId, queryByTestId } = render(OfflineBanner);
    await tick();

    setOnlineState(false);
    window.dispatchEvent(new Event('offline'));
    await tick();
    expect(getByTestId('offline-banner')).toBeTruthy();

    setOnlineState(true);
    window.dispatchEvent(new Event('online'));
    await tick();
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('3. shows the banner immediately when the app starts offline', () => {
    setOnlineState(false);
    const { getByTestId } = render(OfflineBanner);
    expect(getByTestId('offline-banner')).toBeTruthy();
  });

  it('4. update flow: shows the update banner on nido:sw-update and reloads on click', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy },
    });

    const { getByTestId, queryByTestId } = render(OfflineBanner);
    await tick();
    expect(queryByTestId('update-banner')).toBeNull();

    window.dispatchEvent(new CustomEvent('nido:sw-update'));
    await tick();

    const updateBanner = getByTestId('update-banner');
    expect(updateBanner).toBeTruthy();
    expect(updateBanner.textContent).toContain('new version');

    await fireEvent.click(getByTestId('reload-btn'));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('5. main.ts wires registerSW (autoUpdate) and dispatches the nido:sw-update event', () => {
    // fs-based contract check (same style as test/integration/pwa-registration.test.ts)
    const fs = require('fs');
    const main = fs.readFileSync('src/main.ts', 'utf8');
    expect(main).toContain('virtual:pwa-register');
    expect(main).toContain('registerSW');
    expect(main).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(main).toContain('nido:sw-update');
  });
});
