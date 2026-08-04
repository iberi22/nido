import { describe, it, expect, vi } from "vitest";
import { EdgeHiveClient } from "../../src/lib/maloca/client";
import { isPro } from "../../src/lib/maloca/tier";
import { getMeshNamespace, generateInstanceId } from "../../src/lib/maloca/instance";

describe("Maloca Client & Tier Unit Tests", () => {
  it("1. should parse account status correctly when successful", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "active",
        email: "xavier@swal.xyz",
        userId: "user_123",
      }),
    });

    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    const status = await client.getAccountStatus();
    expect(status.status).toBe("active");
    expect(status.email).toBe("xavier@swal.xyz");
    expect(status.userId).toBe("user_123");
    expect(mockFetch).toHaveBeenCalledWith("http://mock-hive/api/v1/account/status");
  });

  it("2. should return degraded fallback state when account status fetch fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    const status = await client.getAccountStatus();
    expect(status.status).toBe("degraded");
    expect(status.email).toBeNull();
    expect(status.userId).toBeNull();
  });

  it("3. should parse node status correctly when node is active (Pro)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nodeId: "node_active_99",
        active: true,
        expiresAt: "2026-12-31T23:59:59Z",
      }),
    });

    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    const status = await client.getNodeStatus();
    expect(status.nodeId).toBe("node_active_99");
    expect(status.active).toBe(true);
    expect(status.expiresAt).toBe("2026-12-31T23:59:59Z");
    expect(isPro(status)).toBe(true);
  });

  it("4. should handle inactive or expired node status (Non-Pro)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nodeId: "node_inactive_12",
        active: false,
        expiresAt: null,
      }),
    });

    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    const status = await client.getNodeStatus();
    expect(status.nodeId).toBe("node_inactive_12");
    expect(status.active).toBe(false);
    expect(isPro(status)).toBe(false);
    expect(isPro(null)).toBe(false);
    expect(isPro(undefined)).toBe(false);
  });

  it("5. should perform instance state synchronization successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        updatedAt: "2026-08-04T12:00:00Z",
      }),
    });

    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    const syncRes = await client.syncInstance("instance_abc", { some: "state" });
    expect(syncRes.success).toBe(true);
    expect(syncRes.updatedAt).toBe("2026-08-04T12:00:00Z");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://mock-hive/api/v1/instance/sync",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ instanceId: "instance_abc", state: { some: "state" } }),
      })
    );
  });

  it("6. should return failed response if instance synchronization fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    const syncRes = await client.syncInstance("instance_abc", { some: "state" });
    expect(syncRes.success).toBe(false);
    expect(syncRes.updatedAt).toBeNull();
  });

  it("7. should generate a valid instance id and correct mesh namespace", () => {
    const id = generateInstanceId();
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(5);

    const namespace = getMeshNamespace(id);
    expect(namespace).toBe(`swal/nido/${id}`);
  });
});
