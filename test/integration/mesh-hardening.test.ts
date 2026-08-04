import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExponentialBackoff, HeartbeatManager } from '../../src/lib/mesh/reconnect';
import { floorPlanStore } from '../../src/lib/stores/floorPlanStore.svelte';
import { initDatabaseSync } from '../../src/lib/stores/sync.svelte';
import { clearMockStorage } from '../../src/lib/domain/db';

describe('M5 Mesh Hardening: Reconnect, Heartbeats & Partition Recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMockStorage();
    floorPlanStore.zoom = 100;
    floorPlanStore.currentFloorId = 'ground';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. should follow backoff sequence (1s, 2s, 4s, 8s...) with zero jitter', () => {
    const backoff = new ExponentialBackoff({
      minDelay: 1000,
      maxDelay: 30000,
      factor: 2,
      jitterPct: 0,
    });

    expect(backoff.nextDelay()).toEqual(1000);
    expect(backoff.nextDelay()).toEqual(2000);
    expect(backoff.nextDelay()).toEqual(4000);
    expect(backoff.nextDelay()).toEqual(8000);
    expect(backoff.nextDelay()).toEqual(16000);
  });

  it('2. should cap the exponential backoff at 30s', () => {
    const backoff = new ExponentialBackoff({
      minDelay: 1000,
      maxDelay: 30000,
      factor: 2,
      jitterPct: 0,
    });

    // Advance 6 times: 1s, 2s, 4s, 8s, 16s, 32s -> capped at 30s
    expect(backoff.nextDelay()).toEqual(1000);
    expect(backoff.nextDelay()).toEqual(2000);
    expect(backoff.nextDelay()).toEqual(4000);
    expect(backoff.nextDelay()).toEqual(8000);
    expect(backoff.nextDelay()).toEqual(16000);
    expect(backoff.nextDelay()).toEqual(30000);
    expect(backoff.nextDelay()).toEqual(30000);
  });

  it('3. should enforce strict bounds based on jitterPct and custom random generator', () => {
    const backoff = new ExponentialBackoff({
      minDelay: 1000,
      maxDelay: 30000,
      factor: 2,
      jitterPct: 0.2, // +/- 20% jitter bounds
    });

    // When rand() returns 0 (minimum jitter value)
    const minDelay = backoff.nextDelay(() => 0);
    expect(minDelay).toEqual(800); // 1000 - 20%

    // When rand() returns 1 (maximum jitter value)
    const maxDelay = backoff.nextDelay(() => 1);
    expect(maxDelay).toEqual(2400); // 2000 * 1.2 = 2400
    // Let's reset to verify attempt 0 for maximum
    backoff.reset();
    const maxDelayAt0 = backoff.nextDelay(() => 1);
    expect(maxDelayAt0).toEqual(1200); // 1000 + 20%

    // When rand() returns 0.5 (neutral jitter value)
    backoff.reset();
    const midDelayAt0 = backoff.nextDelay(() => 0.5);
    expect(midDelayAt0).toEqual(1000); // 1000 + 0%
  });

  it('4. should mark peer offline after N missed pings and mark back online on active heartbeat', () => {
    const peerList = [
      { id: 'self', name: 'me', presence: 'online' },
      { id: 'nido-peer-1', name: 'peer-1', presence: 'online' },
    ];
    const fakeClient = {
      instanceId: 'self',
      namespace: 'swal/nido/self',
      peers: peerList,
      publishPresence: vi.fn(),
      publishState: vi.fn(),
      onStateUpdate: vi.fn(),
    };

    const heartbeat = new HeartbeatManager(fakeClient, {
      heartbeatInterval: 1000,
      missedPingsThreshold: 3,
    });

    heartbeat.start();

    // Verify initial state
    expect(peerList[1].presence).toEqual('online');

    // Advance 1s - peer-1 has not sent anything but is within threshold
    vi.advanceTimersByTime(1000);
    expect(peerList[1].presence).toEqual('online');

    // Advance another 2.5s (total 3.5s > 3 missed pings threshold)
    vi.advanceTimersByTime(2500);
    expect(peerList[1].presence).toEqual('offline');

    // Now send a heartbeat from peer-1
    heartbeat.handleHeartbeatMessage({
      type: 'heartbeat',
      subtype: 'ping',
      sender: 'peer-1',
    });

    // Should mark back online immediately
    expect(peerList[1].presence).toEqual('online');

    heartbeat.stop();
  });

  it('5. should queue state when offline and flush queue with backoff reconnection', async () => {
    const publishedStates: any[] = [];
    let isClientConnected = false;

    const fakeClient: any = {
      instanceId: 'self',
      namespace: 'swal/nido/self',
      peers: [
        { id: 'self', name: 'me', presence: 'online' },
        { id: 'nido-target-peer', name: 'target-peer', presence: 'offline' }
      ],
      get isConnected() {
        return isClientConnected;
      },
      publishPresence: vi.fn(),
      publishState: (ns: string, state: any) => {
        publishedStates.push(state);
      },
      onStateUpdate: vi.fn(),
      connect: async (target: string) => {
        isClientConnected = true;
        const peer = fakeClient.peers.find((p: any) => p.id === `nido-${target}`);
        if (peer) {
          peer.presence = 'online';
        } else {
          fakeClient.peers.push({ id: `nido-${target}`, name: target, presence: 'online' });
        }
      },
    };

    await initDatabaseSync({
      meshClient: fakeClient,
      backoffOptions: { minDelay: 1000, maxDelay: 10000, factor: 2, jitterPct: 0 },
    });

    // Make state changes while offline
    floorPlanStore.zoom = 130;
    // Wait for periodic trigger (300ms) to save queue
    await vi.advanceTimersByTimeAsync(350);

    expect(publishedStates.length).toEqual(0);

    // Let the first backoff delay (1000ms) elapse to trigger attemptReconnect
    await vi.advanceTimersByTimeAsync(1100);

    // After attemptReconnect runs, connectionStatus check interval (300ms) will see it connected and flush
    await vi.advanceTimersByTimeAsync(350);

    expect(isClientConnected).toEqual(true);
    expect(publishedStates.length).toBeGreaterThan(0);
    expect(publishedStates[publishedStates.length - 1].zoom).toEqual(130);
  });

  it('6. should recover from partition split-brain and converge state using LWW with a single engine', async () => {
    let updateCallbackA: any = null;
    let isConnectedA = false;
    const statesPublishedByA: any[] = [];

    // Client A is the real sync store engine
    const fakeClientA: any = {
      instanceId: 'node-A',
      namespace: 'swal/nido/node-A',
      peers: [
        { id: 'self', name: 'me', presence: 'online' },
        { id: 'nido-node-B', name: 'node-B', presence: 'offline' }
      ],
      get isConnected() {
        return isConnectedA;
      },
      publishPresence: vi.fn(),
      publishState: (ns: string, state: any) => {
        statesPublishedByA.push(state);
      },
      onStateUpdate: (cb: any) => {
        updateCallbackA = cb;
      },
      connect: async (target: string) => {
        isConnectedA = true;
        const peer = fakeClientA.peers.find((p: any) => p.id === `nido-${target}`);
        if (peer) {
          peer.presence = 'online';
        }
      },
    };

    // Initialize sync for Node A
    await initDatabaseSync({
      meshClient: fakeClientA,
      backoffOptions: { minDelay: 1000, maxDelay: 10000, factor: 2, jitterPct: 0 },
    });

    // Node A changes state while offline (older change)
    const tOlder = Date.now() - 5000;
    // Set floorPlanStore value and let it save offline
    floorPlanStore.zoom = 150;
    await vi.advanceTimersByTimeAsync(350); // triggers save and offline queueing

    // Since offline, A has not published yet
    expect(statesPublishedByA.length).toEqual(0);

    // Let the reconnect backoff timeout elapse (1000ms)
    await vi.advanceTimersByTimeAsync(1100);

    // Reconnected! connection check interval runs to trigger flush
    await vi.advanceTimersByTimeAsync(350);

    expect(isConnectedA).toEqual(true);
    expect(statesPublishedByA.length).toBeGreaterThan(0);

    // Now, simulated Peer B (who had a newer state change at tNewer) sends its state to A
    const tNewer = Date.now() + 10000;
    const newerStateFromB = {
      zoom: 250,
      updatedAt: tNewer,
    };

    // Deliver newer state from B -> A
    updateCallbackA(newerStateFromB);

    // Node A should accept B's newer state because tNewer > tOlder (LWW)
    expect(floorPlanStore.zoom).toEqual(250);

    // If B sends an older state change, A should ignore it
    const olderStateFromB = {
      zoom: 80,
      updatedAt: tOlder - 1000,
    };
    updateCallbackA(olderStateFromB);

    // Node A should ignore older state and keep B's newer state
    expect(floorPlanStore.zoom).toEqual(250);
  });
});
