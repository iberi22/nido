// Cloudflare Pages deployment prep verified
import { mount } from 'svelte';
import './app.css';
import '@swal/ui/tokens';
import App from './App.svelte';
import { initDatabaseSync } from './lib/stores/sync.svelte';
import { listingsInRadius } from './lib/domain/discovery';
import { computeTrustScore } from './lib/domain/trust';

// Register the PWA service worker via vite-plugin-pwa (autoUpdate)
// Use variable indirection to prevent Vite static analysis in test env
if (import.meta.env.PROD) {
  const pwaModule = 'virtual:pwa-register';
  const { registerSW } = await import(/* @vite-ignore */ pwaModule);
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        console.log('ServiceWorker registered:', swUrl);
      }
    },
    onOfflineReady() {
      console.log('PWA offline content ready');
    },
  });

  // Expose for testing/E2E — allows triggering update flow from outside
  if (typeof window !== 'undefined') {
    (window as any).__nidoUpdateSW = updateSW;
  }
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
