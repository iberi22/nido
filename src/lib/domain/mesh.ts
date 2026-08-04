// NIDO — edge-mesh integration layer (REQ-004, REQ-022, REQ-023)
//
// Wraps the edge-mesh core (vendored in wave 3 — M5 scope). This module
// provides the typed application surface: namespace isolation, presence,
// authorization, and chat. The real edge-mesh transport (WebRTC/Yjs) is
// wired in wave 3; until then, functions are pure state transitions so the
// domain can be tested offline.

export interface MeshPeer {
  id: string;
  name: string;
  presence: 'online' | 'offline' | 'away';
  lastSeen?: string; // ISO date
}

export interface MeshMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  createdAt: string; // ISO date
}

export interface MeshClient {
  instanceId: string;
  namespace: string;
  peers: MeshPeer[];
  messages: MeshMessage[];
  publishPresence(presence: MeshPeer['presence']): void;
  sendChatMessage(to: string, text: string): MeshMessage;
  authzCheck(resource: string, action: string): boolean;
}

export interface MeshState {
  instanceId: string;
  peers: Record<string, MeshPeer>;
  messages: MeshMessage[];
  online: boolean;
  authzRules: Record<string, string[]>; // resource -> allowed actions
}

const MESH_NAMESPACE = 'swal/nido';

/** Create the isolated mesh namespace for an instance (REQ-004). */
export function createMeshClient(instanceId: string): MeshClient {
  const state: MeshState = {
    instanceId,
    peers: {},
    messages: [],
    online: false,
    authzRules: {
      'plan:read': ['admin', 'propietario', 'supervisor', 'inquilino'],
      'plan:write': ['admin', 'propietario'],
      'lease:read': ['admin', 'propietario', 'inquilino'],
      'lease:write': ['admin', 'propietario'],
      'dispute:vote': ['admin', 'propietario', 'inquilino', 'supervisor'],
    },
  };

  return {
    get instanceId() { return state.instanceId; },
    get namespace() { return `${MESH_NAMESPACE}/${instanceId}`; },
    get peers() { return Object.values(state.peers); },
    get messages() { return [...state.messages]; },
    publishPresence(presence: MeshPeer['presence']) {
      state.online = presence !== 'offline';
      const me: MeshPeer = state.peers['self'] ?? { id: 'self', name: 'me', presence: 'offline' };
      me.presence = presence;
      me.lastSeen = new Date().toISOString();
      state.peers['self'] = me;
    },
    sendChatMessage(to: string, text: string): MeshMessage {
      const msg: MeshMessage = {
        id: crypto.randomUUID(),
        from: 'self',
        to,
        text,
        createdAt: new Date().toISOString(),
      };
      state.messages.push(msg);
      return msg;
    },
    authzCheck(resource: string, role: string): boolean {
      if (role === 'admin') return true; // instance owner: full access
      const allowed = state.authzRules[resource] ?? [];
      return allowed.includes(role);
    },
  };
}

/** Presence heartbeat helper. */
export function publishPresence(client: MeshClient, presence: MeshPeer['presence']): void {
  client.publishPresence(presence);
}

/** Namespace-scoped authorization check (REQ-022). */
export function authzCheck(client: MeshClient, resource: string, action: string): boolean {
  return client.authzCheck(resource, action);
}

/** Sign payload with post-quantum identity — typed stub until edge-mesh ML-DSA-65 lands (wave 3). */
export function signWithIdentity(payload: string): string {
  // TODO(wave-3): replace with edge-mesh ML-DSA-65 signing
  return `stub-signature:${payload.length}`;
}

/** Chat message via Yjs — typed surface; transport wired in wave 3. */
export function sendChatMessage(client: MeshClient, peerId: string, text: string): MeshMessage {
  return client.sendChatMessage(peerId, text);
}
