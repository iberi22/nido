import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import OfflineBanner from '../../src/lib/OfflineBanner.svelte';

describe('OfflineBanner component', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    cleanup();
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    // Restore online state
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
    cleanup();
  });

  it('does not render when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const { container } = render(OfflineBanner);
    const banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner).toBeNull();
  });

  it('renders banner when offline event fires', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const { container } = render(OfflineBanner);

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    window.dispatchEvent(new Event('offline'));
    await tick();

    const banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Offline');
  });

  it('hides banner when online event fires', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { container } = render(OfflineBanner);

    // Verify banner is shown
    let banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner).not.toBeNull();

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    await tick();

    banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner).toBeNull();
  });

  it('has correct data-testid attribute', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { container } = render(OfflineBanner);

    const banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('data-testid')).toBe('offline-banner');
  });

  it('displays warning message when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { container } = render(OfflineBanner);

    const banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner?.textContent).toContain('Some features may be unavailable');
  });

  it('banner has role alert for accessibility', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const { container } = render(OfflineBanner);

    const banner = container.querySelector('[data-testid="offline-banner"]');
    expect(banner?.getAttribute('role')).toBe('alert');
  });
});
