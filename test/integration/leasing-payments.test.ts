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

// NIDO — integration tests for feature: leasing
// User stories under test: US-501
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-501 Integration: Lease to payment end-to-end flow", () => {
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
});
