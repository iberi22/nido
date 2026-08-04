<script lang="ts">
  import { floorPlanStore } from './stores/floorPlanStore.svelte';
  import { Button } from '@swal/ui';

  const tools = [
    { id: 'select', icon: '🖱️', label: 'Select' },
    { id: 'wall', icon: '🧱', label: 'Wall' },
    { id: 'zone', icon: '🟩', label: 'Zone' },
    { id: 'room', icon: '📍', label: 'Room' },
    { id: 'measure', icon: '📏', label: 'Measure' },
    { id: 'delete', icon: '🗑️', label: 'Delete', danger: true }
  ];

  const libraryItems = [
    { type: 'wall', icon: '🧱', label: 'Wall' },
    { type: 'door', icon: '🚪', label: 'Door' },
    { type: 'sliding_door', icon: '↔️', label: 'Sliding door' },
    { type: 'window', icon: '🪟', label: 'Window' },
    { type: 'furniture', icon: '🪑', label: 'Furniture' },
    { type: 'motorcycle', icon: '🏍️', label: 'Motorcycle' },
    { type: 'car', icon: '🚗', label: 'Car' }
  ];

  function selectTool(toolId: string) {
    floorPlanStore.setTool(toolId);
  }

  function handleDragStart(e: DragEvent, type: string) {
    e.dataTransfer?.setData('application/json', type);
    e.dataTransfer!.effectAllowed = 'copy';
  }

  function toolAttrs(tool: (typeof tools)[number]) {
    return {
      title: tool.label,
      'aria-label': tool.label,
      'aria-pressed': floorPlanStore.currentTool === tool.id,
      'data-testid': `tool-${tool.id}`
    };
  }

  function libraryAttrs(item: (typeof libraryItems)[number]) {
    return {
      title: item.label,
      'aria-label': `Drag ${item.label}`,
      'data-testid': `library-${item.type}`
    };
  }
</script>

<div class="toolbar">
  <h3 class="panel-title">✏️ Tools</h3>
  <div class="tool-grid" role="toolbar" aria-label="Drawing tools">
    {#each tools as tool}
      <Button
        variant={floorPlanStore.currentTool === tool.id ? 'primary' : (tool.danger ? 'danger' : 'ghost')}
        size="sm"
        onclick={() => selectTool(tool.id)}
        {...toolAttrs(tool)}
      >
        <span class="icon" aria-hidden="true">{tool.icon}</span>
        <span class="label">{tool.label}</span>
      </Button>
    {/each}
  </div>

  <div class="separator"></div>

  <h3 class="panel-title">📚 Library (Drag & Drop)</h3>
  <div class="tool-grid" role="group" aria-label="Component library">
    {#each libraryItems as item}
      <Button
        variant="ghost"
        size="sm"
        draggable={true}
        ondragstart={(e: DragEvent) => handleDragStart(e, item.type)}
        {...libraryAttrs(item)}
      >
        <span class="icon" aria-hidden="true">{item.icon}</span>
        <span class="label">{item.label}</span>
      </Button>
    {/each}
  </div>
</div>

<style>
  .toolbar { display: flex; flex-direction: column; gap: 8px; }
  .panel-title { margin: 0 0 4px; font-size: 13px; color: var(--swal-text, #f1f5f9); opacity: 0.85; }
  .tool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .icon { font-size: 14px; }
  .label { font-size: 11px; }
  .separator { height: 1px; background: var(--swal-border, rgba(255, 255, 255, 0.08)); margin: 4px 0; }
</style>
