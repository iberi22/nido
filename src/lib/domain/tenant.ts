import type { Lease as PropertyLease } from './property';

export type IssueSeverity = 'low' | 'medium' | 'high';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface Lease extends PropertyLease {
  tenantId?: string;
}

export interface Issue {
  id: string;
  tenantId: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  createdAt: string; // ISO date string
}

export interface Invoice {
  id: string;
  leaseId: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paidAt?: string; // YYYY-MM-DD or ISO date string
}

export interface Receipt {
  id: string;
  amount: number;
  paidAt: string;
  leaseId: string;
}

/**
 * Returns the active lease for a specific tenant.
 */
export function getTenantLease(leases: Lease[], tenantId: string): Lease | null {
  if (!leases || !tenantId) return null;
  return leases.find(l => l.tenantId === tenantId) || null;
}

/**
 * Computes the rent payment status for a lease based on its invoices.
 */
export function getPaymentStatus(
  lease: Lease,
  invoices: Invoice[]
): { nextDue: string | null; amount: number; status: 'paid' | 'pending' | 'late' } {
  if (!lease) {
    return { nextDue: null, amount: 0, status: 'pending' };
  }

  const leaseInvoices = (invoices || []).filter(inv => inv.leaseId === lease.id);

  // Filter unpaid invoices
  const unpaid = leaseInvoices.filter(inv => !inv.paidAt);

  if (unpaid.length > 0) {
    // Sort by due date ascending (oldest unpaid first)
    unpaid.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const oldestUnpaid = unpaid[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const isLate = oldestUnpaid.dueDate < todayStr;

    return {
      nextDue: oldestUnpaid.dueDate,
      amount: oldestUnpaid.amount,
      status: isLate ? 'late' : 'pending'
    };
  }

  // If all are paid, find the latest paid invoice and project the next month's due date
  if (leaseInvoices.length > 0) {
    // Sort by due date descending (latest first)
    leaseInvoices.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const latest = leaseInvoices[0];

    // Project next month's due date safely
    let nextDueDateStr = '';
    try {
      const d = new Date(latest.dueDate + 'T12:00:00');
      d.setMonth(d.getMonth() + 1);
      nextDueDateStr = d.toISOString().split('T')[0];
    } catch {
      nextDueDateStr = latest.dueDate;
    }

    return {
      nextDue: nextDueDateStr,
      amount: lease.rentAmount || latest.amount,
      status: 'paid'
    };
  }

  // If there are no invoices at all, the rent is pending starting from the lease start date (if available)
  return {
    nextDue: lease.startDate || null,
    amount: lease.rentAmount || 0,
    status: 'pending'
  };
}

/**
 * Reports a new tenant issue.
 */
export function reportIssue(
  issues: Issue[],
  data: { tenantId: string; description: string; severity: IssueSeverity }
): Issue {
  const newIssue: Issue = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `issue-${Math.random().toString(36).substring(2)}`,
    tenantId: data.tenantId,
    description: data.description,
    severity: data.severity,
    status: 'open',
    createdAt: new Date().toISOString()
  };

  if (Array.isArray(issues)) {
    issues.push(newIssue);
  }

  return newIssue;
}

/**
 * Updates an issue's status.
 */
export function updateIssueStatus(
  issues: Issue[],
  issueId: string,
  status: IssueStatus
): Issue[] {
  return (issues || []).map(issue => {
    if (issue.id === issueId) {
      return { ...issue, status };
    }
    return issue;
  });
}

/**
 * Generates a receipt from a paid invoice.
 */
export function receiptFor(invoice: Invoice): Receipt {
  return {
    id: `receipt-${invoice.id}`,
    amount: invoice.amount,
    paidAt: invoice.paidAt || new Date().toISOString(),
    leaseId: invoice.leaseId
  };
}
