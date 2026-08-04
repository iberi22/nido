import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { EdgeHiveClient } from "../../src/lib/maloca/client";
import { isPro } from "../../src/lib/maloca/tier";

interface MockResponseConfig {
  accountStatus: {
    status: number;
    body: any;
  };
  nodeStatus: {
    status: number;
    body: any;
  };
  syncResponse: {
    status: number;
    body: any;
  };
  delayMs?: number;
}

const DEFAULT_MOCK_CONFIG: MockResponseConfig = {
  accountStatus: {
    status: 200,
    body: { status: "active", email: "user@example.com", userId: "user-123" },
  },
  nodeStatus: {
    status: 200,
    body: { nodeId: "node-123", active: true, expiresAt: "2026-09-01T00:00:00Z" },
  },
  syncResponse: {
    status: 200,
    body: { success: true, updatedAt: "2026-08-04T12:00:00Z" },
  },
  delayMs: 0,
};

describe("Maloca Edge-Hive Live Contract & Integration Tests", () => {
  let server: Server;
  let baseUrl: string;
  let mockConfig: MockResponseConfig;

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      if (mockConfig.delayMs && mockConfig.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, mockConfig.delayMs));
      }

      res.setHeader("Content-Type", "application/json");

      if (req.url === "/api/v1/account/status") {
        res.statusCode = mockConfig.accountStatus.status;
        res.end(JSON.stringify(mockConfig.accountStatus.body));
      } else if (req.url === "/api/v1/node/status") {
        res.statusCode = mockConfig.nodeStatus.status;
        res.end(JSON.stringify(mockConfig.nodeStatus.body));
      } else if (req.url === "/api/v1/instance/sync") {
        res.statusCode = mockConfig.syncResponse.status;
        res.end(JSON.stringify(mockConfig.syncResponse.body));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "not found" }));
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    // Deep clone/reset default mock config
    mockConfig = JSON.parse(JSON.stringify(DEFAULT_MOCK_CONFIG));
  });

  it("1. should correctly parse 200 OK account status response", async () => {
    const client = new EdgeHiveClient({ baseUrl, fetch });
    const accountStatus = await client.getAccountStatus();

    expect(accountStatus).toEqual({
      status: "active",
      email: "user@example.com",
      userId: "user-123",
    });
  });

  it("2. should identify active node status and evaluate isPro as true", async () => {
    mockConfig.nodeStatus.body.active = true;
    const client = new EdgeHiveClient({ baseUrl, fetch });
    const nodeStatus = await client.getNodeStatus();

    expect(nodeStatus.active).toEqual(true);
    expect(isPro(nodeStatus)).toEqual(true);
  });

  it("3. should identify inactive node status and evaluate isPro as false", async () => {
    mockConfig.nodeStatus.body.active = false;
    const client = new EdgeHiveClient({ baseUrl, fetch });
    const nodeStatus = await client.getNodeStatus();

    expect(nodeStatus.active).toEqual(false);
    expect(isPro(nodeStatus)).toEqual(false);
  });

  it("4. should handle 500 server error responses by reverting to degraded/default states", async () => {
    mockConfig.accountStatus.status = 500;
    mockConfig.nodeStatus.status = 500;
    mockConfig.syncResponse.status = 500;

    const client = new EdgeHiveClient({ baseUrl, fetch });

    const accountStatus = await client.getAccountStatus();
    expect(accountStatus).toEqual({
      status: "degraded",
      email: null,
      userId: null,
    });

    const nodeStatus = await client.getNodeStatus();
    expect(nodeStatus).toEqual({
      nodeId: null,
      active: false,
      expiresAt: null,
    });

    const syncRes = await client.syncInstance("test-inst", {});
    expect(syncRes).toEqual({
      success: false,
      updatedAt: null,
    });
  });

  it("5. should gracefully degrade on request timeout using a custom fetch timeout wrapper", async () => {
    mockConfig.delayMs = 150; // Delay mock server reply

    // Custom fetch wrapper simulating client timeout via AbortController
    const timeoutFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10); // Abort very quickly
      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const client = new EdgeHiveClient({ baseUrl, fetch: timeoutFetch });

    const accountStatus = await client.getAccountStatus();
    expect(accountStatus.status).toEqual("degraded");

    const nodeStatus = await client.getNodeStatus();
    expect(nodeStatus.active).toEqual(false);

    const syncRes = await client.syncInstance("test-inst", {});
    expect(syncRes.success).toEqual(false);
  });
});

describe("EdgeHiveClient Live Probe (skipped unless active dev server found) [live]", () => {
  async function isRealEdgeHiveReachable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100);
      const res = await fetch("http://127.0.0.1:8006/api/v1/account/status", { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.status === 200 || res.status === 401 || res.status === 403;
    } catch {
      return false;
    }
  }

  it("should run live contract checks if real edge-hive dev server is reachable", async () => {
    const reachable = await isRealEdgeHiveReachable();
    if (!reachable) {
      console.log("Real edge-hive dev server is absent at http://127.0.0.1:8006. Skipping live test.");
      return;
    }

    const client = new EdgeHiveClient({ baseUrl: "http://127.0.0.1:8006", fetch });
    const accountStatus = await client.getAccountStatus();
    expect(accountStatus).toBeDefined();
    expect(accountStatus.status).not.toBeNull();
  });
});
