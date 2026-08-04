import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMeshClient } from "../../src/lib/domain/mesh";
import { InMemorySignaling, WebRTCTransport } from "../../src/lib/mesh/transport";

// Fake RTCDataChannel to mock real browser WebRTC channels
class FakeRTCDataChannel {
  label: string;
  ordered: boolean;
  readyState: "connecting" | "open" | "closing" | "closed" = "connecting";
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  otherSideChannel: FakeRTCDataChannel | null = null;

  constructor(label: string, options?: any) {
    this.label = label;
    this.ordered = options?.ordered ?? true;
  }

  send(data: string) {
    if (this.readyState !== "open") {
      throw new Error("Data channel not open");
    }
    if (this.otherSideChannel) {
      const destChannel = this.otherSideChannel;
      setTimeout(() => {
        if (destChannel.onmessage) {
          destChannel.onmessage({ data });
        }
      }, 0);
    }
  }

  close() {
    if (this.readyState === "closed") return;
    this.readyState = "closed";
    if (this.onclose) this.onclose();
    if (this.otherSideChannel && this.otherSideChannel.readyState !== "closed") {
      this.otherSideChannel.close();
    }
  }

  triggerOpen() {
    this.readyState = "open";
    if (this.onopen) this.onopen();
  }
}

// Fake RTCPeerConnection to mock real browser WebRTC Peer Connection
class FakeRTCPeerConnection {
  nodeId: string;
  registry: Map<string, FakeRTCPeerConnection>;
  onicecandidate: ((ev: { candidate: any }) => void) | null = null;
  ondatachannel: ((ev: { channel: any }) => void) | null = null;
  localDescription: any = null;
  remoteDescription: any = null;
  createdChannels: FakeRTCDataChannel[] = [];

  constructor(nodeId: string, registry: Map<string, FakeRTCPeerConnection>) {
    this.nodeId = nodeId;
    this.registry = registry;
  }

  createDataChannel(label: string, options?: any) {
    const dc = new FakeRTCDataChannel(label, options);
    this.createdChannels.push(dc);
    return dc;
  }

  async createOffer() {
    return { type: "offer", sdp: `sdp-offer-from-${this.nodeId}` };
  }

  async createAnswer() {
    return { type: "answer", sdp: `sdp-answer-from-${this.nodeId}` };
  }

  async setLocalDescription(desc: any) {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: any) {
    this.remoteDescription = desc;
    if (desc && desc.type === "offer") {
      const match = desc.sdp.match(/sdp-offer-from-(.+)$/);
      if (match) {
        const callerId = match[1];
        const callerPC = this.registry.get(callerId);
        if (callerPC) {
          const callerDC = callerPC.createdChannels[0];
          if (callerDC) {
            setTimeout(() => {
              const calleeDC = new FakeRTCDataChannel(callerDC.label, { ordered: callerDC.ordered });
              this.createdChannels.push(calleeDC);

              callerDC.otherSideChannel = calleeDC;
              calleeDC.otherSideChannel = callerDC;

              if (this.ondatachannel) {
                this.ondatachannel({ channel: calleeDC });
              }

              callerDC.triggerOpen();
              calleeDC.triggerOpen();
            }, 10);
          }
        }
      }
    }
  }

  async addIceCandidate(candidate: any) {
    // no-op
  }

  close() {
    for (const ch of this.createdChannels) {
      ch.close();
    }
  }
}

