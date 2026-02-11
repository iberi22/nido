<script lang="ts">
  import { floorPlanStore } from './stores/floorPlanStore.svelte';

  const floors = [
    { id: 'ground', icon: '🏗️', label: 'Piso 1 (4m)', description: 'Bodega/Parqueadero' },
    { id: 'second', icon: '🏠', label: 'Piso 2', description: 'Apartamentos' },
    { id: 'third', icon: '🏢', label: 'Piso 3', description: 'Apartamentos' },
    { id: 'roof', icon: '☁️', label: 'Terraza', description: 'Área social' }
  ];

  function selectFloor(floorId: string) {
    floorPlanStore.setFloor(floorId as any);
  }
</script>

<div class="floor-selector">
  <h3>📋 Piso</h3>
  <div class="floor-buttons">
    {#each floors as floor}
      <button
        class="floor-btn"
        class:active={floorPlanStore.currentFloorId === floor.id}
        onclick={() => selectFloor(floor.id)}
      >
        <span class="icon">{floor.icon}</span>
        <div class="info">
          <span class="label">{floor.label}</span>
          <span class="desc">{floor.description}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .floor-selector {
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #475569;
  }

  .floor-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .floor-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .floor-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .floor-btn.active {
    background: #2563eb;
    border-color: #1d4ed8;
    color: white;
  }

  .icon {
    font-size: 24px;
  }

  .info {
    display: flex;
    flex-direction: column;
  }

  .label {
    font-size: 13px;
    font-weight: 600;
  }

  .desc {
    font-size: 11px;
    opacity: 0.7;
  }
</style>
