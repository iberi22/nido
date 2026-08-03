import { mount } from 'svelte';
import './app.css';
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

// Initialize the sync
initDatabaseSync().then(() => {
  const app = mount(App, {
    target: document.getElementById('app')!,
  });
});
