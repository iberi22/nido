import type { Lease } from "./property";
import {
  getDefaultPolygonClient,
  type PolygonClient
} from "./polygon-client";

export type EscrowStatus =
  | "funded"
  | "locked"
  | "release-requested"
  | "partial-released"
  | "released"
  | "disputed";

export type DisputeStatus = "opened" | "voting" | "decided" | "enforced";

export interface Escrow {
  id: string;
  leaseId: string;
  amount: number;
  status: EscrowStatus;
  contractAddress?: string; // Polygon contract address (from client / testnet)
  fundedAt?: string;
  lockedAt?: string;
  releasedAmount?: number;
  parties?: {
    landlord: string;
    tenant: string;
  };
  disputeId?: string;
}

export interface DisputeOutcome {
  releaseAmount: number;
  to: "landlord" | "tenant";
}

export interface Dispute {
  id: string;
  escrowId: string;
  claimant: string;
  reason: string;
  evidence: string[];
  status: DisputeStatus;
  outcome?: DisputeOutcome;
}

// In-memory registries for testing/simulation
export let escrows: Escrow[] = [];
export let disputes: Dispute[] = [];

/**
 * Resets the in-memory registries for isolated testing.
 */
export function resetEscrowModule(): void {
  escrows = [];
  disputes = [];
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 11);
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return `${prefix}-${crypto.randomUUID()}`;
    } catch {
      return `${prefix}-${rand}`;
    }
  }
  return `${prefix}-${rand}`;
}

/**
 * Creates a new Escrow in 'funded' state.
 * Optional PolygonClient performs the on-chain create (Amoy testnet / manual deploy).
 * State transitions remain pure; the client only supplies the contract address / tx.
 */
export async function createEscrow(
  lease: Pick<Lease, "id"> & { landlord?: string; tenantName?: string },
  depositAmount: number,
  client: PolygonClient = getDefaultPolygonClient()
): Promise<Escrow> {
  const contractAddress = await client.createEscrowContract(lease.id, depositAmount);

  const escrow: Escrow = {
    id: generateId("escrow"),
    leaseId: lease.id,
    amount: depositAmount,
    status: "funded",
    releasedAmount: 0,
    contractAddress,
    fundedAt: new Date().toISOString(),
    parties: {
      landlord: lease.landlord || "landlord-default",
      tenant: lease.tenantName || "tenant-default"
    }
  };
  escrows.push(escrow);
  return escrow;
}

/**
 * Transitions escrow to 'locked' state (deposit held on Polygon testnet).
 */
export async function lockEscrow(
  escrow: Escrow,
  client: PolygonClient = getDefaultPolygonClient()
): Promise<"locked"> {
  await client.lock(escrow.id);
  escrow.status = "locked";
  escrow.lockedAt = new Date().toISOString();
  return "locked";
}

/**
 * Requests release of escrow funds (full or partial).
 */
export function requestRelease(escrow: Escrow, amount: number): "release-requested" {
  if (amount <= 0) {
    throw new Error("Release amount must be greater than zero");
  }
  escrow.status = "release-requested";
  return "release-requested";
}

/**
 * Releases escrow funds. Transitions status to 'released' (if >= amount check) or 'partial-released'.
 */
export async function releaseEscrow(
  escrow: Escrow,
  amount: number,
  client: PolygonClient = getDefaultPolygonClient()
): Promise<"partial-released" | "released"> {
  if (amount <= 0) {
    throw new Error("Release amount must be greater than zero");
  }

  await client.release(escrow.id, amount);

  const currentReleased = escrow.releasedAmount || 0;
  const newReleased = currentReleased + amount;
  escrow.releasedAmount = newReleased;

  // >= amount check: if the total released so far is >= the original amount in escrow
  if (newReleased >= escrow.amount) {
    escrow.status = "released";
  } else {
    escrow.status = "partial-released";
  }

  return escrow.status;
}

/**
 * Transitions escrow to 'disputed' state and creates a dispute record.
 */
export function openDispute(
  escrow: Escrow,
  disputeInfo: { claimant: string; reason: string; evidence: string[] }
): "disputed" {
  escrow.status = "disputed";

  const dispute: Dispute = {
    id: generateId("dispute"),
    escrowId: escrow.id,
    claimant: disputeInfo.claimant,
    reason: disputeInfo.reason,
    evidence: disputeInfo.evidence,
    status: "opened"
  };

  disputes.push(dispute);
  escrow.disputeId = dispute.id;

  return "disputed";
}

/**
 * Starts a voting round using edge-mesh governance.
 */
export function startVote(dispute: Dispute): "voting" {
  dispute.status = "voting";
  return "voting";
}

/**
 * Resolves a dispute with a decided outcome.
 */
export function resolveDispute(dispute: Dispute, outcome: DisputeOutcome): "decided" {
  if (outcome.releaseAmount < 0) {
    throw new Error("Dispute release amount cannot be negative");
  }
  dispute.status = "decided";
  dispute.outcome = outcome;
  return "decided";
}

/**
 * Enforces the outcome of a dispute, updating the dispute to 'enforced' and releasing escrow funds accordingly.
 */
export async function enforceOutcome(
  dispute: Dispute,
  escrow: Escrow,
  client: PolygonClient = getDefaultPolygonClient()
): Promise<"enforced"> {
  if (dispute.status !== "decided" || !dispute.outcome) {
    throw new Error("Cannot enforce outcome of an unresolved dispute");
  }

  if (dispute.escrowId !== escrow.id) {
    throw new Error("Dispute does not belong to the specified escrow");
  }

  // Release escrow per outcome (on-chain via client + pure state update)
  await releaseEscrow(escrow, dispute.outcome.releaseAmount, client);

  dispute.status = "enforced";
  return "enforced";
}

/**
 * Retrieves dispute history for both profiles (either claimant or landlord/tenant).
 */
export function getDisputeHistory(profileId: string): Dispute[] {
  return disputes.filter((d) => {
    if (d.claimant === profileId) {
      return true;
    }
    const escrow = escrows.find((e) => e.id === d.escrowId);
    if (escrow && escrow.parties) {
      return escrow.parties.landlord === profileId || escrow.parties.tenant === profileId;
    }
    return false;
  });
}
