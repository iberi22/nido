// NIDO — edge-mesh integration layer (REQ-004, REQ-022, REQ-023)
//
// Typed application surface over vendored @iberi22/edge-mesh: namespace
// isolation, presence, authorization, Yjs chat, and ML-DSA-65 identity.
// Uses InMemoryStorage (storageBackend: "mem") so tests/CI stay offline —
// no WebRTC/PeerJS until EdgeMesh.iniciar() is called by a live host.

import {
  ChatChannel,
  EdgeMesh,
  MeshPresence,
  TIPO_CANAL,
  bytesAHex,
  createPostQuantumIdentity,
  generateKeypair,
  type NodoId,
} from "@iberi22/edge-mesh";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";

export interface MeshPeer {
  id: string;
  name: string;
  presence: "online" | "offline" | "away";
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
  publishPresence(presence: MeshPeer["presence"]): void;
  sendChatMessage(to: string, text: string): MeshMessage;
  authzCheck(resource: string, action: string): boolean;
}

export interface MeshState {
  instanceId: string;
  peers: Record<string, MeshPeer>;
  messages: MeshMessage[];
  online: boolean;
  authzRules: Record<string, string[]>; // resource -> allowed roles
}

const MESH_NAMESPACE = "swal/nido";
const SELF_PEER_ID = "self";
/** Long-lived grants for role-based authz seeded into NamespaceAuthorizer. */
const AUTHZ_GRANT_TTL_MS = 1000 * 60 * 60 * 24 * 365 * 100;

const DEFAULT_AUTHZ_RULES: Record<string, string[]> = {
  "plan:read": ["admin", "propietario", "supervisor", "inquilino"],
  "plan:write": ["admin", "propietario"],
  "lease:read": ["admin", "propietario", "inquilino"],
  "lease:write": ["admin", "propietario"],
  "dispute:vote": ["admin", "propietario", "inquilino", "supervisor"],
};

function asNodoId(id: string): NodoId {
  return id as NodoId;
}

/** Module-level ML-DSA-65 identity for sync signWithIdentity (public API is sync). */
const signingIdentity = createPostQuantumIdentity(
  asNodoId("nido-signer"),
  generateKeypair("maestra"),
);

function seedAuthz(mesh: EdgeMesh, namespace: string, rules: Record<string, string[]>): void {
  for (const [resource, roles] of Object.entries(rules)) {
    for (const role of roles) {
      mesh.authorizer.concederCapacidad(
        namespace,
        asNodoId(role),
        resource,
        AUTHZ_GRANT_TTL_MS,
      );
    }
  }
}

/** Create the isolated mesh namespace for an instance (REQ-004). */
export function createMeshClient(instanceId: string): MeshClient {
  const namespace = `${MESH_NAMESPACE}/${instanceId}`;
  const nodoId = asNodoId(`nido-${instanceId}`);

  // Real EdgeMesh with in-memory storage — no PeerJS until iniciar().
  const mesh = new EdgeMesh({
    nodoId,
    storageBackend: "mem",
    defaultSyncNamespace: namespace,
    requireAuthz: false,
  });

  const authzRules = { ...DEFAULT_AUTHZ_RULES };
  seedAuthz(mesh, namespace, authzRules);

  const chat = new ChatChannel(
    nodoId,
    `${namespace}/chat`,
    mesh.yjsAdapter,
    TIPO_CANAL.PUBLICO,
  );

  const state: MeshState = {
    instanceId,
    peers: {},
    messages: [],
    online: false,
    authzRules,
  };

  return {
    get instanceId() {
      return state.instanceId;
    },
    get namespace() {
      return namespace;
    },
    get peers() {
      return Object.values(state.peers);
    },
    get messages() {
      return [...state.messages];
    },
    publishPresence(presence: MeshPeer["presence"]) {
      state.online = presence !== "offline";
      MeshPresence.setOnline(SELF_PEER_ID, state.online);
      const me: MeshPeer = state.peers[SELF_PEER_ID] ?? {
        id: SELF_PEER_ID,
        name: "me",
        presence: "offline",
      };
      me.presence = presence;
      me.lastSeen = new Date().toISOString();
      state.peers[SELF_PEER_ID] = me;
    },
    sendChatMessage(to: string, text: string): MeshMessage {
      // Yjs CRDT write via ChatChannel (sync local apply; no network without iniciar).
      void chat.sendMessage(text, undefined, { to });
      const msg: MeshMessage = {
        id: crypto.randomUUID(),
        from: SELF_PEER_ID,
        to,
        text,
        createdAt: new Date().toISOString(),
      };
      state.messages.push(msg);
      return msg;
    },
    authzCheck(resource: string, role: string): boolean {
      // Instance owner: full access (matches NamespaceAuthorizer admin short-circuit).
      if (role === "admin") return true;
      return mesh.authorizer.verificarCapacidad(
        namespace,
        asNodoId(role),
        resource,
      );
    },
  };
}

/** Presence heartbeat helper. */
export function publishPresence(client: MeshClient, presence: MeshPeer["presence"]): void {
  client.publishPresence(presence);
}

/** Namespace-scoped authorization check (REQ-022). */
export function authzCheck(client: MeshClient, resource: string, action: string): boolean {
  return client.authzCheck(resource, action);
}

/** Sign payload with real ML-DSA-65 (@noble/post-quantum via edge-mesh identity keypair). */
export function signWithIdentity(payload: string): string {
  const datos = new TextEncoder().encode(payload);
  const firma = ml_dsa65.sign(datos, signingIdentity.keypair.parPrivado);
  return bytesAHex(firma);
}

/** Chat message via Yjs ChatChannel — typed surface over edge-mesh transport. */
export function sendChatMessage(client: MeshClient, peerId: string, text: string): MeshMessage {
  return client.sendChatMessage(peerId, text);
}
