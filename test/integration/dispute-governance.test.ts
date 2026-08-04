import { describe, it, expect, beforeEach } from "vitest";
import {
  createEscrow,
  lockEscrow,
  openDispute,
  startVote,
  resolveDispute,
  enforceOutcome,
  getDisputeHistory,
  resetEscrowModule,
  disputes,
  escrows
} from "../../src/lib/domain/escrow";

describe("US-605: open a dispute that goes to governance", () => {
  beforeEach(() => {
    resetEscrowModule();
  });

  it("acceptance 1: Dispute creation with evidence attachments", () => {
    const lease = { id: "lease-501", landlord: "LandlordAlpha", tenantName: "TenantBeta" };
    const escrow = createEscrow(lease, 2000);
    lockEscrow(escrow);

    const status = openDispute(escrow, {
      claimant: "TenantBeta",
      reason: "Broken heater reported but ignored, causing extra electric heating costs",
      evidence: ["heater_broken.png", "electric_bill_july.pdf"]
    });

    expect(status).toBe("disputed");
    expect(escrow.status).toBe("disputed");
    expect(escrow.disputeId).toBeDefined();

    expect(disputes.length).toBe(1);
    const dispute = disputes[0];
    expect(dispute.escrowId).toBe(escrow.id);
    expect(dispute.claimant).toBe("TenantBeta");
    expect(dispute.reason).toContain("Broken heater");
    expect(dispute.evidence).toEqual(["heater_broken.png", "electric_bill_july.pdf"]);
    expect(dispute.status).toBe("opened");
  });

  it("acceptance 2: edge-mesh governance voting round", () => {
    const lease = { id: "lease-502", landlord: "LandlordAlpha", tenantName: "TenantBeta" };
    const escrow = createEscrow(lease, 2500);
    lockEscrow(escrow);
    openDispute(escrow, {
      claimant: "LandlordAlpha",
      reason: "Tenant damaged the wooden floor in living room",
      evidence: ["floor_scratches.jpg"]
    });

    const dispute = disputes[0];
    const voteStatus = startVote(dispute);

    expect(voteStatus).toBe("voting");
    expect(dispute.status).toBe("voting");
  });

  it("acceptance 3: Outcome enforceable (escrow release/payout)", () => {
    const lease = { id: "lease-503", landlord: "LandlordAlpha", tenantName: "TenantBeta" };
    const escrow = createEscrow(lease, 3000);
    lockEscrow(escrow);
    openDispute(escrow, {
      claimant: "TenantBeta",
      reason: "Unfair deduction attempt",
      evidence: ["exit_photos.zip"]
    });

    const dispute = disputes[0];
    startVote(dispute);

    // Resolve dispute: awarding 2500 to landlord and 500 to tenant (let's say 500 payout is the enforced amount in this action)
    const resolveStatus = resolveDispute(dispute, {
      releaseAmount: 500,
      to: "tenant"
    });

    expect(resolveStatus).toBe("decided");
    expect(dispute.status).toBe("decided");
    expect(dispute.outcome).toEqual({
      releaseAmount: 500,
      to: "tenant"
    });

    // Enforce outcome
    const enforceStatus = enforceOutcome(dispute, escrow);
    expect(enforceStatus).toBe("enforced");
    expect(dispute.status).toBe("enforced");

    // Escrow should reflect partial release
    expect(escrow.status).toBe("partial-released");
    expect(escrow.releasedAmount).toBe(500);
  });

  it("acceptance 4: Dispute history on both profiles", () => {
    const lease = { id: "lease-504", landlord: "LandlordAlpha", tenantName: "TenantBeta" };
    const escrow = createEscrow(lease, 1800);
    lockEscrow(escrow);
    openDispute(escrow, {
      claimant: "TenantBeta",
      reason: "Security deposit refund delay",
      evidence: ["agreement.pdf"]
    });

    // History for claimant (TenantBeta)
    const tenantHistory = getDisputeHistory("TenantBeta");
    expect(tenantHistory.length).toBe(1);
    expect(tenantHistory[0].claimant).toBe("TenantBeta");

    // History for counterparty (LandlordAlpha)
    const landlordHistory = getDisputeHistory("LandlordAlpha");
    expect(landlordHistory.length).toBe(1);
    expect(landlordHistory[0].escrowId).toBe(escrow.id);

    // History for some unrelated profile
    const strangerHistory = getDisputeHistory("UnrelatedGuy");
    expect(strangerHistory.length).toBe(0);
  });
});
