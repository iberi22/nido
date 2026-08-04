import { floorPlanStore } from './floorPlanStore.svelte';
import { loadFromIndexedDB, saveToIndexedDB } from '../domain/db';
import { publishPresence } from '../domain/mesh';

export async function initDatabaseSync(options?: { meshClient?: any }) {
  let meshClient = options?.meshClient;
  if (!meshClient && typeof window !== 'undefined' && (window as any).nidoTestMeshClientEnabled) {
    meshClient = (window as any).nidoTestMeshClient;
  }

  let localLastUpdatedAt = 0;
  let offlineQueue: any[] = [];
  let wasConnected = true;
  let isSyncing = false;

  // 1. Load initial state from IndexedDB
  try {
    if (floorPlanStore.dbLoadPromise) {
      await floorPlanStore.dbLoadPromise;
    }
    const saved = await loadFromIndexedDB();
    if (saved) {
      if (typeof saved.updatedAt === 'number') {
        localLastUpdatedAt = saved.updatedAt;
      }
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

  // Handle incoming mesh state updates
  if (meshClient && typeof meshClient.onStateUpdate === 'function') {
    meshClient.onStateUpdate((incomingState: any) => {
      if (incomingState && typeof incomingState.updatedAt === 'number') {
        if (incomingState.updatedAt > localLastUpdatedAt) {
          isSyncing = true;
          try {
            localLastUpdatedAt = incomingState.updatedAt;

            // Merge into store
            if (incomingState.currentFloorId && floorPlanStore.floors[incomingState.currentFloorId]) {
              floorPlanStore.currentFloorId = incomingState.currentFloorId;
            }
            if (typeof incomingState.zoom === 'number') {
              floorPlanStore.zoom = incomingState.zoom;
            }
            if (incomingState.config) {
              Object.assign(floorPlanStore.config, incomingState.config);
            }
            if (incomingState.floors) {
              Object.keys(incomingState.floors).forEach(floorId => {
                if (floorPlanStore.floors[floorId] && incomingState.floors[floorId].components) {
                  floorPlanStore.floors[floorId].components = incomingState.floors[floorId].components;
                }
              });
            }

            // Persist the merged incoming state to IndexedDB
            saveToIndexedDB({
              currentFloorId: floorPlanStore.currentFloorId,
              zoom: floorPlanStore.zoom,
              config: JSON.parse(JSON.stringify(floorPlanStore.config)),
              floors: JSON.parse(JSON.stringify(floorPlanStore.floors)),
              updatedAt: localLastUpdatedAt
            });
          } finally {
            isSyncing = false;
          }
        }
      }
    });
  }

  // Helper to serialize and save current state
  const triggerSave = () => {
    if (isSyncing) return;
    try {
      // NOTE: $state.snapshot() does NOT unwrap Svelte proxies in plain .ts files
      // (sync.svelte.ts is not compiled with runes) — structuredClone/IDB.put
      // rejects the proxies. JSON round-trip guarantees a cloneable plain object.
      const now = Date.now();
      const currentTimestamp = now > localLastUpdatedAt ? now : localLastUpdatedAt + 1;
      localLastUpdatedAt = currentTimestamp;

      const stateToSave = {
        currentFloorId: floorPlanStore.currentFloorId,
        zoom: floorPlanStore.zoom,
        config: JSON.parse(JSON.stringify(floorPlanStore.config)),
        floors: JSON.parse(JSON.stringify(floorPlanStore.floors)),
        updatedAt: currentTimestamp
      };
      saveToIndexedDB(stateToSave);

      if (meshClient) {
        const isClientConnected = typeof meshClient.isConnected === 'boolean' ? meshClient.isConnected : true;
        if (isClientConnected) {
          if (typeof meshClient.publishState === 'function') {
            meshClient.publishState(meshClient.namespace, stateToSave);
          }
        } else {
          // Push latest state to queue (LWW logic: we only need to sync the latest state on reconnect)
          offlineQueue.push(stateToSave);
        }
      }
    } catch (e) {
      console.error('Error in triggerSave:', e);
    }
  };

  // Set up presence heartbeat if mesh client is provided
  if (meshClient) {
    try {
      publishPresence(meshClient, 'online');
    } catch (e) {
      if (typeof meshClient.publishPresence === 'function') {
        meshClient.publishPresence('online');
      }
    }

    // Presence heartbeat
    setInterval(() => {
      try {
        publishPresence(meshClient, 'online');
      } catch (e) {
        if (typeof meshClient.publishPresence === 'function') {
          meshClient.publishPresence('online');
        }
      }
    }, 1000);

    // Connection status checking for offline -> reconnect flush
    setInterval(() => {
      const isClientConnected = typeof meshClient.isConnected === 'boolean' ? meshClient.isConnected : true;
      if (isClientConnected && !wasConnected) {
        // Reconnected! Flush offline queue (send the last saved state)
        if (offlineQueue.length > 0) {
          const latestState = offlineQueue[offlineQueue.length - 1];
          if (latestState && typeof meshClient.publishState === 'function') {
            meshClient.publishState(meshClient.namespace, latestState);
          }
          offlineQueue = [];
        }
        wasConnected = true;
      } else if (!isClientConnected) {
        wasConnected = false;
      }
    }, 300);
  }

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
