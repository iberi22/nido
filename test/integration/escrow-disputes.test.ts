import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createEscrow,
  lockEscrow,
  requestRelease,
  releaseEscrow,
  openDispute,
  resetEscrowModule,
  escrows,
  disputes
} from "../../src/lib/domain/escrow";
import type { PolygonClient } from "../../src/lib/domain/polygon-client";
import type { Lease } from "../../src/lib/domain/property";

const MOCK_CONTRACT = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

function createMockPolygonClient(): PolygonClient {
  return {
    createEscrowContract: vi.fn().mockResolvedValue(MOCK_CONTRACT),
    lock: vi.fn().mockResolvedValue("0xlocktx"),
    release: vi.fn().mockResolvedValue("0xreleasetx"),
    getBalance: vi.fn().mockResolvedValue(0n)
  };
}

describe("US-604: require a deposit in escrow", () => {
  let mockClient: PolygonClient;

  beforeEach(() => {
    resetEscrowModule();
    mockClient = createMockPolygonClient();
  });

  it("acceptance 1: Deposit held in Polygon escrow contract", async () => {
    const lease: Pick<Lease, "id"> & { landlord: string; tenantName: string } = {
      id: "lease-101",
      landlord: "0xLandlordAddressABC",
      tenantName: "0xTenantAddressXYZ"
    };
    const depositAmount = 1500;

    const escrow = await createEscrow(lease, depositAmount, mockClient);

    expect(mockClient.createEscrowContract).toHaveBeenCalledWith("lease-101", 1500);
    expect(escrow.id).toBeDefined();
    expect(escrow.leaseId).toBe("lease-101");
    expect(escrow.amount).toBe(1500);
    expect(escrow.status).toBe("funded");
    expect(escrow.contractAddress).toBe(MOCK_CONTRACT);
    expect(escrow.contractAddress).toMatch(/^0x[a-f0-9]{40}$/i);
    expect(escrow.parties?.landlord).toBe("0xLandlordAddressABC");
    expect(escrow.parties?.tenant).toBe("0xTenantAddressXYZ");
    expect(escrows.length).toBe(1);
  });

  it("acceptance 2: Released on lease end per agreement", async () => {
    const lease = { id: "lease-102", landlord: "Alice", tenantName: "Bob" };
    const escrow = await createEscrow(lease, 2000, mockClient);

    // Transition to locked
    const statusAfterLock = await lockEscrow(escrow, mockClient);
    expect(mockClient.lock).toHaveBeenCalledWith(escrow.id);
    expect(statusAfterLock).toBe("locked");
    expect(escrow.status).toBe("locked");
    expect(escrow.lockedAt).toBeDefined();

    // Request release
    const statusAfterRequest = requestRelease(escrow, 2000);
    expect(statusAfterRequest).toBe("release-requested");
    expect(escrow.status).toBe("release-requested");

    // Full release
    const statusAfterRelease = await releaseEscrow(escrow, 2000, mockClient);
    expect(mockClient.release).toHaveBeenCalledWith(escrow.id, 2000);
    expect(statusAfterRelease).toBe("released");
    expect(escrow.status).toBe("released");
    expect(escrow.releasedAmount).toBe(2000);
  });

  it("acceptance 3: Partial release supported for damages", async () => {
    const lease = { id: "lease-103", landlord: "Alice", tenantName: "Bob" };
    const escrow = await createEscrow(lease, 3000, mockClient);

    await lockEscrow(escrow, mockClient);

    // Release 800 for damages
    const status1 = await releaseEscrow(escrow, 800, mockClient);
    expect(mockClient.release).toHaveBeenCalledWith(escrow.id, 800);
    expect(status1).toBe("partial-released");
    expect(escrow.status).toBe("partial-released");
    expect(escrow.releasedAmount).toBe(800);

    // Release remaining 2200
    const status2 = await releaseEscrow(escrow, 2200, mockClient);
    expect(mockClient.release).toHaveBeenCalledWith(escrow.id, 2200);
    expect(status2).toBe("released");
    expect(escrow.status).toBe("released");
    expect(escrow.releasedAmount).toBe(3000);
  });

  it("acceptance 4: Escrow state visible to both parties", async () => {
    const lease = { id: "lease-104", landlord: "Alice", tenantName: "Bob" };
    const escrow = await createEscrow(lease, 1000, mockClient);

    expect(escrow.parties).toBeDefined();
    expect(escrow.parties?.landlord).toBe("Alice");
    expect(escrow.parties?.tenant).toBe("Bob");

    // Change status and check visibility of updated state
    openDispute(escrow, {
      claimant: "Bob",
      reason: "Security deposit not returned",
      evidence: ["receipt.png", "flat_inspection.jpg"]
    });

    expect(escrow.status).toBe("disputed");
    expect(escrow.disputeId).toBeDefined();
    expect(disputes.length).toBe(1);
    expect(disputes[0].escrowId).toBe(escrow.id);
  });
});
