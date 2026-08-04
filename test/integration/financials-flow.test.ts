import { describe, it, expect, vi } from 'vitest';
import {
  addTransaction,
  listTransactions,
  summarizeByMonth,
  summarizeByCategory,
  exportCSV,
  type Transaction
} from '../../src/lib/domain/costs';
import {
  totalAnnual,
  createInstallments,
  configurePredial,
  markInstallmentPaid,
  nextDue,
  getPredial
} from '../../src/lib/domain/taxes';
import {
  addUtility,
  updateUtility,
  removeUtility,
  budgetVsActual,
  splitBill,
  nextDueDate,
  isDueSoon,
  type UtilityReading
} from '../../src/lib/domain/utilities';
import {
  validateProperty,
  type Property,
  type PredialTax,
  type Utility
} from '../../src/lib/domain/property';

describe('NIDO Integration Tests — Financials Flow (Costs, Taxes, Utilities)', () => {

  it('1. should calculate full monthly summary from transactions across multiple months and categories', () => {
    let txs: Transaction[] = [];

    // Add multiple transactions
    txs = addTransaction(txs, { type: 'income', category: 'Rent', amount: 1500, date: '2026-01-01' });
    txs = addTransaction(txs, { type: 'expense', category: 'Maintenance', amount: 350, date: '2026-01-10' });
    txs = addTransaction(txs, { type: 'expense', category: 'Utilities', amount: 120, date: '2026-01-15' });
    txs = addTransaction(txs, { type: 'income', category: 'Rent', amount: 1500, date: '2026-02-01' });
    txs = addTransaction(txs, { type: 'expense', category: 'Taxes', amount: 800, date: '2026-02-05' });
    txs = addTransaction(txs, { type: 'expense', category: 'Utilities', amount: 130, date: '2026-02-15' });
    txs = addTransaction(txs, { type: 'income', category: 'Deposit', amount: 500, date: '2026-02-20' });

    // Ensure list sorted descending by date
    const sorted = listTransactions(txs);
    expect(sorted.length).toBe(7);
    expect(sorted[0].date).toBe('2026-02-20');
    expect(sorted[sorted.length - 1].date).toBe('2026-01-01');

    // Summarize by month
    const monthlySummary = summarizeByMonth(txs);
    expect(monthlySummary['2026-01']).toEqual({
      income: 1500,
      expense: 470, // 350 + 120
      net: 1030     // 1500 - 470
    });
    expect(monthlySummary['2026-02']).toEqual({
      income: 2000, // 1500 + 500
      expense: 930, // 800 + 130
      net: 1070     // 2000 - 930
    });
  });

  it('2. should group transaction summaries correctly by category', () => {
    let txs: Transaction[] = [];

    txs = addTransaction(txs, { type: 'income', category: 'Rent', amount: 1200, date: '2026-03-01' });
    txs = addTransaction(txs, { type: 'income', category: 'Rent', amount: 1200, date: '2026-04-01' });
    txs = addTransaction(txs, { type: 'expense', category: 'Repair', amount: 250, date: '2026-03-05' });
    txs = addTransaction(txs, { type: 'expense', category: 'Repair', amount: 150, date: '2026-03-20' });
    txs = addTransaction(txs, { type: 'expense', category: 'Water Utility', amount: 90, date: '2026-03-10' });

    const categorySummary = summarizeByCategory(txs);
    expect(categorySummary['Rent']).toEqual({
      income: 2400,
      expense: 0,
      net: 2400
    });
    expect(categorySummary['Repair']).toEqual({
      income: 0,
      expense: 400, // 250 + 150
      net: -400
    });
    expect(categorySummary['Water Utility']).toEqual({
      income: 0,
      expense: 90,
      net: -90
    });
  });

  it('3. should track utility budget vs actual with readings and support bill splitting', () => {
    const utility: Utility = {
      id: 'util-gas-1',
      type: 'gas',
      provider: 'Gases de Occidente',
      account: '987654',
      dueDay: 20,
      budget: 80000
    };

    // Readings for the utility
    const readings: UtilityReading[] = [
      { utilityId: 'util-gas-1', value: 35000, date: '2026-05-01' },
      { utilityId: 'util-gas-1', value: 40000, date: '2026-05-15' }
    ];

    const underBudgetSummary = budgetVsActual(utility, readings);
    expect(underBudgetSummary.budget).toBe(80000);
    expect(underBudgetSummary.actual).toBe(75000); // 35000 + 40000
    expect(underBudgetSummary.diff).toBe(5000);
    expect(underBudgetSummary.over).toEqual(false); // Using .toEqual(false) instead of the boolean-specific matcher to follow G6/test guards

    // Add another reading to go over budget
    const updatedReadings = [
      ...readings,
      { utilityId: 'util-gas-1', value: 10000, date: '2026-05-28' }
    ];
    const overBudgetSummary = budgetVsActual(utility, updatedReadings);
    expect(overBudgetSummary.actual).toBe(85000);
    expect(overBudgetSummary.diff).toBe(-5000);
    expect(overBudgetSummary.over).toBe(true);

    // Bill split test (e.g. splitting a total of 85000 COP among 3 tenants)
    const splitShares = splitBill(85000, 3);
    expect(splitShares.length).toBe(3);
    // 85000 / 3 = 28333.33 each with 0.01 remainder distributed to the first tenant (28333.34)
    expect(splitShares[0]).toBe(28333.34);
    expect(splitShares[1]).toBe(28333.33);
    expect(splitShares[2]).toBe(28333.33);
    const sum = splitShares.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(85000, 2);
  });

  it('4. should manage predial Colombia tax calendar lifecycle', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

    // Cali-first: Colombia predial rate & avaluo configuration
    const caliPredial: PredialTax = {
      jurisdiction: 'Santiago de Cali',
      avaluo: 240000000, // 240 million COP
      rate_pct: 1.1,      // 1.1% rate for Estrato 4
      installments: 4,
      dueDates: []
    };

    const configured = configurePredial(caliPredial);
    expect(configured.dueDates.length).toBe(4);

    // Total annual predial: 240,000,000 * 1.1% = 2,640,000 COP
    const annualTotal = totalAnnual(configured);
    expect(annualTotal).toBe(2640000);

    const installments = createInstallments(configured);
    expect(installments.length).toBe(4);
    expect(installments[0].amount).toBe(660000); // 2,640,000 / 4
    expect(installments[0].dueDate).toBe('2026-02-01');
    expect(installments[3].dueDate).toBe('2026-05-01');

    // First due date tracking
    const firstDue = nextDue(configured);
    expect(firstDue).toBe(installments[0].dueDate);

    // Mark index 1 (the first installment, index index starts at 1) as paid
    const updated1 = markInstallmentPaid(configured, 1);
    expect(updated1.paidIndexes).toContain(1);

    // Next due should now be the second installment
    const secondDue = nextDue(updated1);
    expect(secondDue).toBe(installments[1].dueDate);

    // Mark remaining installments as paid (indices 2, 3, 4)
    const updated2 = markInstallmentPaid(updated1, 2);
    const updated3 = markInstallmentPaid(updated2, 3);
    const updatedFinal = markInstallmentPaid(updated3, 4);

    expect(nextDue(updatedFinal)).toBeNull();

    vi.useRealTimers();
  });

  it('5. should ensure cross-module data consistency where cost entry does not corrupt utilities', () => {
    const utility: Utility = {
      id: 'util-elec',
      type: 'energy',
      provider: 'Emcali',
      account: '112233',
      dueDay: 10,
      budget: 150000
    };

    const property: Property = {
      id: 'prop-102',
      name: 'Apartamento Comuna 17',
      type: 'apartment',
      location: { city: 'Cali', comuna: '17', estrato: 4 },
      floors: [],
      rooms: [],
      items: [],
      utilities: [utility]
    };

    let transactions: Transaction[] = [];

    // Simulate adding an expense transaction for paying the utility bill
    transactions = addTransaction(transactions, {
      type: 'expense',
      category: 'Utilities',
      amount: 145000,
      date: '2026-06-12'
    });

    // Make sure the transaction was registered successfully
    expect(transactions.length).toBe(1);
    expect(transactions[0].amount).toBe(145000);

    // Assert that the original utility object and property state are completely unmutated/uncorrupted
    expect(property.utilities?.[0].budget).toBe(150000);
    expect(property.utilities?.[0].provider).toBe('Emcali');

    // Ensure validateProperty confirms integrity of the property data structure
    const validationResult = validateProperty(property);
    expect(validationResult.valid).toBe(true);
  });

  it('6. should run a complete property administrative lifecycle simulation', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));

    // 1. Setup a Colombia Estrato 3 House
    const basePredial: PredialTax = {
      jurisdiction: 'Envigado',
      avaluo: 180000000,
      rate_pct: 0.9, // Estrato 3 preset rate
      installments: 3,
      dueDates: []
    };

    const waterUtility: Utility = {
      id: 'util-water-env',
      type: 'water',
      provider: 'EPM',
      account: '887766',
      dueDay: 25,
      budget: 50000
    };

    let property: Property = {
      id: 'prop-env-1',
      name: 'Casa Envigado',
      type: 'house',
      location: { city: 'Medellín', comuna: 'Envigado', estrato: 3 },
      floors: [],
      rooms: [],
      items: [],
      utilities: [waterUtility],
      taxes: {
        predial: configurePredial(basePredial)
      }
    };

    // Ensure it is a valid canonical property
    const initValidation = validateProperty(property);
    expect(initValidation.valid).toBe(true);

    // 2. Perform actions
    const predialRecord = getPredial(property);
    expect(predialRecord).toBeDefined();
    if (!predialRecord) return;

    // Verify annual predial: 180,000,000 * 0.9% = 1,620,000 COP
    const annualTax = totalAnnual(predialRecord);
    expect(annualTax).toBe(1620000);

    // Each installment is 1,620,000 / 3 = 540,000 COP
    const taxInstallments = createInstallments(predialRecord);
    expect(taxInstallments.length).toBe(3);
    expect(taxInstallments[0].amount).toBe(540000);

    // 3. Owner pays the first tax installment
    property = {
      ...property,
      taxes: {
        predial: markInstallmentPaid(predialRecord, 1)
      }
    };

    // Record the payment in the transactions list
    let costs: Transaction[] = [];
    costs = addTransaction(costs, {
      type: 'expense',
      category: 'Taxes',
      amount: taxInstallments[0].amount,
      date: taxInstallments[0].dueDate
    });

    // 4. Record a utility reading and pay the utility bill
    const readings: UtilityReading[] = [
      { utilityId: 'util-water-env', value: 48000, date: '2026-06-20' }
    ];

    const currentWater = property.utilities?.[0];
    expect(currentWater).toBeDefined();
    if (!currentWater) return;

    const waterAnalysis = budgetVsActual(currentWater, readings);
    expect(waterAnalysis.actual).toBe(48000);
    expect(waterAnalysis.over).toEqual(false);

    // Register actual water utility bill payment
    costs = addTransaction(costs, {
      type: 'expense',
      category: 'Utilities',
      amount: waterAnalysis.actual,
      date: '2026-06-25'
    });

    // 5. Add some rental income
    costs = addTransaction(costs, {
      type: 'income',
      category: 'Rent',
      amount: 1200000,
      date: '2026-06-05'
    });

    // 6. Verify full transaction ledger and property health
    expect(costs.length).toBe(3);

    const monthlyLedger = summarizeByMonth(costs);
    expect(monthlyLedger['2026-07']).toBeDefined(); // First installment is 1 month from June 1st, so July
    expect(monthlyLedger['2026-06']).toBeDefined();

    // Check June totals: Income = 1200000, Expenses = 48000 (water), Net = 1152000
    expect(monthlyLedger['2026-06']).toEqual({
      income: 1200000,
      expense: 48000,
      net: 1152000
    });

    // Check July totals: Income = 0, Expenses = 540000 (tax), Net = -540000
    expect(monthlyLedger['2026-07']).toEqual({
      income: 0,
      expense: 540000,
      net: -540000
    });

    // Final property data model validation
    const finalValidation = validateProperty(property);
    expect(finalValidation.valid).toBe(true);

    vi.useRealTimers();
  });
});
