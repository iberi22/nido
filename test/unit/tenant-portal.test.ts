import { describe, it, expect } from "vitest";
import {
  getTenantLease,
  getPaymentStatus,
  reportIssue,
  updateIssueStatus,
  receiptFor,
  type Lease,
  type Invoice,
  type Issue
} from "../../src/lib/domain/tenant";

describe("US-502: see my lease, pay rent, and report issues in a portal", () => {
  it("acceptance 1: Tenant sees own lease and payment status", () => {
    const mockLeases: Lease[] = [
      {
        id: "lease-1",
        tenantId: "tenant-abc",
        tenantName: "Alice Smith",
        rentAmount: 1200,
        startDate: "2026-01-01",
        endDate: "2026-12-31"
      },
      {
        id: "lease-2",
        tenantId: "tenant-xyz",
        tenantName: "Bob Jones",
        rentAmount: 1500,
        startDate: "2026-02-01",
        endDate: "2027-01-31"
      }
    ];

    // Check getTenantLease
    const aliceLease = getTenantLease(mockLeases, "tenant-abc");
    expect(aliceLease).not.toBeNull();
    expect(aliceLease?.tenantName).toBe("Alice Smith");
    expect(aliceLease?.rentAmount).toBe(1200);

    const nonExistentLease = getTenantLease(mockLeases, "tenant-unknown");
    expect(nonExistentLease).toBeNull();
  });

  it("acceptance 2: Pay rent online and check payment status (paid, pending, late)", () => {
    const lease: Lease = {
      id: "lease-1",
      tenantId: "tenant-abc",
      tenantName: "Alice Smith",
      rentAmount: 1200,
      startDate: "2026-01-01"
    };

    // Case 2a: No invoices at all
    const statusNoInvoices = getPaymentStatus(lease, []);
    expect(statusNoInvoices.nextDue).toBe("2026-01-01");
    expect(statusNoInvoices.amount).toBe(1200);
    expect(statusNoInvoices.status).toBe("pending");

    // Case 2b: Invoice exists and is unpaid (pending since due in the future)
    // We'll project a future due date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const invoicesPending: Invoice[] = [
      {
        id: "inv-1",
        leaseId: "lease-1",
        amount: 1200,
        dueDate: futureDateStr
      }
    ];
    const statusPending = getPaymentStatus(lease, invoicesPending);
    expect(statusPending.nextDue).toBe(futureDateStr);
    expect(statusPending.amount).toBe(1200);
    expect(statusPending.status).toBe("pending");

    // Case 2c: Invoice exists and is unpaid and overdue (late)
    const invoicesLate: Invoice[] = [
      {
        id: "inv-2",
        leaseId: "lease-1",
        amount: 1200,
        dueDate: "2026-01-15" // in the past
      }
    ];
    const statusLate = getPaymentStatus(lease, invoicesLate);
    expect(statusLate.nextDue).toBe("2026-01-15");
    expect(statusLate.amount).toBe(1200);
    expect(statusLate.status).toBe("late");

    // Case 2d: Invoice exists and is paid
    const invoicesPaid: Invoice[] = [
      {
        id: "inv-3",
        leaseId: "lease-1",
        amount: 1200,
        dueDate: "2026-01-15",
        paidAt: "2026-01-14"
      }
    ];
    const statusPaid = getPaymentStatus(lease, invoicesPaid);
    expect(statusPaid.status).toBe("paid");
    expect(statusPaid.amount).toBe(1200);
    expect(statusPaid.nextDue).toBe("2026-02-15"); // 1 month after 2026-01-15
  });

  it("acceptance 3: Issue reporting with status tracking", () => {
    const issues: Issue[] = [];

    // Create an issue
    const newIssue = reportIssue(issues, {
      tenantId: "tenant-abc",
      description: "Water leaking in bathroom",
      severity: "high"
    });

    expect(newIssue.id).toBeDefined();
    expect(newIssue.tenantId).toBe("tenant-abc");
    expect(newIssue.description).toBe("Water leaking in bathroom");
    expect(newIssue.severity).toBe("high");
    expect(newIssue.status).toBe("open");
    expect(newIssue.createdAt).toBeDefined();

    // The array should be updated too
    expect(issues.length).toBe(1);
    expect(issues[0].id).toBe(newIssue.id);

    // Update status
    const updatedIssues = updateIssueStatus(issues, newIssue.id, "in_progress");
    expect(updatedIssues[0].status).toBe("in_progress");

    // Resolve issue
    const resolvedIssues = updateIssueStatus(updatedIssues, newIssue.id, "resolved");
    expect(resolvedIssues[0].status).toBe("resolved");
  });

  it("acceptance 4: Receipts downloadable", () => {
    const paidInvoice: Invoice = {
      id: "inv-100",
      leaseId: "lease-1",
      amount: 1200,
      dueDate: "2026-03-01",
      paidAt: "2026-02-28"
    };

    const receipt = receiptFor(paidInvoice);
    expect(receipt).not.toBeNull();
    expect(receipt.id).toBe("receipt-inv-100");
    expect(receipt.amount).toBe(1200);
    expect(receipt.paidAt).toBe("2026-02-28");
    expect(receipt.leaseId).toBe("lease-1");
  });

  it("acceptance 5: Fallback receipt generation when paidAt is undefined", () => {
    const invoiceWithoutPaidAt: Invoice = {
      id: "inv-200",
      leaseId: "lease-1",
      amount: 1200,
      dueDate: "2026-04-01"
    };

    const receipt = receiptFor(invoiceWithoutPaidAt);
    expect(receipt).not.toBeNull();
    expect(receipt.id).toBe("receipt-inv-200");
    expect(receipt.amount).toBe(1200);
    expect(receipt.paidAt).toBeDefined(); // should default to today's date
    expect(receipt.leaseId).toBe("lease-1");
  });
});
