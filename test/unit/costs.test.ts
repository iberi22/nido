import { describe, test, expect } from 'vitest';
import {
  addTransaction,
  listTransactions,
  summarizeByMonth,
  summarizeByCategory,
  exportCSV,
  type Transaction
} from '../../src/lib/domain/costs';

describe('Costs Domain Service Unit Tests', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'expense',
      category: 'Maintenance',
      amount: 120,
      date: '2026-05-15',
      receiptPhoto: 'url1'
    },
    {
      id: 'tx-2',
      type: 'income',
      category: 'Rent',
      amount: 1500,
      date: '2026-05-01'
    },
    {
      id: 'tx-3',
      type: 'expense',
      category: 'Utilities',
      amount: 85.5,
      date: '2026-06-10'
    },
    {
      id: 'tx-4',
      type: 'expense',
      category: 'Maintenance',
      amount: 45,
      date: '2026-06-20'
    }
  ];

  test('addTransaction inserts new transaction and generates an ID if missing', () => {
    const newTx: Omit<Transaction, 'id'> = {
      type: 'income',
      category: 'Deposit',
      amount: 500,
      date: '2026-06-25'
    };

    const updated = addTransaction(mockTransactions, newTx);
    expect(updated).toHaveLength(5);
    const added = updated[4];
    expect(added.id).toBeDefined();
    expect(added.category).toBe('Deposit');
  });

  test('listTransactions returns transactions sorted by date descending', () => {
    const sorted = listTransactions(mockTransactions);
    expect(sorted).toHaveLength(4);
    expect(sorted[0].id).toBe('tx-4'); // 2026-06-20
    expect(sorted[1].id).toBe('tx-3'); // 2026-06-10
    expect(sorted[2].id).toBe('tx-1'); // 2026-05-15
    expect(sorted[3].id).toBe('tx-2'); // 2026-05-01
  });

  test('summarizeByMonth groups and sums amounts correctly by month', () => {
    const summary = summarizeByMonth(mockTransactions);
    expect(summary['2026-05']).toEqual({
      expense: 120,
      income: 1500,
      net: 1380
    });
    expect(summary['2026-06']).toEqual({
      expense: 130.5, // 85.5 + 45
      income: 0,
      net: -130.5
    });
  });

  test('summarizeByCategory groups and sums amounts correctly by category', () => {
    const summary = summarizeByCategory(mockTransactions);
    expect(summary['Maintenance']).toEqual({
      expense: 165, // 120 + 45
      income: 0,
      net: -165
    });
    expect(summary['Rent']).toEqual({
      expense: 0,
      income: 1500,
      net: 1500
    });
  });

  test('exportCSV outputs correctly formatted CSV with escaped fields', () => {
    const commaTx: Transaction = {
      id: 'tx-5',
      type: 'expense',
      category: 'Supplies, Cleaning',
      amount: 50,
      date: '2026-06-28',
      receiptPhoto: 'photo "special"'
    };

    const csvContent = exportCSV([commaTx]);
    const lines = csvContent.split('\n');
    expect(lines[0]).toBe('id,type,category,amount,date,receiptPhoto');
    // Supplies, Cleaning has a comma, so it must be enclosed in quotes
    // photo "special" has quotes, so it must be enclosed in quotes and double-escaped
    expect(lines[1]).toBe('tx-5,expense,"Supplies, Cleaning",50,2026-06-28,"photo ""special"""');
  });
});
