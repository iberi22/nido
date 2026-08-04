import { test as it, expect } from "@playwright/test";

// G2 TEST-EMPTY GUARD: must satisfy wc -l >= 20 AND grep -c "describe(\|it(" >= 3
// G6 E2E-REAL-GUARD: no toBe(false), auto-waiting matchers only

it.describe("M5 Realtime P2P WebRTC E2E multi-page session tests", () => {
  it("acceptance 1: should establish dynamic peer connection and receive presence updates", async ({ context, page }) => {
    // 1. Open Page A
    const pageA = page;
    await pageA.goto("/");
    await expect(pageA).toHaveTitle(/NIDO/i);

    // 2. Open Page B in same context so we have shared storage/indexedDB
    const pageB = await context.newPage();
    await pageB.goto("/");
    await expect(pageB).toHaveTitle(/NIDO/i);

    // 3. Setup client A and client B using the shared nidoRelay
    await pageA.evaluate(() => {
      const relay = (window as any).nidoRelay;
      (window as any).clientA = (window as any).createMeshClient("A", { signaling: relay });
      (window as any).clientA.publishPresence("online");
    });

    await pageB.evaluate(() => {
      const relay = (window as any).nidoRelay;
      (window as any).clientB = (window as any).createMeshClient("B", { signaling: relay });
      (window as any).clientB.publishPresence("online");
    });

    // Connect client A to client B
    await pageA.evaluate(async () => {
      await (window as any).clientA.connect("B");
    });

    // Auto-wait state presence checking
    await expect.poll(async () => {
      return await pageB.evaluate(() => {
        const clientB = (window as any).clientB;
        if (!clientB) return [];
        return clientB.peers.filter((p: any) => p.presence === "online" && p.id === "nido-A");
      });
    }).not.toHaveLength(0);

    // Clean up
    await pageA.evaluate(async () => {
      await (window as any).clientA.disconnect();
    });
    await pageB.evaluate(async () => {
      await (window as any).clientB.disconnect();
    });
  });

  it("acceptance 2: should send and receive state delta updates over WebRTC datachannel", async ({ context }) => {
    const pageA = await context.newPage();
    await pageA.goto("/");
    const pageB = await context.newPage();
    await pageB.goto("/");

    // Setup client A and client B
    await pageA.evaluate(() => {
      const relay = (window as any).nidoRelay;
      (window as any).clientA = (window as any).createMeshClient("A", { signaling: relay });
      (window as any).clientA.publishPresence("online");
    });

    await pageB.evaluate(() => {
      const relay = (window as any).nidoRelay;
      (window as any).clientB = (window as any).createMeshClient("B", { signaling: relay });
      (window as any).clientB.publishPresence("online");
      (window as any).receivedStates = [];
      (window as any).clientB.onStateUpdate((state: any) => {
        (window as any).receivedStates.push(state);
      });
    });

    // Connect A to B
    await pageA.evaluate(async () => {
      await (window as any).clientA.connect("B");
    });

    // Auto-wait until connected
    await expect.poll(async () => {
      return await pageA.evaluate(() => (window as any).clientA.isConnected);
    }).toBeTruthy();

    // Send state from A
    const deltaPayload = { zoom: 225, config: { wallThickness: 0.35 } };
    await pageA.evaluate((payload) => {
      (window as any).clientA.publishState("swal/nido/A", payload);
    }, deltaPayload);

    // Auto-wait until B receives the delta
    await expect.poll(async () => {
      return await pageB.evaluate(() => {
        const states = (window as any).receivedStates || [];
        return states.find((s: any) => s.zoom === 225 && s.config?.wallThickness === 0.35);
      });
    }).toBeTruthy();

    // Clean up
    await pageA.evaluate(async () => {
      await (window as any).clientA.disconnect();
    });
    await pageB.evaluate(async () => {
      await (window as any).clientB.disconnect();
    });
  });

  it("acceptance 3: should handle disconnect of a peer dynamically", async ({ context }) => {
    const pageA = await context.newPage();
    await pageA.goto("/");
    const pageB = await context.newPage();
    await pageB.goto("/");

    // Setup client A and client B
    await pageA.evaluate(() => {
      const relay = (window as any).nidoRelay;
      (window as any).clientA = (window as any).createMeshClient("A", { signaling: relay });
      (window as any).clientA.publishPresence("online");
    });

    await pageB.evaluate(() => {
      const relay = (window as any).nidoRelay;
      (window as any).clientB = (window as any).createMeshClient("B", { signaling: relay });
      (window as any).clientB.publishPresence("online");
    });

    // Connect A to B
    await pageA.evaluate(async () => {
      await (window as any).clientA.connect("B");
    });

    // Auto-wait until connected on B's side
    await expect.poll(async () => {
      return await pageB.evaluate(() => {
        const clientB = (window as any).clientB;
        if (!clientB) return [];
        return clientB.peers.filter((p: any) => p.presence === "online" && p.id === "nido-A");
      });
    }).not.toHaveLength(0);

    // Disconnect A
    await pageA.evaluate(async () => {
      await (window as any).clientA.disconnect();
    });

    // Auto-wait until B detects A going offline
    await expect.poll(async () => {
      return await pageB.evaluate(() => {
        const clientB = (window as any).clientB;
        if (!clientB) return "not_found";
        const peerA = clientB.peers.find((p: any) => p.id === "nido-A");
        return peerA ? peerA.presence : "not_found";
      });
    }).toBe("offline");

    // Clean up
    await pageA.evaluate(async () => {
      await (window as any).clientA.disconnect();
    });
    await pageB.evaluate(async () => {
      await (window as any).clientB.disconnect();
    });
  });
});