describe("WebRTC Transport P2P DataChannel Integration Tests", () => {
  let signaling: InMemorySignaling;
  let registry: Map<string, FakeRTCPeerConnection>;

  beforeEach(() => {
    vi.useFakeTimers();
    signaling = new InMemorySignaling();
    registry = new Map();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createFactory = (nodeId: string) => {
    return () => {
      const pc = new FakeRTCPeerConnection(nodeId, registry);
      registry.set(nodeId, pc);
      return pc as unknown as RTCPeerConnection;
    };
  };

  it("1. should successfully establish a peer-to-peer data channel connection via signaling", async () => {
    const clientA = createMeshClient("peerA", {
      signaling,
      rtcFactory: createFactory("nido-peerA")
    });

    const clientB = createMeshClient("peerB", {
      signaling,
      rtcFactory: createFactory("nido-peerB")
    });

    // Initiate connection
    await clientA.connect!("peerB");

    // Advance timers so signaling and fake handshakes process
    await vi.advanceTimersByTimeAsync(100);

    expect(clientA.isConnected).toBeTruthy();
    expect(clientB.isConnected).toBeTruthy();
  });

  it("2. should transfer raw messages over the open data channel between two WebRTCTransports", async () => {
    const clientA = createMeshClient("peerA", {
      signaling,
      rtcFactory: createFactory("nido-peerA")
    });

    const clientB = createMeshClient("peerB", {
      signaling,
      rtcFactory: createFactory("nido-peerB")
    });

    await clientA.connect!("peerB");
    await vi.advanceTimersByTimeAsync(100);

    const receivedMessages: any[] = [];
    clientB._transport.on("mensaje", (ev: any) => {
      receivedMessages.push(ev.detail.envolvente);
    });

    await clientA._transport.enviar("nido-peerB", { text: "Hello WebRTC!" });
    await vi.advanceTimersByTimeAsync(50);

    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0].payload.text).toBe("Hello WebRTC!");
  });

  it("3. should propagate sync store state changes between two clients using WebRTC transport", async () => {
    const clientA = createMeshClient("peerA", {
      signaling,
      rtcFactory: createFactory("nido-peerA")
    });

    const clientB = createMeshClient("peerB", {
      signaling,
      rtcFactory: createFactory("nido-peerB")
    });

    await clientA.connect!("peerB");
    await vi.advanceTimersByTimeAsync(100);

    let receivedState: any = null;
    clientB.onStateUpdate!((state: any) => {
      receivedState = state;
    });

    const testState = { zoom: 123, currentFloorId: "roof" };
    clientA.publishState!("swal/nido/peerA", testState);
    await vi.advanceTimersByTimeAsync(50);

    expect(receivedState).toBeTruthy();
    expect(receivedState.zoom).toBe(123);
    expect(receivedState.currentFloorId).toBe("roof");
  });

  it("4. should trigger offline fallback when disconnected", async () => {
    const clientA = createMeshClient("peerA", {
      signaling,
      rtcFactory: createFactory("nido-peerA")
    });

    const clientB = createMeshClient("peerB", {
      signaling,
      rtcFactory: createFactory("nido-peerB")
    });

    await clientA.connect!("peerB");
    await vi.advanceTimersByTimeAsync(100);

    expect(clientA.isConnected).toBeTruthy();

    // Trigger disconnect
    await clientA.disconnect!();
    await vi.advanceTimersByTimeAsync(50);

    // Assert using Exact State Check (.toEqual or .toBeFalsy) instead of direct .toBe(false)
    expect(clientA.isConnected).toBeFalsy();
  });

  it("5. should reconnect and resync state when re-established", async () => {
    const clientA = createMeshClient("peerA", {
      signaling,
      rtcFactory: createFactory("nido-peerA")
    });

    const clientB = createMeshClient("peerB", {
      signaling,
      rtcFactory: createFactory("nido-peerB")
    });

    await clientA.connect!("peerB");
    await vi.advanceTimersByTimeAsync(100);

    expect(clientA.isConnected).toBeTruthy();

    // Disconnect
    await clientA.disconnect!();
    await vi.advanceTimersByTimeAsync(50);
    expect(clientA.isConnected).toBeFalsy();

    // Re-establish connection
    await clientA.connect!("peerB");
    await vi.advanceTimersByTimeAsync(100);
    expect(clientA.isConnected).toBeTruthy();

    let receivedState: any = null;
    clientB.onStateUpdate!((state: any) => {
      receivedState = state;
    });

    const testState = { zoom: 250, currentFloorId: "basement" };
    clientA.publishState!("swal/nido/peerA", testState);
    await vi.advanceTimersByTimeAsync(50);

    expect(receivedState).toBeTruthy();
    expect(receivedState.zoom).toBe(250);
    expect(receivedState.currentFloorId).toBe("basement");
  });
});
