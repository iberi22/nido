<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Badge, Button, StatusBadge } from '@swal/ui';
  import { toast } from './vendor/swal-ui/lib/toast.svelte.js';

  // Props using Svelte 5 runes (DI style)
  let { client } = $props<{
    client: {
      getInstanceId?: () => string;
      instanceId?: string;
      getTier?: () => Promise<{ isPro: boolean; name?: string }> | { isPro: boolean; name?: string };
      tier?: { isPro: boolean; name?: string };
      refresh?: () => Promise<void> | void;
    };
  }>();

  // Component state using runes
  let loading = $state(false);
  let error = $state<string | null>(null);
  let tier = $state<{ isPro: boolean; name?: string } | null>(null);
  let instanceId = $state<string>('');
  let copied = $state(false);

  // Derived properties
  let isPro = $derived(!!tier?.isPro);

  async function loadData() {
    loading = true;
    error = null;
    try {
      // 1. Resolve instance ID
      if (client) {
        if (typeof client.getInstanceId === 'function') {
          instanceId = client.getInstanceId();
        } else if (client.instanceId !== undefined) {
          instanceId = client.instanceId;
        } else {
          instanceId = 'unknown';
        }

        // 2. Resolve tier
        if (typeof client.getTier === 'function') {
          const res = await client.getTier();
          tier = res;
        } else if (client.tier !== undefined) {
          tier = client.tier;
        } else {
          tier = { isPro: false };
        }
      } else {
        throw new Error('No client provided');
      }
    } catch (err: any) {
      error = err.message || 'Failed to query SWAL node status';
    } finally {
      loading = false;
    }
  }

  async function handleRefresh() {
    if (!client) return;
    loading = true;
    error = null;
    try {
      if (typeof client.refresh === 'function') {
        await client.refresh();
      }
      await loadData();
      toast.success('Node status refreshed successfully');
    } catch (err: any) {
      error = err.message || 'Failed to refresh node status';
      toast.error('Refresh failed: ' + error);
    } finally {
      loading = false;
    }
  }

  async function copyInstanceId() {
    if (!instanceId) return;
    try {
      await navigator.clipboard.writeText(instanceId);
      copied = true;
      toast.success('Instance ID copied');
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err: any) {
      toast.error('Failed to copy: ' + String(err));
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="admin-panel-container" data-testid="admin-panel">
  <Card variant="elevated">
    <div class="admin-header">
      <h3 class="panel-title">⚙️ Maloca Node Admin</h3>
      {#if loading}
        <span class="loading-indicator">Syncing...</span>
      {/if}
    </div>

    {#if error}
      <div class="error-msg" data-testid="error-message" role="alert">
        ⚠️ Degraded Mode: {error}
      </div>
    {/if}

    <div class="admin-grid">
      <!-- Node Status Row -->
      <div class="grid-item">
        <span class="grid-label">Node Status</span>
        <div class="grid-value status-row">
          <StatusBadge status={isPro ? 'healthy' : 'offline'} />
          <span data-testid="node-status-text" class="status-text">
            {isPro ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <!-- Tier Label Row -->
      <div class="grid-item">
        <span class="grid-label">Tier</span>
        <div class="grid-value" data-testid="tier-badge-container">
          {#if isPro}
            <Badge variant="orange">Pro</Badge>
            <span class="tier-desc">Active Node</span>
          {:else}
            <Badge variant="neutral">Free</Badge>
            <span class="tier-desc">Mesh without cloud</span>
          {/if}
        </div>
      </div>

      <!-- Instance ID Row -->
      <div class="grid-item full-width">
        <span class="grid-label">Instance ID</span>
        <div class="instance-row">
          <code class="instance-code" data-testid="instance-id">{instanceId || 'loading...'}</code>
          <Button
            variant="ghost"
            size="sm"
            onclick={copyInstanceId}
            disabled={!instanceId}
            {...{ 'data-testid': 'copy-btn', 'aria-label': 'Copy Instance ID to clipboard' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
    </div>

    <div class="admin-actions">
      <Button
        variant="primary"
        size="sm"
        onclick={handleRefresh}
        disabled={loading}
        {...{ 'data-testid': 'refresh-btn' }}
      >
        {loading ? 'Refreshing...' : 'Refresh Status'}
      </Button>
    </div>
  </Card>
</div>

<style>
  .admin-panel-container {
    display: flex;
    flex-direction: column;
    gap: var(--swal-space-3);
  }
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--swal-border);
    padding-bottom: var(--swal-space-2);
    margin-bottom: var(--swal-space-3);
  }
  .panel-title {
    margin: 0;
    font-size: var(--swal-font-size-sm);
    font-weight: 600;
    color: var(--swal-text);
  }
  .loading-indicator {
    font-size: var(--swal-font-size-xs);
    color: var(--swal-text-secondary);
    animation: swal-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .error-msg {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: var(--swal-danger);
    padding: var(--swal-space-2) var(--swal-space-3);
    border-radius: var(--swal-radius-sm);
    font-size: var(--swal-font-size-xs);
    margin-bottom: var(--swal-space-3);
  }
  .admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--swal-space-3);
    margin-bottom: var(--swal-space-4);
  }
  .grid-item {
    display: flex;
    flex-direction: column;
    gap: var(--swal-space-1);
  }
  .grid-item.full-width {
    grid-column: span 2;
  }
  .grid-label {
    font-size: var(--swal-font-size-xs);
    color: var(--swal-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .grid-value {
    display: flex;
    align-items: center;
    gap: var(--swal-space-2);
  }
  .status-row {
    height: 24px;
  }
  .status-text {
    font-size: var(--swal-font-size-sm);
    font-weight: 500;
    color: var(--swal-text);
  }
  .tier-desc {
    font-size: var(--swal-font-size-xs);
    color: var(--swal-text-secondary);
  }
  .instance-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--swal-space-2);
    background: var(--swal-surface);
    border: 1px solid var(--swal-border);
    padding: var(--swal-space-2);
    border-radius: var(--swal-radius-sm);
  }
  .instance-code {
    font-family: var(--swal-font-mono);
    font-size: var(--swal-font-size-xs);
    color: var(--swal-text);
    word-break: break-all;
    overflow-x: auto;
  }
  .admin-actions {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--swal-border);
    padding-top: var(--swal-space-3);
  }
</style>
