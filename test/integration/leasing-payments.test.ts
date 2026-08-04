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
import {
  getTenantLease,
  getPaymentStatus
} from "../../src/lib/domain/tenant";

// NIDO — integration tests for feature: leasing & tenant portal interaction
// User stories under test: US-501 & US-502
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-501 & US-502 Integration: Lease to payment end-to-end flow", () => {
  it("acceptance 1-5: Complete leasing-payment integration flow", async () => {
    // 1. Set up property
    const property = {
      id: "apartment-404",
      name: "Highrise Condo Suite 404",
      type: "apartment" as const,
      location: { city: "Bogota", comuna: "Chapinero", estrato: 4 },
      floors: [],
      rooms: [],
      items: [],
      leases: []
    };

    // 2. Draft lease agreement
    const details = {
      tenantId: "tenant-david",
      rent: 2100.00,
      deposit: 4200.00,
      startDate: "2026-09-01",
      endDate: "2027-08-31",
      servicesIncluded: ["water", "electricity"]
    };

    const draftLease = createLease(property, details);
    expect(draftLease.status).toBe("draft");
    expect(property.leases).toContainEqual(draftLease);

    // 3. E-Sign lease contract with SHA-256 hex hash
    const draftJson = JSON.stringify(draftLease);
    const signature = await calculateHash(draftJson);
    const signedLease = signLease(draftLease, signature);

    expect(signedLease.status).toBe("signed");
    expect(signedLease.signature).toBe(signature);

    // 4. Activate lease contract on current date "2026-09-01"
    const activeLease = updateLeaseStatus(signedLease, "2026-09-01");
    expect(activeLease.status).toBe("active");

    // 5. Generate invoices for September, October, November
    const invoices = [
      createInvoice(activeLease, "2026-09"), // due 2026-09-05
      createInvoice(activeLease, "2026-10"), // due 2026-10-05
      createInvoice(activeLease, "2026-11"), // due 2026-11-05
    ];

    expect(invoices).toHaveLength(3);
    expect(invoices[0].amount).toBe(2100.00);
    expect(invoices[0].dueDate).toBe("2026-09-05");

    // 6. Check late status at "2026-10-06"
    // Sept invoice should be late if unpaid
    const isSeptLate = isLate(invoices[0], "2026-10-06");
    expect(isSeptLate).toEqual(true);
    expect(invoices[0].status).toBe("late");

    // Oct invoice should be late if unpaid
    const isOctLate = isLate(invoices[1], "2026-10-06");
    expect(isOctLate).toEqual(true);
    expect(invoices[1].status).toBe("late");

    // Nov invoice is not late yet
    const isNovLate = isLate(invoices[2], "2026-10-06");
    expect(isNovLate).toEqual(false);
    expect(invoices[2].status).toBe("pending");

    // 7. Pay September and October invoices
    markInvoicePaid(invoices[0], "2026-09-04"); // paid on-time
    markInvoicePaid(invoices[1], "2026-10-10"); // paid late

    expect(invoices[0].status).toBe("paid");
    expect(invoices[0].paidAt).toBe("2026-09-04");
    expect(invoices[1].status).toBe("paid");
    expect(invoices[1].paidAt).toBe("2026-10-10");

    // 8. Query payment/invoice history
    const history = paymentHistory(activeLease, invoices);
    expect(history).toHaveLength(3);
    // Verified sorting: newest due date first
    expect(history[0].dueDate).toBe("2026-11-05");
    expect(history[1].dueDate).toBe("2026-10-05");
    expect(history[2].dueDate).toBe("2026-09-05");
  });

  it("Integration: Next month due-date projection across month boundaries", () => {
    const lease = {
      id: "lease-boundary-1",
      tenantId: "tenant-boundary",
      rentAmount: 1000,
      startDate: "2026-01-31"
    };

    // January 31st to February (non-leap year 2026) -> should project to Feb 28th due to clamping
    const invoiceJan = {
      id: "inv-jan",
      leaseId: "lease-boundary-1",
      amount: 1000,
      dueDate: "2026-01-31",
      paidAt: "2026-01-30"
    };

    const statusJan = getPaymentStatus(lease, [invoiceJan]);
    expect(statusJan.nextDue).toBe("2026-02-28");
    expect(statusJan.status).toBe("paid");

    // October 31st to November (30 days) -> should project to Nov 30th
    const invoiceOct = {
      id: "inv-oct",
      leaseId: "lease-boundary-1",
      amount: 1000,
      dueDate: "2026-10-31",
      paidAt: "2026-10-30"
    };

    const statusOct = getPaymentStatus(lease, [invoiceOct]);
    expect(statusOct.nextDue).toBe("2026-11-30");

    // December 31st to January -> should project to Jan 31st
    const invoiceDec = {
      id: "inv-dec",
      leaseId: "lease-boundary-1",
      amount: 1000,
      dueDate: "2026-12-31",
      paidAt: "2026-12-30"
    };

    const statusDec = getPaymentStatus(lease, [invoiceDec]);
    expect(statusDec.nextDue).toBe("2027-01-31");
  });

  it("Integration: Late payment detection across month boundaries", () => {
    const lease = { id: "lease-late-mb", rentAmount: 1000, status: "signed" as const };
    const invoice = createInvoice(lease, "2026-08-31"); // due Aug 31

    // Checked on same day is not late
    expect(isLate(invoice, "2026-08-31")).toEqual(false);
    expect(invoice.status).toBe("pending");

    // Checked on next month 1st day is late
    expect(isLate(invoice, "2026-09-01")).toEqual(true);
    expect(invoice.status).toBe("late");
  });

  it("Integration: Hash integrity and tamper detection", async () => {
    const property = {
      id: "p-hash",
      name: "P Hash",
      type: "house" as const,
      location: { city: "Bogota", comuna: "Chapinero", estrato: 3 },
      floors: [],
      rooms: [],
      items: [],
      leases: []
    };
    const details = { tenantId: "tenant-hash", rent: 1000, deposit: 1000, startDate: "2026-01-01", endDate: "2026-12-31" };
    const lease = createLease(property, details);

    const originalJson = JSON.stringify(lease);
    const signature = await calculateHash(originalJson);
    const signedLease = signLease(lease, signature);

    expect(signedLease.signature).toBe(signature);

    // Tamper with the lease content (altered rent) and compute the new signature
    const tamperedLease = { ...lease, rentAmount: 9999 };
    const tamperedJson = JSON.stringify(tamperedLease);
    const newHashOfTampered = await calculateHash(tamperedJson);

    expect(newHashOfTampered).not.toBe(signature);
  });

  it("Integration: Cross-module lease status transitions and tenant status", () => {
    const property = {
      id: "p-trans",
      name: "P Trans",
      type: "house" as const,
      location: { city: "Bogota", comuna: "Chapinero", estrato: 3 },
      floors: [],
      rooms: [],
      items: [],
      leases: [] as any[]
    };
    const details = { tenantId: "tenant-cross", rent: 1500, deposit: 1500, startDate: "2026-05-01", endDate: "2026-10-31" };
    const lease = createLease(property, details);

    // In draft, getTenantLease finds it
    const foundLease1 = getTenantLease(property.leases, "tenant-cross");
    expect(foundLease1).not.toBeNull();
    expect(foundLease1?.status).toBe("draft");

    // Sign lease
    const signedLease = signLease(foundLease1!, "sig-123");
    // update property lease list
    property.leases = [signedLease];

    // Before start date (e.g., 2026-04-30), transition
    const updated1 = updateLeaseStatus(signedLease, "2026-04-30");
    expect(updated1.status).toBe("signed");

    // On start date (e.g., 2026-05-01), transition to active
    const updated2 = updateLeaseStatus(updated1, "2026-05-01");
    expect(updated2.status).toBe("active");

    // After end date (e.g., 2026-11-01), transition to ended
    const updated3 = updateLeaseStatus(updated2, "2026-11-01");
    expect(updated3.status).toBe("ended");
  });

  it("Integration: Tenant payment status progression as multiple invoices are progressively paid", () => {
    const lease = {
      id: "lease-prog",
      tenantId: "tenant-prog",
      rentAmount: 1200,
      startDate: "2026-01-01",
      endDate: "2026-12-31"
    };

    const pastInvoice = { id: "inv-1", leaseId: "lease-prog", amount: 1200, dueDate: "2020-01-05" };
    const futureInvoice = { id: "inv-2", leaseId: "lease-prog", amount: 1200, dueDate: "2030-01-05" };

    const currentInvoices = [pastInvoice, futureInvoice];

    // 1. Check initially - status should be late because of pastInvoice
    const status1 = getPaymentStatus(lease, currentInvoices);
    expect(status1.status).toBe("late");
    expect(status1.nextDue).toBe("2020-01-05");

    // 2. Pay the past invoice
    const paidPastInvoice = { ...pastInvoice, paidAt: "2020-01-04" };
    const status2 = getPaymentStatus(lease, [paidPastInvoice, futureInvoice]);
    // Status should now be pending because only futureInvoice is unpaid
    expect(status2.status).toBe("pending");
    expect(status2.nextDue).toBe("2030-01-05");

    // 3. Pay the future invoice
    const paidFutureInvoice = { ...futureInvoice, paidAt: "2030-01-04" };
    const status3 = getPaymentStatus(lease, [paidPastInvoice, paidFutureInvoice]);
    // Status should be paid, next due date projected 1 month after the latest paid invoice (futureInvoice is 2030-01-05 -> 2030-02-05)
    expect(status3.status).toBe("paid");
    expect(status3.nextDue).toBe("2030-02-05");
  });
});
