// Type declarations for vendored @iberi22/edge-mesh (G3 — source + ambient surface)

export type NodoId = string & { readonly __brand: 'NodoId' };
export type ParPublico = Uint8Array;

export type TipoIdentidad = 'maestra' | 'ephemera' | 'servicio';

export interface PostQuantumKeypair {
  readonly parPrivado: Uint8Array;
  readonly parPublico: ParPublico;
  readonly algoritmo: string;
  readonly tipo: TipoIdentidad;
  readonly fechaCreacion: number;
}

export interface PostQuantumIdentity {
  readonly nodoId: NodoId;
  readonly keypair: PostQuantumKeypair;
  sign(data: string): Promise<string>;
  verify(data: string, signature: string, publicKey: Uint8Array): Promise<boolean>;
  firmar(datos: Uint8Array): Promise<Uint8Array>;
  verificar(datos: Uint8Array, firma: Uint8Array, parPublico: ParPublico): Promise<boolean>;
  exportarPublico(): ParPublico;
  obtenerAlgoritmo(): string;
}

export const TIPO_IDENTIDAD: {
  readonly MAESTRA: 'maestra';
  readonly EPHEMERA: 'ephemera';
  readonly SERVICIO: 'servicio';
};

export function generateKeypair(tipo?: TipoIdentidad): PostQuantumKeypair;
export function createPostQuantumIdentity(
  nodoId: NodoId,
  keypair?: PostQuantumKeypair,
): PostQuantumIdentity;
export function identityFromSecret(
  nodoId: NodoId,
  semilla: Uint8Array,
  tipo?: TipoIdentidad,
): PostQuantumIdentity;
export function serializeKeypair(keypair: PostQuantumKeypair): Uint8Array;
export function deserializeKeypair(bytes: Uint8Array): PostQuantumKeypair;

export interface EdgeMeshNode {
  readonly nodoId: NodoId;
  readonly eventTarget: EventTarget;
  estado: string;
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  enviar(destino: NodoId, payload: unknown): Promise<void>;
  transmitir(payload: unknown): Promise<void>;
  on(tipo: string, handler: (ev: CustomEvent) => void): void;
  off(tipo: string, handler: (ev: CustomEvent) => void): void;
  emit(tipo: string, detalle: unknown): void;
}

export function createEdgeMeshNode(nodoId: NodoId): EdgeMeshNode;
export const ESTADO_TRANSICIONES: Record<string, readonly string[]>;

export interface EdgeMeshConfig {
  readonly nodoId: NodoId;
  readonly peerId?: string;
  readonly identitySecret?: Uint8Array;
  readonly heartbeatIntervalMs?: number;
  readonly heartbeatTimeoutMs?: number;
  readonly snapshotInterval?: number;
  readonly storagePrefix?: string;
  readonly storageBackend?: 'mem' | 'idb';
  readonly governancePolicy?: unknown;
  readonly transportConfig?: Record<string, unknown>;
  readonly maxReconnectAttempts?: number;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
  readonly requireAuthz?: boolean;
  readonly requireSignedEnvelopes?: boolean;
  readonly defaultSyncNamespace?: string;
  readonly yDoc?: {
    on: (...args: never[]) => unknown;
    off: (...args: never[]) => unknown;
    getMap: (name: string) => unknown;
    destroy: () => void;
    [key: string]: unknown;
  };
  readonly relayLocalYjs?: boolean;
}

export class YjsAdapter {
  readonly doc: unknown;
  readonly ownsDoc: boolean;
  constructor(existingDoc?: unknown, ownsDoc?: boolean);
  onUpdate(handler: (update: Uint8Array, origin: unknown) => void): () => void;
  applyUpdate(update: Uint8Array, origin?: unknown): void;
  getState(): Uint8Array;
  getStateVector(): Uint8Array;
  merge(remoteState: Uint8Array): void;
  getMap(name: string): unknown;
  getArray(name: string): unknown;
  getText(name: string): unknown;
  destroy(): void;
}

