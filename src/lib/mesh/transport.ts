import {
  createEnvelope,
  MessageDeduplicator,
  type Envolvente,
  type NodoId,
  type TipoMensaje,
  TIPO_MENSAJE,
  type TransportEventMap,
  type ITransport
} from "../vendor/edge-mesh/src/index";

export interface SignalingMessage {
  type: "offer" | "answer" | "candidate";
  payload: any;
}

export interface SignalingChannel {
  sendOffer(from: string, to: string, offer: any): void;
  sendAnswer(from: string, to: string, answer: any): void;
  sendCandidate(from: string, to: string, candidate: any): void;
  register(nodeId: string, handler: (from: string, msg: SignalingMessage) => void): void;
  unregister?(nodeId: string): void;
}

export class InMemorySignaling implements SignalingChannel {
  private handlers = new Map<string, (from: string, msg: SignalingMessage) => void>();

  sendOffer(from: string, to: string, offer: any): void {
    const handler = this.handlers.get(to);
    if (handler) {
      setTimeout(() => handler(from, { type: "offer", payload: offer }), 0);
    }
  }

  sendAnswer(from: string, to: string, answer: any): void {
    const handler = this.handlers.get(to);
    if (handler) {
      setTimeout(() => handler(from, { type: "answer", payload: answer }), 0);
    }
  }

  sendCandidate(from: string, to: string, candidate: any): void {
    const handler = this.handlers.get(to);
    if (handler) {
      setTimeout(() => handler(from, { type: "candidate", payload: candidate }), 0);
    }
  }

  register(nodeId: string, handler: (from: string, msg: SignalingMessage) => void): void {
    this.handlers.set(nodeId, handler);
  }

  unregister(nodeId: string): void {
    this.handlers.delete(nodeId);
  }
}

export type RTCPeerConnectionFactory = (config?: RTCConfiguration) => RTCPeerConnection;

function esEnvolvente(valor: unknown): valor is Envolvente {
  if (typeof valor !== "object" || valor === null) return false;
  const candidate = valor as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.tipo === "string" &&
    typeof candidate.origen === "string" &&
    typeof candidate.destino === "string" &&
    typeof candidate.timestamp === "number" &&
    candidate.payload !== undefined
  );
}

export class WebRTCTransport implements ITransport {
  readonly tipo = "websocket" as any; // Using valid mapped TipoTransporte string cast
  readonly eventTarget: EventTarget;
  readonly nodoId: NodoId;
  private readonly rtcFactory: RTCPeerConnectionFactory;
  private readonly signaling: SignalingChannel;
  private readonly conexiones = new Map<string, { peerConnection: RTCPeerConnection; dataChannel?: RTCDataChannel }>();
  private readonly deduplicator = new MessageDeduplicator();
  private conectado = false;

  constructor(
    nodoId: NodoId,
    signaling: SignalingChannel,
    rtcFactory: RTCPeerConnectionFactory = (config) => new RTCPeerConnection(config)
  ) {
    this.nodoId = nodoId;
    this.signaling = signaling;
    this.rtcFactory = rtcFactory;
    this.eventTarget = new EventTarget();

    this.signaling.register(this.nodoId, async (from, msg) => {
      try {
        if (msg.type === "offer") {
          await this.handleOffer(from, msg.payload);
        } else if (msg.type === "answer") {
          await this.handleAnswer(from, msg.payload);
        } else if (msg.type === "candidate") {
          await this.handleCandidate(from, msg.payload);
        }
      } catch (err) {
        this.emit("error", { mensaje: `Error processing signaling from ${from}`, error: err as Error });
      }
    });
  }

  on<K extends keyof TransportEventMap>(
    tipo: K,
    handler: (ev: TransportEventMap[K]) => void,
  ): void {
    this.eventTarget.addEventListener(tipo as string, handler as EventListener);
  }

  off<K extends keyof TransportEventMap>(
    tipo: K,
    handler: (ev: TransportEventMap[K]) => void,
  ): void {
    this.eventTarget.removeEventListener(
      tipo as string,
      handler as EventListener,
    );
  }

  private emit<K extends keyof TransportEventMap>(
    tipo: K,
    detalle: TransportEventMap[K]["detail"],
  ): void {
    const evento = new CustomEvent(tipo as string, { detail: detalle });
    this.eventTarget.dispatchEvent(evento);
  }

