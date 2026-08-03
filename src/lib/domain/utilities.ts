// NIDO — Public utilities domain service (REQ-014, US-303)
// water/energy/gas/internet: providers, due dates, consumption, budget, split bills.

import type { Utility, UtilityType, Property } from './property';

export interface UtilityReading {
  utilityId: string;
  value: number;
  date: string; // ISO date
}

export interface BudgetSummary {
  budget: number;
  actual: number;
  diff: number;
  over: boolean;
}

export function addUtility(property: Property, utility: Utility): Property {
  const utilities = [...(property.utilities ?? []), utility];
  return { ...property, utilities };
}

export function updateUtility(property: Property, utility: Utility): Property {
  const utilities = (property.utilities ?? []).map((u) => (u.id === utility.id ? utility : u));
  return { ...property, utilities };
}

export function removeUtility(property: Property, utilityId: string): Property {
  const utilities = (property.utilities ?? []).filter((u) => u.id !== utilityId);
  return { ...property, utilities };
}

/** Budget vs actual for a utility given its readings. */
export function budgetVsActual(utility: Utility, readings: UtilityReading[]): BudgetSummary {
  const actual = readings
    .filter((r) => r.utilityId === utility.id)
    .reduce((s, r) => s + r.value, 0);
  const budget = utility.budget ?? 0;
  return { budget, actual, diff: round2(budget - actual), over: actual > budget };
}

/** Equal split of a bill among N tenants. */
export function splitBill(total: number, shares: number): number[] {
  if (shares <= 0) return [];
  const base = round2(total / shares);
  const result = new Array(shares).fill(base);
  // Distribute rounding remainder to the first tenants
  const remainder = round2(total - base * shares);
  if (remainder !== 0) result[0] = round2(result[0] + remainder);
  return result;
}

/** Next due date from the utility's dueDay in the current month. */
export function nextDueDate(utility: Utility, now: Date = new Date()): string {
  let d = new Date(now.getFullYear(), now.getMonth(), utility.dueDay);
  if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, utility.dueDay);
  return d.toISOString().slice(0, 10);
}

export function isDueSoon(utility: Utility, days = 7, now: Date = new Date()): boolean {
  const due = new Date(nextDueDate(utility, now));
  const ms = due.getTime() - now.getTime();
  return ms >= 0 && ms <= days * 86400000;
}

export const UTILITY_TYPES: UtilityType[] = ['water', 'energy', 'gas', 'internet'];

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
