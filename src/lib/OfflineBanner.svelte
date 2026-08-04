<script lang="ts">
  import { Badge } from '@swal/ui';

  let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);

  function handleOffline() {
    isOnline = false;
  }

  function handleOnline() {
    isOnline = true;
  }

  $effect(() => {
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  });
</script>

{#if !isOnline}
  <div class="offline-banner" role="alert" data-testid="offline-banner">
    <Badge variant="warning">Offline</Badge>
    <span class="offline-message">You are currently offline. Some features may be unavailable.</span>
  </div>
{/if}

<style>
  .offline-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--swal-warning-bg, rgba(245, 158, 11, 0.15));
    border-bottom: 1px solid var(--swal-warning, #f59e0b);
    color: var(--swal-text, #f1f5f9);
    font-size: 13px;
    z-index: 100;
  }
  .offline-message {
    opacity: 0.9;
  }
</style>
