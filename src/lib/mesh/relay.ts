import type { SignalingChannel, SignalingMessage } from "./transport";

function sanitize(payload: any): any {
  if (!payload) return payload;
  try {
    // RTCIceCandidate or RTCSessionDescription can be serialized to JSON and parsed back
    // to get a clean, transferable plain object.
    return JSON.parse(JSON.stringify(payload));
  } catch (err) {
    console.warn("NIDO Signaling Relay: failed to sanitize payload", err);
    return payload;
  }
}

export class InMemoryRelay implements SignalingChannel {
  private handlers = new Map<string, (from: string, msg: SignalingMessage) => void>();
  private bc: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      this.bc = new BroadcastChannel("nido-signaling-relay");
      this.bc.onmessage = (event) => {
        const { type, from, to, payload } = event.data || {};
        if (to && this.handlers.has(to)) {
          const handler = this.handlers.get(to);
          if (handler) {
            handler(from, { type, payload });
          }
        }
      };
    }
  }

  sendOffer(from: string, to: string, offer: any): void {
    const cleanOffer = sanitize(offer);
    const handler = this.handlers.get(to);
    if (handler) {
      setTimeout(() => handler(from, { type: "offer", payload: cleanOffer }), 0);
    } else if (this.bc) {
      this.bc.postMessage({ type: "offer", from, to, payload: cleanOffer });
    }
  }

  sendAnswer(from: string, to: string, answer: any): void {
    const cleanAnswer = sanitize(answer);
    const handler = this.handlers.get(to);
    if (handler) {
      setTimeout(() => handler(from, { type: "answer", payload: cleanAnswer }), 0);
    } else if (this.bc) {
      this.bc.postMessage({ type: "answer", from, to, payload: cleanAnswer });
    }
  }

  sendCandidate(from: string, to: string, candidate: any): void {
    const cleanCandidate = sanitize(candidate);
    const handler = this.handlers.get(to);
    if (handler) {
      setTimeout(() => handler(from, { type: "candidate", payload: cleanCandidate }), 0);
    } else if (this.bc) {
      this.bc.postMessage({ type: "candidate", from, to, payload: cleanCandidate });
    }
  }

  register(nodeId: string, handler: (from: string, msg: SignalingMessage) => void): void {
    this.handlers.set(nodeId, handler);
  }

  unregister(nodeId: string): void {
    this.handlers.delete(nodeId);
  }

  destroy(): void {
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    this.handlers.clear();
  }
}

if (typeof window !== "undefined") {
  (window as any).nidoRelay = (window as any).nidoRelay || new InMemoryRelay();
}
