import type { Lease as BaseLease, Property } from './property';

export interface Lease extends BaseLease {
  status: 'draft' | 'signed' | 'active' | 'ended';
  tenantId?: string;
  deposit?: number;
  servicesIncluded?: string[];
  signature?: string;
}

export interface Invoice {
  id: string;
  leaseId: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'late';
  paidAt?: string; // YYYY-MM-DD
}

/**
 * Generates a unique ID (UUID or fallback string).
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Creates a new lease in draft status and registers it with the property.
 */
export function createLease(
  property: Partial<Property> | null | undefined,
  details: {
    tenantId: string;
    rent: number;
    deposit: number;
    startDate: string;
    endDate: string;
    servicesIncluded?: string[];
  }
): Lease {
  const lease: Lease = {
    id: generateId(),
    tenantId: details.tenantId,
    tenantName: details.tenantId, // For compatibility with base Lease
    rentAmount: parseFloat(Number(details.rent).toFixed(2)),
    deposit: parseFloat(Number(details.deposit).toFixed(2)),
    startDate: details.startDate,
    endDate: details.endDate,
    servicesIncluded: details.servicesIncluded || [],
    status: 'draft'
  };

  if (property) {
    if (!property.leases) {
      property.leases = [];
    }
    property.leases.push(lease);
  }

  return lease;
}

/**
 * Signs a lease contract by attaching a SHA-256 hex signature.
 * eSignature: signature = hash of lease JSON (SHA-256 hex).
 * Transitions lease status to 'signed'.
 */
export function signLease(lease: Lease, signature: string): Lease {
  return {
    ...lease,
    status: 'signed',
    signature
  };
}

/**
 * Calculates a SHA-256 hex hash of any text (typically lease JSON string).
 */
export async function calculateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates an invoice for a specific lease and month.
 * Month can be in format "YYYY-MM" or a direct "YYYY-MM-DD" due date.
 */
export function createInvoice(lease: Lease, month: string): Invoice {
  const amount = parseFloat((lease.rentAmount || 0).toFixed(2));

  // Determine due date from month
  let dueDate = '';
  if (month.length === 7) {
    dueDate = `${month}-05`; // Default to the 5th of that month
  } else {
    dueDate = month; // use "YYYY-MM-DD" directly
  }

  return {
    id: generateId(),
    leaseId: lease.id,
    amount,
    dueDate,
    status: 'pending'
  };
}

/**
 * Marks an invoice as paid.
 */
export function markInvoicePaid(invoice: Invoice, paidAt?: string): Invoice {
  invoice.status = 'paid';
  invoice.paidAt = paidAt || new Date().toISOString().split('T')[0];
  return invoice;
}

/**
 * Checks if an invoice is past its due date relative to the given now string.
 * If so, and it is not already paid, it updates status to 'late'.
 * Date comparison uses ISO string lexicographical / date math.
 */
export function isLate(invoice: Invoice, now: string): boolean {
  if (invoice.status === 'paid') return false;

  // Compare date strings lexicographically or via Date parse
  const dueTime = new Date(invoice.dueDate).getTime();
  const nowTime = new Date(now).getTime();

  if (nowTime > dueTime) {
    invoice.status = 'late';
    return true;
  }
  return false;
}

/**
 * Returns sorted list of invoices associated with the lease.
 * Filters to lease ID and sorts descending by dueDate.
 */
export function paymentHistory(lease: Lease, invoices: Invoice[]): Invoice[] {
  return invoices
    .filter(inv => inv.leaseId === lease.id)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

/**
 * Checks and updates lease status transitions: draft -> signed -> active -> ended.
 */
export function updateLeaseStatus(lease: Lease, currentDateStr: string): Lease {
  if (lease.status === 'draft') return lease;

  const today = new Date(currentDateStr).getTime();
  const start = lease.startDate ? new Date(lease.startDate).getTime() : 0;
  const end = lease.endDate ? new Date(lease.endDate).getTime() : Infinity;

  let status = lease.status;
  if (status === 'signed' && start && today >= start) {
    status = 'active';
  }
  if ((status === 'active' || status === 'signed') && end && today > end) {
    status = 'ended';
  }

  return {
    ...lease,
    status
  };
}
