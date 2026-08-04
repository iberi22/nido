import { floorPlanStore } from './floorPlanStore.svelte';
import { loadFromIndexedDB, saveToIndexedDB, loadQueueFromIndexedDB, saveQueueToIndexedDB } from '../domain/db';
import { publishPresence } from '../domain/mesh';
import { ExponentialBackoff, HeartbeatManager } from '../mesh/reconnect';

export async function initDatabaseSync(options?: {
  meshClient?: any;
  heartbeatInterval?: number;
  missedPingsThreshold?: number;
  backoffOptions?: any;
}) {
  let meshClient = options?.meshClient;
  if (!meshClient && typeof window !== 'undefined' && (window as any).nidoTestMeshClientEnabled) {
    meshClient = (window as any).nidoTestMeshClient;
  }

  let localLastUpdatedAt = 0;
  let offlineQueue: any[] = [];
  let wasConnected = true;
  let isSyncing = false;
  let heartbeatManager: any = null;

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

  // Load initial offline queue from IndexedDB
  try {
    const savedQueue = await loadQueueFromIndexedDB();
    if (Array.isArray(savedQueue)) {
      offlineQueue = savedQueue;
    }
  } catch (err) {
    console.error('Failed to load offline queue from IndexedDB:', err);
  }

  // Handle incoming mesh state updates
  if (meshClient && typeof meshClient.onStateUpdate === 'function') {
    meshClient.onStateUpdate((incomingState: any) => {
      if (incomingState && incomingState.type === 'heartbeat') {
        if (heartbeatManager) {
          heartbeatManager.handleHeartbeatMessage(incomingState);
        }
        return;
      }

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

  // Helper to serialize and save current state (Synchronous flow to guarantee deterministic Vitest timers)
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
          // Construct and push latest state as a queue item (LWW: we deduplicate by entity+timestamp)
          const queueItem = {
            entity: 'state',
            timestamp: currentTimestamp,
            data: stateToSave
          };
          // Filter out existing 'state' entity to keep queue size compact
          offlineQueue = offlineQueue.filter(item => item.entity !== 'state');
          offlineQueue.push(queueItem);
          saveQueueToIndexedDB(offlineQueue);
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

    const heartbeatInterval = options?.heartbeatInterval ?? 15000;
    const missedPingsThreshold = options?.missedPingsThreshold ?? 3;
    heartbeatManager = new HeartbeatManager(meshClient, {
      heartbeatInterval,
      missedPingsThreshold
    });
    heartbeatManager.start();

    const backoff = new ExponentialBackoff(options?.backoffOptions);
    let reconnectTimeoutId: any = null;
    const knownReconnectTargets = new Set<string>();

    if (Array.isArray(meshClient.peers)) {
      for (const peer of meshClient.peers) {
        if (peer.id !== 'self') {
          knownReconnectTargets.add(peer.id.replace(/^nido-/, ""));
        }
      }
    }

    const attemptReconnect = () => {
      if (reconnectTimeoutId) return;
      const isClientConnected = typeof meshClient.isConnected === 'boolean' ? meshClient.isConnected : true;
      if (isClientConnected) {
        backoff.reset();
        return;
      }

      const delay = backoff.nextDelay();
      reconnectTimeoutId = setTimeout(async () => {
        reconnectTimeoutId = null;

        if (knownReconnectTargets.size > 0) {
          for (const target of knownReconnectTargets) {
            try {
              if (typeof meshClient.connect === 'function') {
                await meshClient.connect(target);
              }
            } catch (err) {
              console.error(`Failed to reconnect to target ${target}:`, err);
            }
          }
        }

        const stillConnected = typeof meshClient.isConnected === 'boolean' ? meshClient.isConnected : true;
        if (!stillConnected) {
          attemptReconnect();
        } else {
          backoff.reset();
        }
      }, delay);
    };

    // Connection status checking for offline -> reconnect flush
    setInterval(async () => {
      if (!meshClient) return;
      const isClientConnected = typeof meshClient.isConnected === 'boolean' ? meshClient.isConnected : true;

      if (isClientConnected) {
        if (reconnectTimeoutId) {
          clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = null;
        }
        backoff.reset();

        if (Array.isArray(meshClient.peers)) {
          for (const peer of meshClient.peers) {
            if (peer.id !== 'self' && peer.presence === 'online') {
              const targetId = peer.id.replace(/^nido-/, "");
              knownReconnectTargets.add(targetId);
              heartbeatManager.registerPeerActivity(peer.id);
            }
          }
        }
      }

      if (isClientConnected && !wasConnected) {
        // Reconnected! Load the latest queue from IndexedDB to ensure we flush absolute source of truth
        try {
          const savedQueue = await loadQueueFromIndexedDB();
          if (Array.isArray(savedQueue)) {
            offlineQueue = savedQueue;
          }
        } catch (err) {
          console.error('Failed to reload offline queue before flush:', err);
        }

        if (offlineQueue.length > 0) {
          // Deduplicate: latest LWW wins per entity
          const latestByEntity: Record<string, any> = {};
          for (const item of offlineQueue) {
            const key = item.entity;
            if (!latestByEntity[key] || item.timestamp > latestByEntity[key].timestamp) {
              latestByEntity[key] = item;
            }
          }

          // Sort by timestamp explicitly before flush
          const deduplicatedQueue = Object.values(latestByEntity).sort((a, b) => a.timestamp - b.timestamp);

          const sentEntityMaxTimestamps: Record<string, number> = {};

          for (const item of deduplicatedQueue) {
            try {
              if (typeof meshClient.publishState === 'function') {
                const targetNs = item.entity === 'state' ? meshClient.namespace : item.entity;
                await meshClient.publishState(targetNs, item.data);
              }
              // Record the maximum sent timestamp for this entity
              sentEntityMaxTimestamps[item.entity] = Math.max(
                sentEntityMaxTimestamps[item.entity] || 0,
                item.timestamp
              );
            } catch (err) {
              console.error('Failed to flush queue item:', err);
              break; // Stop flushing to preserve order on failure
            }
          }

          // Safe filtering: discard items for an entity that are <= the highest timestamp successfully published.
          // This removes older/superseded historical revisions as well as the published items, while keeping
          // unpublished items (from failures) and any concurrently added newer items.
          offlineQueue = offlineQueue.filter(item => {
            const maxSent = sentEntityMaxTimestamps[item.entity];
            if (maxSent !== undefined && item.timestamp <= maxSent) {
              return false;
            }
            return true;
          });
          await saveQueueToIndexedDB(offlineQueue);
        }
        wasConnected = true;
      } else if (!isClientConnected) {
        wasConnected = false;
        attemptReconnect();
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
