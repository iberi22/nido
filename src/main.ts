// Cloudflare Pages deployment prep verified
// Wave 6.06: Manual chunks split for vendor-three, vendor-mesh, and vendor-swal configured.
import { mount } from 'svelte';
import './app.css';
import '@swal/ui/tokens';
import App from './App.svelte';
import { initDatabaseSync } from './lib/stores/sync.svelte';
import { listingsInRadius } from './lib/domain/discovery';
import { computeTrustScore } from './lib/domain/trust';

// Wave 5 #84 — PWA update flow: vite-plugin-pwa registerSW (autoUpdate, config from #83).
// The `virtual:pwa-register` module is injected at build/dev time only, so it is
// imported lazily and guarded by import.meta.env.PROD (vitest never resolves it).
async function registerPWA() {
  try {
    // @ts-ignore — virtual module injected by vite-plugin-pwa (typed via vite-env.d.ts)
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Surface the update banner in OfflineBanner.svelte
        window.dispatchEvent(new CustomEvent('nido:sw-update'));
      },
      onOfflineReady() {
        console.info('NIDO: app is ready to work offline.');
      },
    });
  } catch (err) {
    console.error('PWA registerSW failed:', err);
  }
}

// Register the PWA service worker (if supported)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    registerPWA();
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('ServiceWorker registered successfully:', reg))
      .catch(err => console.error('ServiceWorker registration failed:', err));
  });
}

// Expose for testing/E2E verification inside the browser (wave 4 #64)
if (typeof window !== 'undefined') {
  (window as any).nidoDiscovery = { listingsInRadius, computeTrustScore };
}

// Offline fallback handler (wave 4 #68)
export function handleOfflineFallback() {
  console.warn('App is offline. Using cached offline fallback state.');
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', handleOfflineFallback);
  window.addEventListener('online', () => {
    console.log('App is online. Synchronizing state...');
  });
}

// Initialize the sync
if (typeof document !== 'undefined' && document.getElementById('app')) {
  initDatabaseSync().then(() => {
    const app = mount(App, {
      target: document.getElementById('app')!,
    });
  });
}