  private setupDataChannel(remoteId: string, dc: RTCDataChannel): void {
    dc.onopen = () => {
      this.conectado = true;
      this.emit("conectado", { nodoId: remoteId as NodoId });
    };

    dc.onclose = () => {
      this.conexiones.delete(remoteId);
      this.emit("desconectado", { nodoId: remoteId as NodoId });
    };

    dc.onerror = (err) => {
      this.emit("error", { mensaje: `DataChannel error with ${remoteId}`, error: err as any });
    };

    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (esEnvolvente(data)) {
          if (this.deduplicator.esDuplicado(data)) return;
          this.emit("mensaje", { envolvente: data, from: remoteId as NodoId });
        }
      } catch (err) {
        this.emit("error", { mensaje: `Failed to parse message from ${remoteId}`, error: err as Error });
      }
    };
  }

  async conectarRemoto(remotoId: string): Promise<void> {
    if (this.conexiones.has(remotoId)) {
      return;
    }

    const pc = this.rtcFactory();
    const dc = pc.createDataChannel("edge-mesh-channel", { ordered: true });

    this.conexiones.set(remotoId, { peerConnection: pc, dataChannel: dc });
    this.setupDataChannel(remotoId, dc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendCandidate(this.nodoId, remotoId, event.candidate);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signaling.sendOffer(this.nodoId, remotoId, offer);
  }

  private async handleOffer(from: string, offer: any): Promise<void> {
    const existing = this.conexiones.get(from);
    if (existing) {
      existing.peerConnection.close();
    }

    const pc = this.rtcFactory();
    const conn = { peerConnection: pc, dataChannel: undefined as any };
    this.conexiones.set(from, conn);

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      conn.dataChannel = dc;
      this.setupDataChannel(from, dc);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendCandidate(this.nodoId, from, event.candidate);
      }
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.signaling.sendAnswer(this.nodoId, from, answer);
  }

  private async handleAnswer(from: string, answer: any): Promise<void> {
    const conn = this.conexiones.get(from);
    if (!conn) return;
    await conn.peerConnection.setRemoteDescription(answer);
  }

  private async handleCandidate(from: string, candidate: any): Promise<void> {
    const conn = this.conexiones.get(from);
    if (!conn) return;
    await conn.peerConnection.addIceCandidate(candidate);
  }

  async enviar(
    destino: NodoId,
    payload: unknown,
    tipoMensaje: string = TIPO_MENSAJE.SYNC,
  ): Promise<void> {
    const conn = this.conexiones.get(destino);
    if (!conn || !conn.dataChannel || conn.dataChannel.readyState !== "open") {
      throw new Error(`No open connection with node ${destino}`);
    }

    let env = payload;
    if (!esEnvolvente(payload)) {
      env = createEnvelope(
        tipoMensaje as TipoMensaje,
        this.nodoId,
        destino,
        payload,
      );
    }

    conn.dataChannel.send(JSON.stringify(env));
  }

  async transmitir(
    payload: unknown,
    tipoMensaje: string = TIPO_MENSAJE.SYNC,
  ): Promise<void> {
    const env = esEnvolvente(payload)
      ? payload
      : createEnvelope(tipoMensaje as TipoMensaje, this.nodoId, "*", payload);

    const dataStr = JSON.stringify(env);
    for (const [_, conn] of this.conexiones.entries()) {
      if (conn.dataChannel && conn.dataChannel.readyState === "open") {
        try {
          conn.dataChannel.send(dataStr);
        } catch {
          // Ignore individual channel broadcast failure
        }
      }
    }
  }

  estaConectado(): boolean {
    return this.conectado;
  }

  obtenerConexiones(): readonly string[] {
    return Array.from(this.conexiones.entries())
      .filter(([_, conn]) => conn.dataChannel && conn.dataChannel.readyState === "open")
      .map(([dest, _]) => dest);
  }

  async cerrar(): Promise<void> {
    for (const [dest, conn] of this.conexiones.entries()) {
      try {
        if (conn.dataChannel) {
          conn.dataChannel.close();
        }
        conn.peerConnection.close();
      } catch {
        // Ignore
      }
      this.emit("desconectado", { nodoId: dest as NodoId });
    }
    this.conexiones.clear();
    this.conectado = false;
    this.deduplicator.reiniciar();
  }
}
