import { describe, it, expect, beforeEach } from "vitest";
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
import type { Lease } from "../../src/lib/domain/property";

describe("US-604: require a deposit in escrow", () => {
  beforeEach(() => {
    resetEscrowModule();
  });

  it("acceptance 1: Deposit held in Polygon escrow contract", () => {
    const lease: Pick<Lease, "id"> & { landlord: string; tenantName: string } = {
      id: "lease-101",
      landlord: "0xLandlordAddressABC",
      tenantName: "0xTenantAddressXYZ"
    };
    const depositAmount = 1500;

    const escrow = createEscrow(lease, depositAmount);

    expect(escrow.id).toBeDefined();
    expect(escrow.leaseId).toBe("lease-101");
    expect(escrow.amount).toBe(1500);
    expect(escrow.status).toBe("funded");
    expect(escrow.contractAddress).toMatch(/^0x[a-f0-9]{40}$/i);
    expect(escrow.parties?.landlord).toBe("0xLandlordAddressABC");
    expect(escrow.parties?.tenant).toBe("0xTenantAddressXYZ");
    expect(escrows.length).toBe(1);
  });

  it("acceptance 2: Released on lease end per agreement", () => {
    const lease = { id: "lease-102", landlord: "Alice", tenantName: "Bob" };
    const escrow = createEscrow(lease, 2000);

    // Transition to locked
    const statusAfterLock = lockEscrow(escrow);
    expect(statusAfterLock).toBe("locked");
    expect(escrow.status).toBe("locked");
    expect(escrow.lockedAt).toBeDefined();

    // Request release
    const statusAfterRequest = requestRelease(escrow, 2000);
    expect(statusAfterRequest).toBe("release-requested");
    expect(escrow.status).toBe("release-requested");

    // Full release
    const statusAfterRelease = releaseEscrow(escrow, 2000);
    expect(statusAfterRelease).toBe("released");
    expect(escrow.status).toBe("released");
    expect(escrow.releasedAmount).toBe(2000);
  });

  it("acceptance 3: Partial release supported for damages", () => {
    const lease = { id: "lease-103", landlord: "Alice", tenantName: "Bob" };
    const escrow = createEscrow(lease, 3000);

    lockEscrow(escrow);

    // Release 800 for damages
    const status1 = releaseEscrow(escrow, 800);
    expect(status1).toBe("partial-released");
    expect(escrow.status).toBe("partial-released");
    expect(escrow.releasedAmount).toBe(800);

    // Release remaining 2200
    const status2 = releaseEscrow(escrow, 2200);
    expect(status2).toBe("released");
    expect(escrow.status).toBe("released");
    expect(escrow.releasedAmount).toBe(3000);
  });

  it("acceptance 4: Escrow state visible to both parties", () => {
    const lease = { id: "lease-104", landlord: "Alice", tenantName: "Bob" };
    const escrow = createEscrow(lease, 1000);

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
