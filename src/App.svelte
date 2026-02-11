<script lang="ts">
  import CanvasStage from './lib/CanvasStage.svelte';
  import Scene3D from './lib/Scene3D.svelte';
  import Toolbar from './lib/Toolbar.svelte';
  import FloorSelector from './lib/FloorSelector.svelte';
  import { floorPlanStore } from './lib/stores/floorPlanStore.svelte';

  let currentView = $state('2d'); // '2d' | '3d'
</script>

<main class="app-container">
  <header class="header">
    <div class="header-left">
      <span class="logo">🏠</span>
      <h1>Floor Plan Designer</h1>
      <span class="project-name">Casa 3 Pisos - Parametrizado</span>
    </div>

    <div class="view-selector">
      <button
        class:active={currentView === '2d'}
        onclick={() => currentView = '2d'}
      >
        ✏️ Editor 2D
      </button>
      <button
        class:active={currentView === '3d'}
        onclick={() => currentView = '3d'}
      >
        🧊 Visor 3D
      </button>
    </div>

    <div class="header-right">
      <button class="btn primary">📤 Exportar JSON</button>
    </div>
  </header>

  <div class="content">
    <aside class="sidebar">
      <FloorSelector />

      {#if currentView === '2d'}
        <Toolbar />
        <div class="properties-panel">
          <h3>⚙️ Parámetros Globales</h3>
          <div class="param-group">
            <label>Ancho Muros (m)</label>
            <input
              type="number"
              step="0.05"
              bind:value={floorPlanStore.config.wallThickness}
            />
          </div>
          <div class="param-group">
            <label>Escala (px/m)</label>
            <input
              type="number"
              bind:value={floorPlanStore.config.scale}
            />
          </div>
        </div>
      {/if}

      <div class="info-panel">
        <h3>ℹ️ Info Proyecto</h3>
        <p>Terreno: {floorPlanStore.config.plot.width}m × {floorPlanStore.config.plot.height}m</p>
        <p>Área: {floorPlanStore.config.plot.width * floorPlanStore.config.plot.height}m²</p>
        <p>Piso Actual: {floorPlanStore.currentFloor.name}</p>
      </div>
    </aside>

    <div class="viewport">
      {#if currentView === '2d'}
        <CanvasStage />
      {:else}
        <Scene3D />
      {/if}
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    color: #1e293b;
    height: 100vh;
    overflow: hidden;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .header {
    height: 60px;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header h1 {
    font-size: 18px;
    margin: 0;
    font-weight: 700;
  }

  .project-name {
    padding: 4px 8px;
    background: #f1f5f9;
    border-radius: 4px;
    font-size: 12px;
    color: #64748b;
  }

  .view-selector {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 8px;
  }

  .view-selector button {
    border: none;
    background: transparent;
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    transition: all 0.2s;
  }

  .view-selector button.active {
    background: white;
    color: #2563eb;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }

  .btn.primary {
    background: #2563eb;
    color: white;
  }

  .content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .viewport {
    flex: 1;
    display: flex;
    position: relative;
    background: #f8fafc;
  }

  .properties-panel, .info-panel {
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #475569;
  }

  p {
    font-size: 13px;
    color: #64748b;
    margin: 4px 0;
  }
</style>
