import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { floorPlanStore } from "../../src/lib/stores/floorPlanStore.svelte";
import { initDatabaseSync } from "../../src/lib/stores/sync.svelte";
import { clearMockStorage, loadQueueFromIndexedDB, saveQueueToIndexedDB } from "../../src/lib/domain/db";

describe("Mesh Sync Offline-First Queue Integration Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMockStorage();
    floorPlanStore.zoom = 100;
    floorPlanStore.currentFloorId = "ground";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. should accumulate changes in the offline queue while disconnected", async () => {
    const publishedStates: any[] = [];
    const fakeClient = {
      namespace: "swal/nido/test-queue",
      isConnected: false,
      publishPresence: vi.fn(),
      publishState: (ns: string, state: any) => {
        publishedStates.push({ ns, state });
      },
      onStateUpdate: vi.fn(),
    };

    await initDatabaseSync({ meshClient: fakeClient });

    // Modify state while offline
    floorPlanStore.zoom = 120;
    await vi.advanceTimersByTimeAsync(350);

    // Verify nothing published
    expect(publishedStates.length).toEqual(0);

    // Verify queue in IndexedDB has the accumulated change
    const queue = await loadQueueFromIndexedDB();
    expect(queue.length).toBeGreaterThan(0);
    const stateItem = queue.find(item => item.entity === "state");
    expect(stateItem).toBeDefined();
    expect(stateItem?.data.zoom).toBe(120);
  });

  it("2. should flush on reconnect and send items in chronological order", async () => {
    const published: any[] = [];
    const fakeClient = {
      namespace: "swal/nido/test-queue",
      isConnected: false,
      publishPresence: vi.fn(),
      publishState: async (ns: string, state: any) => {
        published.push({ ns, state });
      },
      onStateUpdate: vi.fn(),
    };

    // Pre-populate queue with items out of order to ensure sorting by timestamp works
    await saveQueueToIndexedDB([
      { entity: "entityB", timestamp: 300, data: { val: "B" } },
      { entity: "entityA", timestamp: 100, data: { val: "A" } },
    ]);

    await initDatabaseSync({ meshClient: fakeClient });

    // First advance timers to let connection check register offline state (wasConnected = false)
    await vi.advanceTimersByTimeAsync(350);

    // Transition to connected
    fakeClient.isConnected = true;

    // Advance timers again to trigger the reconnect check and flush
    await vi.advanceTimersByTimeAsync(350);

    // Filter out any auto-queued initial state publication
    const filteredPublished = published.filter(p => p.ns !== "swal/nido/test-queue");

    // Should have published both in order: entityA (timestamp 100) first, then entityB (timestamp 300)
    expect(filteredPublished.length).toEqual(2);
    expect(filteredPublished[0].ns).toBe("entityA");
    expect(filteredPublished[0].state.val).toBe("A");
    expect(filteredPublished[1].ns).toBe("entityB");
    expect(filteredPublished[1].state.val).toBe("B");

    // Queue should be cleared
    const queue = await loadQueueFromIndexedDB();
    expect(queue.length).toEqual(0);
  });

  it("3. should deduplicate queue items (LWW) per entity before flushing", async () => {
    const published: any[] = [];
    const fakeClient = {
      namespace: "swal/nido/test-queue",
      isConnected: false,
      publishPresence: vi.fn(),
      publishState: async (ns: string, state: any) => {
        published.push({ ns, state });
      },
      onStateUpdate: vi.fn(),
    };

    // Pre-populate queue with multiple updates for same entity
    await saveQueueToIndexedDB([
      { entity: "itemX", timestamp: 100, data: { version: 1 } },
      { entity: "itemY", timestamp: 150, data: { version: 1 } },
      { entity: "itemX", timestamp: 200, data: { version: 2 } }, // newer itemX
      { entity: "itemY", timestamp: 120, data: { version: 0 } }, // older itemY, should be discarded
    ]);

    await initDatabaseSync({ meshClient: fakeClient });

    // First advance timers to let connection check register offline state
    await vi.advanceTimersByTimeAsync(350);

    // Transition to connected
    fakeClient.isConnected = true;

    // Advance timers again to trigger the reconnect check and flush
    await vi.advanceTimersByTimeAsync(350);

    // Filter out any auto-queued initial state publication
    const filteredPublished = published.filter(p => p.ns !== "swal/nido/test-queue");

    // ItemY (timestamp 150) and ItemX (timestamp 200) should be sent.
    // Order: ItemY first (150), then ItemX (200).
    expect(filteredPublished.length).toEqual(2);
    expect(filteredPublished[0].ns).toBe("itemY");
    expect(filteredPublished[0].state.version).toBe(1);
    expect(filteredPublished[1].ns).toBe("itemX");
    expect(filteredPublished[1].state.version).toBe(2);

    const queue = await loadQueueFromIndexedDB();
    expect(queue.length).toEqual(0);
  });

  it("4. should persist the offline queue across store re-initialization", async () => {
    const fakeClient1 = {
      namespace: "swal/nido/test-queue",
      isConnected: false,
      publishPresence: vi.fn(),
      publishState: vi.fn(),
      onStateUpdate: vi.fn(),
    };

    // Pre-populate queue with a custom entity to test raw persistence
    await saveQueueToIndexedDB([
      { entity: "customPersist", timestamp: 12345, data: { test: "my-persisted-data" } }
    ]);

    // Init store first time
    await initDatabaseSync({ meshClient: fakeClient1 });

    // Verify queue is loaded
    let queue = await loadQueueFromIndexedDB();
    const item1 = queue.find(item => item.entity === "customPersist");
    expect(item1).toBeDefined();
    expect(item1!.data.test).toBe("my-persisted-data");

    // Simulate store re-initialization (e.g. page reload) with another offline client
    const fakeClient2 = {
      namespace: "swal/nido/test-queue",
      isConnected: false,
      publishPresence: vi.fn(),
      publishState: vi.fn(),
      onStateUpdate: vi.fn(),
    };

    await initDatabaseSync({ meshClient: fakeClient2 });

    // Verify queue is still loaded and persisted correctly
    queue = await loadQueueFromIndexedDB();
    const item2 = queue.find(item => item.entity === "customPersist");
    expect(item2).toBeDefined();
    expect(item2!.data.test).toBe("my-persisted-data");
  });

  it("5. should keep the remaining queue items if a flush failure occurs", async () => {
    const published: any[] = [];
    const fakeClient = {
      namespace: "swal/nido/test-queue",
      isConnected: false,
      publishPresence: vi.fn(),
      publishState: async (ns: string, state: any) => {
        if (ns === "entityFail") {
          throw new Error("Simulated network error during publish");
        }
        published.push({ ns, state });
      },
      onStateUpdate: vi.fn(),
    };

    // Pre-populate queue
    await saveQueueToIndexedDB([
      { entity: "entitySuccess", timestamp: 100, data: { ok: true } },
      { entity: "entityFail", timestamp: 200, data: { ok: false } },
    ]);

    await initDatabaseSync({ meshClient: fakeClient });

    // First advance timers to let connection check register offline state
    await vi.advanceTimersByTimeAsync(350);

    // Reconnect
    fakeClient.isConnected = true;

    // Advance timers again to trigger reconnect check and flush
    await vi.advanceTimersByTimeAsync(350);

    // Filter out any auto-queued initial state publication
    const filteredPublished = published.filter(p => p.ns !== "swal/nido/test-queue");

    // "entitySuccess" should be published, but the flush fails on "entityFail"
    expect(filteredPublished.length).toEqual(1);
    expect(filteredPublished[0].ns).toBe("entitySuccess");

    // The queue should not be completely cleared. It should retain the failed entity item
    const queue = await loadQueueFromIndexedDB();
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.some(item => item.entity === "entityFail")).toEqual(true);
  });
});
