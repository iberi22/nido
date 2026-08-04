import { floorPlanStore } from './floorPlanStore.svelte';
import { loadFromIndexedDB, saveToIndexedDB } from '../domain/db';

export async function initDatabaseSync() {
  // 1. Load initial state from IndexedDB
  try {
    if (floorPlanStore.dbLoadPromise) {
      await floorPlanStore.dbLoadPromise;
    }
    const saved = await loadFromIndexedDB();
    if (saved) {
      if (saved.currentFloorId && floorPlanStore.floors[saved.currentFloorId]) {
        floorPlanStore.currentFloorId = saved.currentFloorId;
      }
      if (typeof saved.zoom === 'number') {
        floorPlanStore.zoom = saved.zoom;
      }
      if (saved.config) {
        Object.assign(floorPlanStore.config, saved.config);
      }
      if (saved.floors) {
        // Copy components and names over to preserve reactivity
        Object.keys(saved.floors).forEach(floorId => {
          if (floorPlanStore.floors[floorId] && saved.floors[floorId].components) {
            floorPlanStore.floors[floorId].components = saved.floors[floorId].components;
          }
        });
      }
    }
  } catch (err) {
    console.error('Failed to load state from IndexedDB:', err);
  }

  // Helper to serialize and save current state
  const triggerSave = () => {
    try {
      const stateToSave = {
        currentFloorId: floorPlanStore.currentFloorId,
        zoom: floorPlanStore.zoom,
        config: $state.snapshot(floorPlanStore.config),
        floors: $state.snapshot(floorPlanStore.floors)
      };
      saveToIndexedDB(stateToSave);
    } catch (e) {
      console.error('Error in triggerSave:', e);
    }
  };

  // 2. Set up reactive tracking for svelte runes
  $effect.root(() => {
    $effect(() => {
      // Access reactive fields to establish dependencies
      triggerSave();
    });
  });

  // 3. Event-based and periodic backup (vital for unreactive properties like config)
  if (typeof window !== 'undefined') {
    window.addEventListener('input', triggerSave);
    window.addEventListener('change', triggerSave);
    window.addEventListener('click', triggerSave);

    // Periodic check every 300ms to ensure total persistence
    setInterval(triggerSave, 300);
  }
}
