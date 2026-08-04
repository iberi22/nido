import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { floorPlanStore } from "../../src/lib/stores/floorPlanStore.svelte";
import { initDatabaseSync } from "../../src/lib/stores/sync.svelte";
import { clearMockStorage } from "../../src/lib/domain/db";

describe("US-601-Sync: Sync Store and Edge-Mesh Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMockStorage();
    // Reset floorPlanStore values for consistent testing
    floorPlanStore.zoom = 100;
    floorPlanStore.currentFloorId = "ground";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. should save and publish state to the mesh client when a client is provided", async () => {
    const publishedStates: any[] = [];
    const fakeClient = {
      namespace: "swal/nido/test-inst",
      isConnected: true,
      publishPresence: vi.fn(),
      publishState: (ns: string, state: any) => {
        publishedStates.push({ ns, state });
      },
      onStateUpdate: vi.fn(),
    };

    await initDatabaseSync({ meshClient: fakeClient });

    // Change some state
    floorPlanStore.zoom = 150;

    // Fast-forward timers to trigger periodic save (300ms)
    await vi.advanceTimersByTimeAsync(350);

    expect(publishedStates.length).toBeGreaterThan(0);
    const lastPublish = publishedStates[publishedStates.length - 1];
    expect(lastPublish.ns).toBe("swal/nido/test-inst");
    expect(lastPublish.state.zoom).toBe(150);
  });

  it("2. should merge incoming state from mesh client into floorPlanStore", async () => {
    let updateCallback: any = null;
    const fakeClient = {
      namespace: "swal/nido/test-inst",
      isConnected: true,
      publishPresence: vi.fn(),
      publishState: vi.fn(),
      onStateUpdate: (cb: any) => {
        updateCallback = cb;
      },
    };

    await initDatabaseSync({ meshClient: fakeClient });

    expect(updateCallback).not.toBeNull();

    // Simulate incoming update with a newer timestamp
    const incomingState = {
      currentFloorId: "second",
      zoom: 200,
      updatedAt: Date.now() + 5000,
      config: { wallThickness: 0.25 },
    };

    updateCallback(incomingState);

    expect(floorPlanStore.currentFloorId).toBe("second");
    expect(floorPlanStore.zoom).toBe(200);
    expect(floorPlanStore.config.wallThickness).toBe(0.25);
  });

  it("3. should respect Last-Writer-Wins (LWW) conflict resolution by timestamp", async () => {
    let updateCallback: any = null;
    const fakeClient = {
      namespace: "swal/nido/test-inst",
      isConnected: true,
      publishPresence: vi.fn(),
      publishState: vi.fn(),
      onStateUpdate: (cb: any) => {
        updateCallback = cb;
      },
    };

    await initDatabaseSync({ meshClient: fakeClient });

    // Set a known state first
    floorPlanStore.zoom = 100;
    await vi.advanceTimersByTimeAsync(350);

    // Incoming state with OLDER timestamp should be ignored
    const oldIncomingState = {
      zoom: 80,
      updatedAt: Date.now() - 10000,
    };
    updateCallback(oldIncomingState);
    expect(floorPlanStore.zoom).toBe(100);

    // Incoming state with NEWER timestamp should be accepted
    const newIncomingState = {
      zoom: 180,
      updatedAt: Date.now() + 10000,
    };
    updateCallback(newIncomingState);
    expect(floorPlanStore.zoom).toBe(180);
  });

  it("4. should execute presence heartbeat continuously when mesh client is provided", async () => {
    const presenceCalls: string[] = [];
    const fakeClient = {
      namespace: "swal/nido/test-inst",
      isConnected: true,
      publishPresence: (presence: string) => {
        presenceCalls.push(presence);
      },
      publishState: vi.fn(),
      onStateUpdate: vi.fn(),
    };

    await initDatabaseSync({ meshClient: fakeClient });

    // Initial heartbeat is immediate or on setup
    expect(presenceCalls.length).toBeGreaterThanOrEqual(1);
    expect(presenceCalls[0]).toBe("online");

    const initialCount = presenceCalls.length;

    // Fast-forward 2 seconds to trigger multiple heartbeats (every 1s)
    await vi.advanceTimersByTimeAsync(2050);

    expect(presenceCalls.length).toBeGreaterThan(initialCount);
    expect(presenceCalls[presenceCalls.length - 1]).toBe("online");
  });

  it("5. should queue state when offline and flush queue on reconnect", async () => {
    const publishedStates: any[] = [];
    const fakeClient = {
      namespace: "swal/nido/test-inst",
      isConnected: false, // Start offline
      publishPresence: vi.fn(),
      publishState: (ns: string, state: any) => {
        publishedStates.push(state);
      },
      onStateUpdate: vi.fn(),
    };

    await initDatabaseSync({ meshClient: fakeClient });

    // Modify state while offline
    floorPlanStore.zoom = 110;
    await vi.advanceTimersByTimeAsync(350);

    // Since offline, it shouldn't have published yet
    expect(publishedStates.length).toBe(0);

    // Reconnect the client
    fakeClient.isConnected = true;

    // Fast-forward to trigger status check and reconnect flush (polls every 300ms)
    await vi.advanceTimersByTimeAsync(350);

    expect(publishedStates.length).toBeGreaterThan(0);
    const lastPublish = publishedStates[publishedStates.length - 1];
    expect(lastPublish.zoom).toBe(110);
  });

  it("6. should preserve offline-first and function correctly without a mesh client", async () => {
    // Calling without meshClient parameter
    await initDatabaseSync();

    floorPlanStore.zoom = 95;
    await vi.advanceTimersByTimeAsync(350);

    // Should not throw any errors, and zoom should be updated
    expect(floorPlanStore.zoom).toBe(95);
  });
});
