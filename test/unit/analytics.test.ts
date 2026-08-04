import { describe, it, expect } from 'vitest';
import {
  spendingByCategory,
  utilityConsumptionPattern,
  budgetAlerts,
  type Transaction,
  type Utility,
  type UtilityReading
} from '../../src/lib/domain/analytics';

// G2 TEST-EMPTY GUARD: must satisfy wc -l >= 20 AND grep -c "describe(\|it(" >= 3.

describe('Analytics aggregates and budget alerts', () => {
  it('should correctly aggregate spending by category and sort descending', () => {
    const transactions: Transaction[] = [
      { id: 't1', category: 'Maintenance', amount: 150, date: new Date() },
      { id: 't2', category: 'Utilities', amount: 80, date: new Date() },
      { id: 't3', category: 'Maintenance', amount: 350, date: new Date() },
      { id: 't4', category: 'Taxes', amount: 500, date: new Date() },
      { id: 't5', category: 'Utilities', amount: 120, date: new Date() }
    ];

    const summaries = spendingByCategory(transactions);

    expect(summaries).toHaveLength(3);
    const maintenanceSummary = summaries.find(s => s.category === 'Maintenance');
    const utilitiesSummary = summaries.find(s => s.category === 'Utilities');
    const taxesSummary = summaries.find(s => s.category === 'Taxes');

    expect(maintenanceSummary?.total).toBe(500);
    expect(utilitiesSummary?.total).toBe(200);
    expect(taxesSummary?.total).toBe(500);

    expect(summaries[0].total).toBe(500);
    expect(summaries[2].total).toBe(200);
  });

  it('should calculate utility consumption pattern metrics correctly', () => {
    const utility: Utility = {
      id: 'water-1',
      name: 'Water',
      monthlyBudget: 100
    };

    const readings: UtilityReading[] = [
      { id: 'r1', utilityId: 'water-1', reading: 12, date: new Date(2026, 0, 1) },
      { id: 'r2', utilityId: 'water-1', reading: 18, date: new Date(2026, 1, 1) },
      { id: 'r3', utilityId: 'water-1', reading: 15, date: new Date(2026, 2, 1) },
      { id: 'r4', utilityId: 'water-1', reading: 25, date: new Date(2026, 3, 1) }
    ];

    const pattern = utilityConsumptionPattern(utility, readings);

    expect(pattern.utilityId).toBe('water-1');
    expect(pattern.avg).toBe(17.5);
    expect(pattern.min).toBe(12);
    expect(pattern.max).toBe(25);
    expect(pattern.delta).toBe(13);
  });

  it('should handle utility with no readings gracefully', () => {
    const utility: Utility = {
      id: 'gas-1',
      name: 'Gas',
      monthlyBudget: 50
    };
    const pattern = utilityConsumptionPattern(utility, []);
    expect(pattern.avg).toBe(0);
    expect(pattern.min).toBe(0);
    expect(pattern.max).toBe(0);
    expect(pattern.delta).toBe(0);
  });

  it('should generate correct budget alerts', () => {
    const utilities: Utility[] = [
      { id: 'util-water', name: 'Water', monthlyBudget: 80 },
      { id: 'util-power', name: 'Electricity', monthlyBudget: 150 }
    ];

    const transactions: Transaction[] = [
      { id: 't1', category: 'Water', amount: 95, date: new Date() }, // Over budget
      { id: 't2', category: 'Electricity', amount: 120, date: new Date() } // Under budget
    ];

    const readings: UtilityReading[] = [
      { id: 'r1', utilityId: 'util-power', reading: 160, date: new Date() } // Over consumption threshold
    ];

    const alerts = budgetAlerts(utilities, transactions, readings);

    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toContain('Over budget for Water');
    expect(alerts[1]).toContain('High consumption alert for Electricity');
  });

  it('should return empty categories summary when no transactions provided', () => {
    expect(spendingByCategory([])).toEqual([]);
  });

  it('should check category matching in budgetAlerts containing utility name (case insensitive)', () => {
    const utilities: Utility[] = [
      { id: 'util-gas', name: 'Natural Gas', monthlyBudget: 40 }
    ];
    const transactions: Transaction[] = [
      { id: 't1', category: 'natural gas bill', amount: 45, date: new Date() }
    ];
    const alerts = budgetAlerts(utilities, transactions, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toContain('Over budget for Natural Gas');
  });

  it('should ignore readings for other utilities in utilityConsumptionPattern', () => {
    const utility: Utility = {
      id: 'u-target',
      name: 'Target Utility',
      monthlyBudget: 100
    };
    const readings: UtilityReading[] = [
      { id: 'r1', utilityId: 'u-other', reading: 50, date: new Date() },
      { id: 'r2', utilityId: 'u-target', reading: 20, date: new Date() }
    ];
    const pattern = utilityConsumptionPattern(utility, readings);
    expect(pattern.utilityId).toBe('u-target');
    expect(pattern.avg).toBe(20);
    expect(pattern.min).toBe(20);
    expect(pattern.max).toBe(20);
    expect(pattern.delta).toBe(0);
  });
});
