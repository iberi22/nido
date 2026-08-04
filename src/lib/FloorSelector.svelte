<script lang="ts">
  import { floorPlanStore } from './stores/floorPlanStore.svelte';
  import { Button } from '@swal/ui';

  const floors = [
    { id: 'ground', icon: '🏗️', label: 'Floor 1 (4m)', description: 'Bodega/Parking' },
    { id: 'second', icon: '🏠', label: 'Floor 2', description: 'Apartments' },
    { id: 'third', icon: '🏢', label: 'Floor 3', description: 'Apartments' },
    { id: 'roof', icon: '☁️', label: 'Terrace', description: 'Social area' }
  ];

  function selectFloor(floorId: string) {
    floorPlanStore.setFloor(floorId);
  }

  function floorAttrs(floor: (typeof floors)[number]) {
    return {
      'aria-label': `${floor.label}: ${floor.description}`,
      'aria-pressed': floorPlanStore.currentFloorId === floor.id,
      'data-testid': `floor-${floor.id}`
    };
  }
</script>

<div class="floor-selector">
  <h3 class="panel-title">📋 Floor</h3>
  <div class="floor-buttons" role="group" aria-label="Floor selection">
    {#each floors as floor}
      <Button
        variant={floorPlanStore.currentFloorId === floor.id ? 'primary' : 'ghost'}
        size="sm"
        fullWidth
        onclick={() => selectFloor(floor.id)}
        {...floorAttrs(floor)}
      >
        <span class="icon" aria-hidden="true">{floor.icon}</span>
        <span class="info">
          <span class="label">{floor.label}</span>
          <span class="desc">{floor.description}</span>
        </span>
      </Button>
    {/each}
  </div>
</div>

<style>
  .floor-selector { display: flex; flex-direction: column; gap: 8px; }
  .panel-title { margin: 0 0 4px; font-size: 13px; color: var(--swal-text, #f1f5f9); opacity: 0.85; }
  .floor-buttons { display: flex; flex-direction: column; gap: 6px; }
  .icon { font-size: 14px; }
  .info { display: flex; flex-direction: column; align-items: flex-start; }
  .label { font-size: 12px; font-weight: 500; }
  .desc { font-size: 10px; opacity: 0.85; color: var(--swal-text, #f1f5f9); }
</style>
