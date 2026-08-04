import { mount } from 'svelte';
import './app.css';
import '@swal/ui/tokens';
import App from './App.svelte';
import { initDatabaseSync } from './lib/stores/sync.svelte';

// Register the PWA service worker (if supported)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('ServiceWorker registered successfully:', reg))
      .catch(err => console.error('ServiceWorker registration failed:', err));
  });
}

<<<<<<< HEAD
import { listingsInRadius } from './lib/domain/discovery';
import { computeTrustScore } from './lib/domain/trust';

// Expose for testing/E2E verification inside the browser
if (typeof window !== 'undefined') {
  (window as any).nidoDiscovery = { listingsInRadius, computeTrustScore };
}

// Initialize the sync
initDatabaseSync().then(() => {
  const app = mount(App, {
    target: document.getElementById('app')!,
=======
// Offline fallback handler
export function handleOfflineFallback() {
  console.warn('App is offline. Using cached offline fallback state.');
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', handleOfflineFallback);
  window.addEventListener('online', () => {
    console.log('App is online. Synchronizing state...');
>>>>>>> origin/wave-4-11-pwa-offline-ci-gate-2267331652733626161
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
