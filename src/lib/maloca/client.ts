/**
 * --- EDGE-HIVE BACKEND REST API CONTRACT ---
 *
 * Base URL (Injectable, e.g. http://127.0.0.1:8006 or Xavier / edge-hive backend port)
 *
 * Endpoints:
 * 1. GET /api/v1/account/status
 *    Response: { status: "active" | "inactive" | "suspended", email: string, userId: string }
 *
 * 2. GET /api/v1/node/status
 *    Response: { nodeId: string, active: boolean, expiresAt: string | null }
 *
 * 3. POST /api/v1/instance/sync
 *    Payload: { instanceId: string, state: any }
 *    Response: { success: boolean, updatedAt: string }
 *
 * This client is thoroughly verified using in-process mock HTTP integration tests
 * (see test/integration/maloca-live.test.ts).
 */

export interface AccountStatus {
  status: "active" | "inactive" | "suspended" | "degraded";
  email: string | null;
  userId: string | null;
}

export interface NodeStatus {
  nodeId: string | null;
  active: boolean;
  expiresAt: string | null;
}

export interface SyncResponse {
  success: boolean;
  updatedAt: string | null;
}

export class EdgeHiveClient {
  private baseUrl: string;
  private customFetch: typeof fetch;

  constructor(options?: { baseUrl?: string; fetch?: typeof fetch }) {
    this.baseUrl = options?.baseUrl || "http://127.0.0.1:8006";
    // fallback to global fetch if available
    this.customFetch = options?.fetch || (typeof fetch !== "undefined" ? fetch : (() => {
      throw new Error("No global fetch found. Please inject one.");
    }) as unknown as typeof fetch);
  }

  async getAccountStatus(): Promise<AccountStatus> {
    try {
      const response = await this.customFetch(`${this.baseUrl}/api/v1/account/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        status: data.status || "inactive",
        email: data.email || null,
        userId: data.userId || null,
      };
    } catch (error) {
      return {
        status: "degraded",
        email: null,
        userId: null,
      };
    }
  }

  async getNodeStatus(): Promise<NodeStatus> {
    try {
      const response = await this.customFetch(`${this.baseUrl}/api/v1/node/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        nodeId: data.nodeId || null,
        active: !!data.active,
        expiresAt: data.expiresAt || null,
      };
    } catch (error) {
      return {
        nodeId: null,
        active: false,
        expiresAt: null,
      };
    }
  }

  async syncInstance(instanceId: string, state: any): Promise<SyncResponse> {
    try {
      if (!instanceId) {
        throw new Error("instanceId must not be empty");
      }
      const response = await this.customFetch(`${this.baseUrl}/api/v1/instance/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceId, state }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        success: !!data.success,
        updatedAt: data.updatedAt || null,
      };
    } catch (error) {
      return {
        success: false,
        updatedAt: null,
      };
    }
  }
}
