// Cloudflare Pages deployment prep verified
import { mount } from 'svelte';
import './app.css';
import '@swal/ui/tokens';
import App from './App.svelte';
import { initDatabaseSync } from './lib/stores/sync.svelte';
import { listingsInRadius } from './lib/domain/discovery';
import { computeTrustScore } from './lib/domain/trust';
import { subscribeToPush, requestPushPermission } from './lib/push';

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
      .then(async (reg) => {
        console.log('ServiceWorker registered successfully:', reg);
        // Wire push subscription if permission granted (guarded, non-blocking)
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const sub = await subscribeToPush(reg);
            if (sub) {
              console.log('NIDO: Auto push subscription renewed:', sub);
            }
          } catch (err) {
            console.error('NIDO: Failed to auto-subscribe to push:', err);
          }
        }
      })
      .catch(err => console.error('ServiceWorker registration failed:', err));
  });
}

// Wire manual enable-push button if permission is default (guarded, non-blocking)
if (typeof document !== 'undefined') {
  window.addEventListener('load', () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const btn = document.createElement('button');
      btn.id = 'enable-push-btn';
      btn.setAttribute('data-testid', 'enable-push');
      btn.innerText = 'Enable Push Notifications';
      btn.style.position = 'fixed';
      btn.style.bottom = '16px';
      btn.style.right = '16px';
      btn.style.zIndex = '9999';
      btn.style.background = 'var(--swal-accent, #06b6d4)';
      btn.style.color = '#ffffff';
      btn.style.border = 'none';
      btn.style.padding = '8px 16px';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = 'bold';
      btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

      btn.addEventListener('click', async () => {
        const permission = await requestPushPermission();
        if (permission === 'granted') {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            const sub = await subscribeToPush(reg);
            if (sub) {
              console.log('NIDO: Manual push subscription successful:', sub);
            }
          }
        }
        btn.remove();
      });

      document.body.appendChild(btn);
    }
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
