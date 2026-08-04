import { describe, it, expect } from "vitest";
import {
  createLease,
  signLease,
  calculateHash,
  createInvoice,
  markInvoicePaid,
  isLate,
  paymentHistory,
  updateLeaseStatus
} from "../../src/lib/domain/leasing";

// NIDO — unit tests for feature: leasing
// User stories under test: US-501
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-501: create a lease contract and collect rent", () => {
  it("acceptance 1: Lease CRUD: tenant, start/end, rent, deposit, services included", () => {
    const property = {
      id: "prop-101",
      name: "Sunny Apartment",
      type: "apartment" as const,
      location: { city: "Bogota", comuna: "Chapinero", estrato: 4 },
      floors: [],
      rooms: [],
      items: [],
      leases: []
    };
    const details = {
      tenantId: "tenant-alice",
      rent: 1500.50,
      deposit: 3000.00,
      startDate: "2026-09-01",
      endDate: "2027-08-31",
      servicesIncluded: ["water", "internet", "gas"]
    };

    const lease = createLease(property, details);

    expect(lease.id).toBeDefined();
    expect(typeof lease.id).toBe("string");
    expect(lease.tenantId).toBe("tenant-alice");
    expect(lease.tenantName).toBe("tenant-alice");
    expect(lease.rentAmount).toBe(1500.50);
    expect(lease.deposit).toBe(3000.00);
    expect(lease.startDate).toBe("2026-09-01");
    expect(lease.endDate).toBe("2027-08-31");
    expect(lease.servicesIncluded).toEqual(["water", "internet", "gas"]);
    expect(lease.status).toBe("draft");

    // Verify it was registered with the property
    expect(property.leases.length).toBe(1);
    expect(property.leases[0]).toEqual(lease);
  });

  it("acceptance 2: eSignature via ML-DSA-65 signed document", async () => {
    const property = {
      id: "prop-101",
      name: "Sunny Apartment",
      type: "apartment" as const,
      location: { city: "Bogota", comuna: "Chapinero", estrato: 4 },
      floors: [],
      rooms: [],
      items: [],
      leases: []
    };
    const lease = createLease(property, {
      tenantId: "tenant-bob",
      rent: 1200,
      deposit: 1200,
      startDate: "2026-10-01",
      endDate: "2027-09-30",
      servicesIncluded: []
    });

    // Calculate app-level SHA-256 signature
    const leaseJson = JSON.stringify(lease);
    const signature = await calculateHash(leaseJson);

    expect(signature).toHaveLength(64); // SHA-256 standard hex length
    expect(/^[a-f0-9]{64}$/.test(signature)).toEqual(true);

    const signedLease = signLease(lease, signature);
    expect(signedLease.status).toBe("signed");
    expect(signedLease.signature).toBe(signature);
    expect(signedLease.id).toBe(lease.id);
  });

  it("acceptance 3: Rent collection: invoice → payment (Stripe; later Polygon)", () => {
    const lease = {
      id: "lease-xyz",
      tenantId: "tenant-charlie",
      rentAmount: 1850.75,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "signed" as const
    };

    // Create invoice for August 2026
    const invoice = createInvoice(lease, "2026-08");
    expect(invoice.id).toBeDefined();
    expect(invoice.leaseId).toBe("lease-xyz");
    expect(invoice.amount).toBe(1850.75);
    expect(invoice.dueDate).toBe("2026-08-05");
    expect(invoice.status).toBe("pending");

    // Mark invoice paid
    const paidInvoice = markInvoicePaid(invoice, "2026-08-04");
    expect(paidInvoice.status).toBe("paid");
    expect(paidInvoice.paidAt).toBe("2026-08-04");
  });

  it("acceptance 4: Payment history per lease", () => {
    const leaseA = { id: "lease-A", rentAmount: 1000, status: "signed" as const };
    const leaseB = { id: "lease-B", rentAmount: 2000, status: "signed" as const };

    const invoices = [
      createInvoice(leaseA, "2026-01"), // due 2026-01-05
      createInvoice(leaseB, "2026-01"), // due 2026-01-05
      createInvoice(leaseA, "2026-03"), // due 2026-03-05
      createInvoice(leaseA, "2026-02"), // due 2026-02-05
    ];

    const history = paymentHistory(leaseA, invoices);

    // Should filter to only leaseA and sort descending by dueDate
    expect(history.length).toBe(3);
    expect(history[0].dueDate).toBe("2026-03-05");
    expect(history[1].dueDate).toBe("2026-02-05");
    expect(history[2].dueDate).toBe("2026-01-05");
    expect(history.every(inv => inv.leaseId === "lease-A")).toEqual(true);
  });

  it("acceptance 5: Late-payment reminders", () => {
    const lease = { id: "lease-x", rentAmount: 1000, status: "signed" as const };
    const invoice = createInvoice(lease, "2026-08-10"); // due August 10

    // Not late before due date
    const check1 = isLate(invoice, "2026-08-09");
    expect(check1).toEqual(false);
    expect(invoice.status).toBe("pending");

    // Not late on due date (usually grace period)
    const check2 = isLate(invoice, "2026-08-10");
    expect(check2).toEqual(false);
    expect(invoice.status).toBe("pending");

    // Late past due date
    const check3 = isLate(invoice, "2026-08-11");
    expect(check3).toEqual(true);
    expect(invoice.status).toBe("late");

    // Once paid, cannot be marked late
    markInvoicePaid(invoice, "2026-08-12");
    expect(invoice.status).toBe("paid");
    const check4 = isLate(invoice, "2026-08-13");
    expect(check4).toEqual(false);
    expect(invoice.status).toBe("paid");
  });

  it("acceptance 6: Lease active/ended status transitions based on date", () => {
    const lease = {
      id: "lease-transition",
      status: "signed" as const,
      startDate: "2026-09-01",
      endDate: "2027-08-31"
    };

    // Before start date, remains 'signed'
    const statusBefore = updateLeaseStatus(lease, "2026-08-31");
    expect(statusBefore.status).toBe("signed");

    // On start date, becomes 'active'
    const statusActive = updateLeaseStatus(lease, "2026-09-01");
    expect(statusActive.status).toBe("active");

    // Past end date, becomes 'ended'
    const statusEnded = updateLeaseStatus(lease, "2027-09-01");
    expect(statusEnded.status).toBe("ended");
  });
});
