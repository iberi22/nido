export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  category: string;
  amount: number;
  date: string; // ISO date string or "YYYY-MM-DD"
  receiptPhoto?: string;
}

/**
 * Adds a transaction to the costs record.
 * Returns a new array of transactions.
 */
export function addTransaction(transactions: Transaction[], transaction: Omit<Transaction, 'id'> & { id?: string }): Transaction[] {
  const newTransaction: Transaction = {
    ...transaction,
    id: transaction.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2))
  };
  return [...transactions, newTransaction];
}

/**
 * Lists all transactions. Currently returns them sorted by date descending.
 */
export function listTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Summarizes transaction amounts by month (format "YYYY-MM").
 */
export function summarizeByMonth(transactions: Transaction[]): Record<string, { expense: number; income: number; net: number }> {
  const summary: Record<string, { expense: number; income: number; net: number }> = {};

  for (const t of transactions) {
    if (!t.date) continue;
    const month = t.date.substring(0, 7); // Extracts "YYYY-MM"
    if (!summary[month]) {
      summary[month] = { expense: 0, income: 0, net: 0 };
    }

    const val = Number(t.amount) || 0;
    if (t.type === 'expense') {
      summary[month].expense += val;
      summary[month].net -= val;
    } else if (t.type === 'income') {
      summary[month].income += val;
      summary[month].net += val;
    }
  }

  return summary;
}

/**
 * Summarizes transaction amounts by category.
 */
export function summarizeByCategory(transactions: Transaction[]): Record<string, { expense: number; income: number; net: number }> {
  const summary: Record<string, { expense: number; income: number; net: number }> = {};

  for (const t of transactions) {
    if (!t.category) continue;
    const cat = t.category;
    if (!summary[cat]) {
      summary[cat] = { expense: 0, income: 0, net: 0 };
    }

    const val = Number(t.amount) || 0;
    if (t.type === 'expense') {
      summary[cat].expense += val;
      summary[cat].net -= val;
    } else if (t.type === 'income') {
      summary[cat].income += val;
      summary[cat].net += val;
    }
  }

  return summary;
}

/**
 * Exports transactions to a CSV string.
 */
export function exportCSV(transactions: Transaction[]): string {
  const headers = ['id', 'type', 'category', 'amount', 'date', 'receiptPhoto'];
  const escape = (val: any) => {
    if (val === undefined || val === null) return '';
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const rows = [headers.join(',')];
  for (const t of transactions) {
    const row = [
      escape(t.id),
      escape(t.type),
      escape(t.category),
      escape(t.amount),
      escape(t.date),
      escape(t.receiptPhoto)
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}
