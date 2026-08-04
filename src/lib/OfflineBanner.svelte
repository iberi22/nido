<script lang="ts">
  // NIDO — PWA offline UX (Wave 5 #84)
  // Svelte 5 (runes) + @swal/ui only (G3). Shows a banner when the app goes
  // offline (data-testid="offline-banner") and hides it when back online.
  // Also surfaces the PWA update flow: when main.ts (registerSW onNeedRefresh)
  // dispatches a `nido:sw-update` CustomEvent, an update banner with a Reload
  // button is shown (data-testid="update-banner" / "reload-btn").
  import { Badge, Button } from '@swal/ui';

  let isOffline = $state(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  let updateAvailable = $state(false);

  function handleOnline() {
    isOffline = false;
  }

  function handleOffline() {
    isOffline = true;
  }

  function handleSWUpdate() {
    updateAvailable = true;
  }

  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nido:sw-update', handleSWUpdate);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nido:sw-update', handleSWUpdate);
    };
  });

  function reloadForUpdate() {
    window.location.reload();
  }
</script>

{#if isOffline}
  <div class="offline-banner" data-testid="offline-banner" role="status" aria-live="polite">
    <Badge variant="danger">Offline</Badge>
    <span class="banner-msg">You are offline — changes are queued locally and sync when you reconnect.</span>
  </div>
{:else if updateAvailable}
  <div class="update-banner" data-testid="update-banner" role="status" aria-live="polite">
    <Badge variant="info">Update</Badge>
    <span class="banner-msg">A new version of NIDO is available.</span>
    <Button
      variant="primary"
      size="sm"
      onclick={reloadForUpdate}
      {...{ 'data-testid': 'reload-btn' }}
    >
      Reload
    </Button>
  </div>
{/if}

<style>
  .offline-banner,
  .update-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    font-size: 13px;
    color: var(--swal-text, #f1f5f9);
    border-bottom: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
  }
  .offline-banner {
    background: rgba(239, 68, 68, 0.12);
  }
  .update-banner {
    background: rgba(6, 182, 212, 0.12);
  }
  .banner-msg {
    flex: 1;
  }
</style>
