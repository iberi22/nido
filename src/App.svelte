<script lang="ts">
  import CanvasStage from './lib/CanvasStage.svelte';
  import Toolbar from './lib/Toolbar.svelte';
  import FloorSelector from './lib/FloorSelector.svelte';
  import AIChat from './lib/AIChat.svelte';
  import NormsPanel from './lib/NormsPanel.svelte';
  import OfflineBanner from './lib/OfflineBanner.svelte';
  import MeshPanel from './lib/MeshPanel.svelte';
  import AdminPanel from './lib/AdminPanel.svelte';
  import Onboarding from './lib/Onboarding.svelte';
  import { t, setLang, getLang, type SupportedLang } from './lib/i18n/index.svelte';
  import { createMeshClient, type MeshClient } from './lib/domain/mesh';
  import { EdgeHiveClient } from './lib/maloca/client';
  import { isPro } from './lib/maloca/tier';
  import { generateInstanceId } from './lib/maloca/instance';
  import { floorPlanStore } from './lib/stores/floorPlanStore.svelte';
  import { AppShell, Icon, ThemeModeSwitch, Button, Card, Badge, StatusBadge, Toaster } from '@swal/ui';
  import { toast } from '@swal/ui/toast';

  let currentView = $state<'2d' | '3d'>('2d');
  let activeTab = $state('plan');
  let exportStatus = $state<'idle' | 'done' | 'error'>('idle');
  let showAIChat = $state(true);
  let showOnboarding = $state(false);

  // Wave 5 #92 — Shell integration: DI clients created ONCE and passed via props.
  let instanceId = $state('');
  let meshClient = $state<MeshClient | null>(null);
  let adminClient = $state<{
    getInstanceId: () => string;
    getTier: () => Promise<{ isPro: boolean; name?: string }>;
    refresh: () => Promise<void>;
  } | null>(null);

  $effect(() => {
    if (typeof localStorage !== 'undefined') {
      const seen = localStorage.getItem('nido_onboarding_seen');
      const isAutomation = navigator.userAgent.includes('HeadlessChrome') || navigator.webdriver;
      if (seen !== 'true' && !isAutomation) {
        showOnboarding = true;
      }
    }
  });

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

  // Core shell nav: hash hrefs (no router); activeTab drives currentPath.
  const tabs = $derived([
    { id: 'plan', href: '#/plan', icon: 'home', label: t('global.plans') },
    { id: 'inventory', href: '#/inventory', icon: 'package', label: t('global.inventory') },
    { id: 'taxes', href: '#/taxes', icon: 'receipt', label: t('global.taxes') },
    { id: 'maintenance', href: '#/maintenance', icon: 'sliders', label: t('global.maintenance') }
  ]);
  let menuOpen = $state(false);

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

<div class="nido-root">
  <OfflineBanner />

  <AppShell
    items={tabs}
    currentPath={`#/${activeTab}`}
    bind:menuOpen
    menuLabel={t('app.title')}
    data-testid="app-shell"
  >
    {#snippet brand()}
      <Icon name="home" size={20} />
      <span class="brand">
        <strong class="brand-title">{t('app.title')}</strong>
        <span class="brand-sub">{t('app.subtitle')}</span>
      </span>
    {/snippet}

    {#snippet navFooter()}
      <Badge variant="info">{t('app.badge')}</Badge>
      <StatusBadge status="healthy">{t('app.local')}</StatusBadge>
    {/snippet}

    {#snippet topbar()}
      <div class="topbar-right" role="group" aria-label="View mode">
        <ThemeModeSwitch />
        <div class="lang-selector-wrapper">
          <select
            value={getLang()}
            onchange={(e) => setLang((e.target as HTMLSelectElement).value as SupportedLang)}
            data-testid="language-selector"
            class="swal-select"
          >
            <option value="en">{t('lang.en')}</option>
            <option value="es">{t('lang.es')}</option>
          </select>
        </div>

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
          {t('view.2d')}
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
          {t('view.3d')}
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
          {t('btn.export')}
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
          {t('btn.aiChat')}
        </Button>
      </div>
    {/snippet}

  {#if showOnboarding}
    <Onboarding ondismiss={() => (showOnboarding = false)} />
  {/if}

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

  </AppShell>

  <Toaster />
</div>

<style>
  .nido-root { min-height: 100dvh; }
  .brand { display: flex; flex-direction: column; min-width: 0; }
  .brand-title { font-size: 16px; font-weight: 600; }
  .brand-sub { font-size: 11px; color: var(--swal-text); opacity: 0.85; }
  .topbar-right { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .swal-select {
    background: var(--swal-surface);
    border: 1px solid var(--swal-border);
    color: var(--swal-text);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s ease;
  }
  .swal-select:hover { border-color: var(--swal-accent); }
  .nido-content { display: flex; height: calc(100dvh - 8rem); min-height: 480px; }
  .nido-sidebar {
    width: 280px; padding: 12px; display: flex; flex-direction: column; gap: 12px;
    background: var(--swal-elevated); border-right: 1px solid var(--swal-border);
    overflow-y: auto;
  }
  .panel-title { margin: 0 0 8px; font-size: 13px; color: var(--swal-text); opacity: 0.85; }
  .param-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
  .param-group label { font-size: 12px; color: var(--swal-text); opacity: 0.85; }
  .param-group input {
    background: var(--swal-surface); border: 1px solid var(--swal-border);
    color: var(--swal-text); border-radius: 6px; padding: 6px 8px; font-size: 13px;
  }
  .nido-main { flex: 1; min-width: 0; background: var(--swal-void); position: relative; }
  .view-error { color: var(--swal-danger, #ef4444); padding: 20px; }
  .nido-sidebar-right {
    width: 280px; padding: 12px; display: flex; flex-direction: column; gap: 12px;
    background: var(--swal-elevated); border-left: 1px solid var(--swal-border);
    overflow-y: auto;
  }
  .ai-panel { color: var(--swal-text); }
  .ai-panel summary { cursor: pointer; margin-bottom: 8px; list-style: none; }
  .ai-panel summary::-webkit-details-marker { display: none; }
  @media (max-width: 900px) {
    .nido-content { flex-direction: column; height: auto; }
    .nido-sidebar, .nido-sidebar-right { width: auto; border: none; }
    .nido-main { min-height: 60vh; }
  }
</style>