export class EdgeMesh {
  readonly config: EdgeMeshConfig;
  readonly nodo: EdgeMeshNode;
  readonly eventTarget: EventTarget;
  readonly identity: PostQuantumIdentity;
  readonly presence: PresenceManager;
  readonly authorizer: NamespaceAuthorizer;
  readonly yjsAdapter: YjsAdapter;
  readonly sharesExternalDoc: boolean;
  constructor(config: EdgeMeshConfig);
  registrarClavePublica(nodoId: NodoId, parPublico: ParPublico): void;
  obtenerClavePublica(nodoId: NodoId): ParPublico | undefined;
  usarTransport(transport: unknown): void;
  detachTransport(): void;
  iniciar(): Promise<void>;
  detener(): Promise<void>;
  obtenerTransport(): unknown;
  isSharedYDoc(): boolean;
  enviar(destino: NodoId, tipo: string, payload: unknown): Promise<void>;
  transmitir(tipo: string, payload: unknown): Promise<void>;
  broadcastYjsUpdate(update: Uint8Array, origin?: unknown): Promise<void>;
  recibirEnvelope(env: unknown): Promise<void>;
  on(tipo: string, handler: (ev: CustomEvent) => void): void;
  off(tipo: string, handler: (ev: CustomEvent) => void): void;
}

export class MeshPresence {
  static isOnline(peerId: string): boolean;
  static setOnline(peerId: string, online: boolean): void;
  static clear(): void;
}

export class PresenceManager {
  readonly eventTarget: EventTarget;
  peerId: string;
  iniciar(
    nodoId: NodoId,
    transmitir: (payload: unknown) => Promise<void>,
    identity?: PostQuantumIdentity,
  ): Promise<void>;
  detener(): void;
  registrarClavePublica(nodoId: string, parPublico: Uint8Array): void;
}

export class InMemoryStorage {
  constructor();
}

export const TIPO_CANAL: {
  readonly PUBLICO: 'publico';
  readonly PRIVADO: 'privado';
  readonly SALON_VIRTUAL: 'salon_virtual';
};

export function bytesAHex(bytes: Uint8Array): string;
export function hexABytes(hex: string): Uint8Array;

export type CapacidadEstandar = 'read' | 'write' | 'admin' | 'sync' | 'presence' | 'governance';

export const CAPACIDAD_ESTANDAR: {
  readonly LEER: 'read';
  readonly ESCRIBIR: 'write';
  readonly ADMIN: 'admin';
  readonly SINC: 'sync';
  readonly PRESENCIA: 'presence';
  readonly GOBERNANZA: 'governance';
};

export class NamespaceAuthorizer {
  readonly eventTarget: EventTarget;
  constructor();
  concederCapacidad(
    espacio: string,
    sujeto: NodoId,
    capacidad: string,
    expiracionMs?: number,
    firma?: Uint8Array,
  ): unknown;
  revocarCapacidad(espacio: string, sujeto: NodoId, capacidad: string): boolean;
  verificarCapacidad(espacio: string, sujeto: NodoId, capacidad: string): boolean;
  agregarReglaLocal(espacio: string, regla: string): void;
  removerReglaLocal(espacio: string, regla: string): boolean;
  verificarReglaLocal(espacio: string, regla: string): boolean;
  obtenerGrantsDeNodo(sujeto: NodoId): readonly unknown[];
  obtenerGrantsDeEspacio(espacio: string): readonly unknown[];
  obtenerTodosLosGrants(): readonly unknown[];
  limpiarGrantsExpirados(): number;
  on(tipo: string, handler: (ev: CustomEvent) => void): void;
  off(tipo: string, handler: (ev: CustomEvent) => void): void;
}

export function createNamespaceAuthorizer(): NamespaceAuthorizer;

export type TipoCanal = string;
export type ChatMessage = {
  readonly id: string;
  readonly from: string;
  readonly text: string;
  readonly timestamp: number;
  [key: string]: unknown;
};

export class ChatChannel extends EventTarget {
  readonly nodoId: NodoId;
  readonly nombreCanal: string;
  readonly tipoCanal: TipoCanal;
  readonly yjsAdapter: YjsAdapter;
  peerId?: string;
  constructor(
    nodoId: NodoId,
    nombreCanal: string,
    yjsAdapter: YjsAdapter,
    tipoCanal?: TipoCanal,
    offlineQueue?: unknown,
  );
  setPeerId(peerId: string): void;
  enviarMensajeDirecto(mensaje: ChatMessage): Promise<void>;
  sendMessage(
    texto: string,
    tipo?: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): Promise<string>;
  enviarMensaje(
    texto: string,
    tipo?: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): Promise<string>;
  unirseAlCanal(): Promise<void>;
  abandonarCanal(): Promise<void>;
  obtenerHistorial(limite?: number): Promise<readonly unknown[]>;
  obtenerUsuariosConectados(): readonly string[];
  limpiarHistorial(): Promise<void>;
}

export function createGovernanceManager(policy?: unknown): unknown;
