<script lang="ts">
  import { floorPlanStore } from './stores/floorPlanStore.svelte';

  const tools = [
    { id: 'select', icon: '🖱️', label: 'Seleccionar' },
    { id: 'wall', icon: '🧱', label: 'Pared' },
    { id: 'window', icon: '🪟', label: 'Ventana' },
    { id: 'door', icon: '🚪', label: 'Puerta' },
    { id: 'dimension', icon: '📏', label: 'Medir' },
    { id: 'text', icon: '📝', label: 'Texto' },
    { id: 'furniture', icon: '🪑', label: 'Mobiliario' },
    { id: 'delete', icon: '🗑️', label: 'Eliminar', danger: true }
  ];

  function selectTool(toolId: string) {
    floorPlanStore.setTool(toolId);
  }
</script>

<div class="toolbar">
  <h3>✏️ Herramientas</h3>
  <div class="tool-grid">
    {#each tools as tool}
      <button
        class="tool-btn"
        class:active={floorPlanStore.currentTool === tool.id}
        class:danger={tool.danger}
        onclick={() => selectTool(tool.id)}
        title={tool.label}
      >
        <span class="icon">{tool.icon}</span>
        <span class="label">{tool.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .toolbar {
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #475569;
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tool-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .tool-btn.active {
    background: #2563eb;
    border-color: #1d4ed8;
    color: white;
  }

  .tool-btn.danger {
    color: #dc2626;
  }

  .tool-btn.danger.active {
    background: #dc2626;
    border-color: #b91c1c;
    color: white;
  }

  .icon {
    font-size: 20px;
  }

  .label {
    font-size: 11px;
    font-weight: 500;
  }
</style>
