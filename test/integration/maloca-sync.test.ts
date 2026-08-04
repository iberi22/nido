import { describe, it, expect, vi } from "vitest";
import { EdgeHiveClient } from "../../src/lib/maloca/client";
import { generateInstanceId, getMeshNamespace } from "../../src/lib/maloca/instance";
import { createMeshClient } from "../../src/lib/domain/mesh";

describe("Maloca Integration & Sync Coherence Tests", () => {
  it("1. should ensure generated instance id is utilized correctly in client sync payloads", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        updatedAt: "2026-08-04T15:00:00Z",
      }),
    });

    const instanceId = generateInstanceId();
    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    const syncPayload = { floorCount: 2, wallCount: 15 };
    const syncRes = await client.syncInstance(instanceId, syncPayload);

    expect(syncRes.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://mock-hive/api/v1/instance/sync",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ instanceId, state: syncPayload }),
      })
    );
  });

  it("2. should maintain identical namespace definitions between client instances and mesh networks", () => {
    const instanceId = generateInstanceId();

    // Get namespace using our instance helper
    const helperNamespace = getMeshNamespace(instanceId);

    // Create the actual mesh client using our domain mesh creator
    const meshClient = createMeshClient(instanceId);

    expect(meshClient.namespace).toBe(helperNamespace);
    expect(meshClient.namespace).toBe(`swal/nido/${instanceId}`);
  });

  it("3. should synchronize and handle mock server failures during a complete workflow", async () => {
    const instanceId = generateInstanceId();
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error("Connection timeout"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          updatedAt: "2026-08-04T15:10:00Z",
        }),
      });

    const client = new EdgeHiveClient({
      baseUrl: "http://mock-hive",
      fetch: mockFetch,
    });

    // Workflow step 1: Sync fails due to connection issue (should gracefully fallback to false)
    const syncRes1 = await client.syncInstance(instanceId, { status: "offline-first" });
    expect(syncRes1.success).toBe(false);
    expect(syncRes1.updatedAt).toBeNull();

    // Workflow step 2: Sync succeeds on retry or second interval
    const syncRes2 = await client.syncInstance(instanceId, { status: "reconnected" });
    expect(syncRes2.success).toBe(true);
    expect(syncRes2.updatedAt).toBe("2026-08-04T15:10:00Z");
  });
});
