/**
 * NIDO — M5 Mesh Hardening: Exponential Backoff Reconnect, Heartbeats & Partition Recovery
 */

export interface BackoffOptions {
  minDelay?: number;      // default: 1000 (1s)
  maxDelay?: number;      // default: 30000 (30s)
  factor?: number;        // default: 2
  jitterPct?: number;     // default: 0.2 (20% bounds)
}

export class ExponentialBackoff {
  private minDelay: number;
  private maxDelay: number;
  private factor: number;
  private jitterPct: number;
  private attempt = 0;

  constructor(options?: BackoffOptions) {
    this.minDelay = options?.minDelay ?? 1000;
    this.maxDelay = options?.maxDelay ?? 30000;
    this.factor = options?.factor ?? 2;
    this.jitterPct = options?.jitterPct ?? 0.2;
  }

  /**
   * Calculates the next delay based on the attempt counter.
   * If customRandom is provided, it will use that for jitter instead of Math.random.
   */
  public nextDelay(customRandom?: () => number): number {
    const baseDelay = this.minDelay * Math.pow(this.factor, this.attempt);
    const cappedDelay = Math.min(baseDelay, this.maxDelay);
    this.attempt++;

    const rand = customRandom ?? Math.random;
    // Jitter range: from (1 - jitterPct) to (1 + jitterPct)
    const jitterMultiplier = 1 + (rand() * 2 - 1) * this.jitterPct;
    return cappedDelay * jitterMultiplier;
  }

  public reset(): void {
    this.attempt = 0;
  }

  public getAttempt(): number {
    return this.attempt;
  }
}

export interface HeartbeatOptions {
  heartbeatInterval?: number;       // default: 15000 (15s)
  missedPingsThreshold?: number;    // default: 3
  onPeerOffline?: (peerId: string) => void;
  onPeerOnline?: (peerId: string) => void;
}

export class HeartbeatManager {
  private client: any;
  private intervalId: any = null;
  private heartbeatInterval: number;
  private missedPingsThreshold: number;
  private onPeerOffline?: (peerId: string) => void;
  private onPeerOnline?: (peerId: string) => void;

  private lastSeen = new Map<string, number>();

  constructor(client: any, options?: HeartbeatOptions) {
    this.client = client;
    this.heartbeatInterval = options?.heartbeatInterval ?? 15000;
    this.missedPingsThreshold = options?.missedPingsThreshold ?? 3;
    this.onPeerOffline = options?.onPeerOffline;
    this.onPeerOnline = options?.onPeerOnline;
  }

  public start(): void {
    if (this.intervalId) return;

    // Initialize last seen for any already online peer
    if (this.client && Array.isArray(this.client.peers)) {
      for (const peer of this.client.peers) {
        if (peer.id !== 'self' && peer.presence === 'online') {
          this.lastSeen.set(peer.id, Date.now());
        }
      }
    }

    // Periodically broadcast ping and check for timeouts
    this.intervalId = setInterval(() => {
      this.sendPing();
      this.checkTimeouts();
    }, this.heartbeatInterval);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public registerPeerActivity(peerId: string): void {
    this.lastSeen.set(peerId, Date.now());
  }

  public handleHeartbeatMessage(msg: any): void {
    if (!msg || msg.type !== 'heartbeat') return;
    const senderId = msg.sender;
    if (!senderId || senderId === this.client?.instanceId) return;

    const peerId = senderId.startsWith('nido-') ? senderId : `nido-${senderId}`;
    const isPreviouslyOffline = this.client?.peers?.some((p: any) => p.id === peerId && p.presence === 'offline');

    this.lastSeen.set(peerId, Date.now());

    // Mark online if they were marked offline
    if (isPreviouslyOffline) {
      const peer = this.client?.peers?.find((p: any) => p.id === peerId);
      if (peer) {
        peer.presence = 'online';
        peer.lastSeen = new Date().toISOString();
      }
      if (this.onPeerOnline) {
        this.onPeerOnline(peerId);
      }
    }

    if (msg.subtype === 'ping') {
      // Reply with a pong broadcast
      try {
        this.client.publishState(this.client.namespace, {
          type: 'heartbeat',
          subtype: 'pong',
          sender: this.client.instanceId
        });
      } catch (e) {
        // Ignore
      }
    }
  }

  private sendPing(): void {
    if (!this.client) return;
    try {
      this.client.publishState(this.client.namespace, {
        type: 'heartbeat',
        subtype: 'ping',
        sender: this.client.instanceId
      });
    } catch (err) {
      // Ignore publish errors
    }
  }

  private checkTimeouts(): void {
    if (!this.client || !Array.isArray(this.client.peers)) return;

    const now = Date.now();
    const timeoutLimit = this.heartbeatInterval * this.missedPingsThreshold;

    for (const peer of this.client.peers) {
      if (peer.id === 'self') continue;

      if (peer.presence === 'online') {
        const lastActivity = this.lastSeen.get(peer.id);
        const elapsed = lastActivity ? now - lastActivity : timeoutLimit + 1; // If never seen, mark offline

        if (elapsed >= timeoutLimit) {
          peer.presence = 'offline';
          peer.lastSeen = new Date().toISOString();
          if (this.onPeerOffline) {
            this.onPeerOffline(peer.id);
          }
        }
      }
    }
  }
}
