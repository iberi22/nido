<script lang="ts">
  import CanvasStage from './lib/CanvasStage.svelte';
  import Toolbar from './lib/Toolbar.svelte';
  import FloorSelector from './lib/FloorSelector.svelte';
  import AIChat from './lib/AIChat.svelte';
  import NormsPanel from './lib/NormsPanel.svelte';
  import OfflineBanner from './lib/OfflineBanner.svelte';
  import MeshPanel from './lib/MeshPanel.svelte';
  import AdminPanel from './lib/AdminPanel.svelte';
  import { createMeshClient, type MeshClient } from './lib/domain/mesh';
  import { EdgeHiveClient } from './lib/maloca/client';
  import { isPro } from './lib/maloca/tier';
  import { generateInstanceId } from './lib/maloca/instance';
  import { floorPlanStore } from './lib/stores/floorPlanStore.svelte';
  import { Button, Card, Badge, StatusBadge, Tabs, Toaster } from '@swal/ui';
  import { toast } from './lib/vendor/swal-ui/lib/toast.svelte.js';

  let currentView = $state<'2d' | '3d'>('2d');
  let activeTab = $state('plan');
  let exportStatus = $state<'idle' | 'done' | 'error'>('idle');
  let showAIChat = $state(true);

  // Wave 5 #92 — Shell integration: DI clients created ONCE and passed via props.
  let instanceId = $state('');
  let meshClient = $state<MeshClient | null>(null);
  let adminClient = $state<{
    getInstanceId: () => string;
    getTier: () => Promise<{ isPro: boolean; name?: string }>;
    refresh: () => Promise<void>;
  } | null>(null);

  $effect(() => {
    // Guard: clients are created once per mount (instanceId persists the workspace).
    if (instanceId) return;
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('nido:instanceId') : null;
    instanceId = stored || generateInstanceId();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nido:instanceId', instanceId);
    }

    meshClient = createMeshClient(instanceId);

    // Maloca client (Wave 5 #06): edge-hive adapter wired into AdminPanel.
    const hive = new EdgeHiveClient();
    adminClient = {
      getInstanceId: () => instanceId,
      getTier: async () => {
        const node = await hive.getNodeStatus();
        return { isPro: isPro(node), name: node.active ? 'Pro Tier' : undefined };
      },
      refresh: async () => {
        await hive.syncInstance(instanceId, {});
      },
    };
  });

  const tabs = [
    { id: 'plan', label: 'Plans' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'taxes', label: 'Taxes' },
    { id: 'maintenance', label: 'Maintenance' }
  ] as const;

  function handleExport() {
    try {
      const json = JSON.stringify(floorPlanStore, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nido-property.json';
      a.click();
      URL.revokeObjectURL(url);
      exportStatus = 'done';
      toast.success('JSON exported');
    } catch (e) {
      exportStatus = 'error';
      toast.error('Export failed: ' + String(e));
    }
  }
</script>

<main class="nido-shell">
  <OfflineBanner />

  <header class="nido-topbar">
    <div class="topbar-left">
      <span class="logo-mark" aria-hidden="true">🏠</span>
      <div class="brand">
        <h1 class="brand-title">NIDO</h1>
        <span class="brand-sub">Intelligent Home Administration</span>
      </div>
      <Badge variant="info">Casa 3 Pisos</Badge>
      <StatusBadge status="healthy">Local</StatusBadge>
    </div>

    <div class="topbar-center">
      <Tabs bind:value={activeTab}>
        {#each tabs as tab}
          <button
            class="swal-tab"
            class:active={activeTab === tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-label={tab.label}
            data-testid={`tab-${tab.id}`}
            onclick={() => (activeTab = tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </Tabs>
    </div>

    <div class="topbar-right" role="group" aria-label="View mode">
      <Button
        variant={currentView === '2d' ? 'primary' : 'ghost'}
        size="sm"
        onclick={() => (currentView = '2d')}
        {...{
          'aria-pressed': currentView === '2d',
          'aria-label': '2D plan view',
          'data-testid': 'view-2d'
        }}
      >
        2D
      </Button>
      <Button
        variant={currentView === '3d' ? 'primary' : 'ghost'}
        size="sm"
        onclick={() => (currentView = '3d')}
        {...{
          'aria-pressed': currentView === '3d',
          'aria-label': '3D view',
          'data-testid': 'view-3d'
        }}
      >
        3D
      </Button>
      <Button
        variant="primary"
        size="sm"
        onclick={handleExport}
        {...{
          'aria-label': 'Export property JSON',
          'data-testid': 'export-json'
        }}
      >
        Export
      </Button>
      <Button
        variant={showAIChat ? 'primary' : 'ghost'}
        size="sm"
        onclick={() => (showAIChat = !showAIChat)}
        {...{
          'aria-label': 'Toggle AI Chat panel',
          'aria-pressed': showAIChat,
          'data-testid': 'toggle-ai-chat'
        }}
      >
        🤖 AI Chat
      </Button>
    </div>
  </header>

  <div class="nido-content">
    <aside class="nido-sidebar">
      <Card>
        <FloorSelector />
      </Card>
      <Card>
        <NormsPanel />
      </Card>
      {#if currentView === '2d'}
        <Card>
          <Toolbar />
        </Card>
        <Card>
          <h3 class="panel-title">⚙️ Global Parameters</h3>
          <div class="param-group">
            <label for="wall-thickness">Wall thickness (m)</label>
            <input id="wall-thickness" type="number" step="0.05" bind:value={floorPlanStore.config.wallThickness} />
          </div>
          <div class="param-group">
            <label for="scale">Scale (px/m)</label>
            <input id="scale" type="number" bind:value={floorPlanStore.config.scale} />
          </div>
        </Card>
      {/if}
      {#if meshClient}
        <Card>
          <MeshPanel client={meshClient} />
        </Card>
      {/if}
      {#if adminClient}
        <Card>
          <AdminPanel client={adminClient} />
        </Card>
      {/if}
    </aside>

    <section class="nido-main">
      {#if currentView === '2d'}
        <CanvasStage />
      {:else}
        {#await import('./lib/Scene3D.svelte') then { default: Scene3DComponent }}
          <Scene3DComponent />
        {:catch error}
          <div class="view-error">Error loading 3D view: {error.message}</div>
        {/await}
      {/if}
    </section>

    {#if showAIChat}
      <aside class="nido-sidebar-right" data-testid="ai-chat-panel">
        <Card>
          <details class="ai-panel" open>
            <summary class="panel-title">AI Assistant</summary>
            <AIChat />
          </details>
        </Card>
      </aside>
    {/if}
  </div>

  <Toaster />
</main>

<style>
  :global(body) {
    margin: 0;
    background: var(--swal-bg, #020617);
    color: var(--swal-text, #f1f5f9);
    font-family: var(--swal-font, Inter, sans-serif);
  }
  .nido-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--swal-bg, #020617);
    color: var(--swal-text, #f1f5f9);
  }
  .nido-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 16px;
    background: var(--swal-elevated, #0f172a);
    border-bottom: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
  }
  .topbar-left { display: flex; align-items: center; gap: 10px; }
  .logo-mark { font-size: 22px; }
  .brand-title { margin: 0; font-size: 16px; font-weight: 600; }
  /* Secondary on elevated: use text token for AA contrast on small type */
  .brand-sub { font-size: 11px; color: var(--swal-text, #f1f5f9); opacity: 0.85; }
  .topbar-center { display: flex; gap: 4px; }
  .swal-tab {
    background: transparent; border: none; color: var(--swal-text, #f1f5f9); opacity: 0.75;
    padding: 6px 12px; cursor: pointer; border-radius: 6px; font-size: 13px;
  }
  .swal-tab.active, .swal-tab:hover {
    color: var(--swal-accent, #06b6d4); opacity: 1;
    background: var(--swal-accent-muted, rgba(6, 182, 212, 0.15));
  }
  .topbar-right { display: flex; gap: 6px; }
  .nido-content { display: flex; flex: 1; min-height: 0; }
  .nido-sidebar {
    width: 280px; padding: 12px; display: flex; flex-direction: column; gap: 12px;
    background: var(--swal-elevated, #0f172a); border-right: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
    overflow-y: auto;
  }
  .panel-title { margin: 0 0 8px; font-size: 13px; color: var(--swal-text, #f1f5f9); opacity: 0.85; }
  .param-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
  .param-group label { font-size: 12px; color: var(--swal-text, #f1f5f9); opacity: 0.85; }
  .param-group input {
    background: var(--swal-surface, rgba(15, 23, 42, 0.8)); border: 1px solid var(--swal-border, rgba(255, 255, 255, 0.12));
    color: var(--swal-text, #f1f5f9); border-radius: 6px; padding: 6px 8px; font-size: 13px;
  }
  .nido-main { flex: 1; min-width: 0; background: var(--swal-void, #000000); position: relative; }
  .view-error {
    color: var(--swal-danger, #ef4444);
    padding: 20px;
  }
  .nido-sidebar-right {
    width: 280px; padding: 12px; display: flex; flex-direction: column; gap: 12px;
    background: var(--swal-elevated, #0f172a); border-left: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
    overflow-y: auto;
  }
  .ai-panel { color: var(--swal-text, #f1f5f9); }
  .ai-panel summary {
    cursor: pointer; margin-bottom: 8px; list-style: none;
  }
  .ai-panel summary::-webkit-details-marker { display: none; }
</style>
