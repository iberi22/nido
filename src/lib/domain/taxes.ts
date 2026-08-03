// NIDO — Property tax (predial) domain service (REQ-015, US-304)
// Colombia-first: jurisdiction, avaluo, rate, installments, payment calendar.

import type { PredialTax, Property } from './property';

export interface PredialInstallment {
  index: number;
  amount: number;
  dueDate: string; // ISO date
  paid: boolean;
}

/** Annual predial total = avaluo * rate_pct / 100 */
export function totalAnnual(predial: PredialTax): number {
  return round2((predial.avaluo * predial.rate_pct) / 100);
}

/** Generate N equal installments with monthly due dates starting next month. */
export function createInstallments(predial: PredialTax, startDate: Date = new Date()): PredialInstallment[] {
  const annual = totalAnnual(predial);
  const amount = round2(annual / predial.installments);
  const installments: PredialInstallment[] = [];
  for (let i = 0; i < predial.installments; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i + 1);
    installments.push({ index: i + 1, amount, dueDate: d.toISOString().slice(0, 10), paid: false });
  }
  return installments;
}

/** Configure a predial record, generating its payment calendar. */
export function configurePredial(predial: PredialTax): PredialTax {
  const dueDates = createInstallments(predial).map((i) => i.dueDate);
  return { ...predial, dueDates };
}

/** Mark an installment as paid (by index) — returns a new array. */
export function markInstallmentPaid(predial: PredialTax, index: number): PredialTax {
  const dueDates = [...predial.dueDates];
  const paid = new Set(predial.paidIndexes ?? []);
  paid.add(index);
  return { ...predial, dueDates, paidIndexes: [...paid] };
}

/** Next unpaid due date, or null if all paid. */
export function nextDue(predial: PredialTax): string | null {
  const installments = createInstallments(predial);
  const paid = new Set(predial.paidIndexes ?? []);
  const pending = installments.filter((i) => !paid.has(i.index));
  if (pending.length === 0) return null;
  return pending[0].dueDate;
}

/** Colombia estrato → indicative rate presets (data only, not enforced). */
export const COLOMBIA_PRESETS: Record<number, { rate_pct: number; name: string }> = {
  1: { rate_pct: 0.5, name: 'Estrato 1 (bajo-bajo)' },
  2: { rate_pct: 0.7, name: 'Estrato 2 (bajo)' },
  3: { rate_pct: 0.9, name: 'Estrato 3 (medio-bajo)' },
  4: { rate_pct: 1.1, name: 'Estrato 4 (medio)' },
  5: { rate_pct: 1.3, name: 'Estrato 5 (medio-alto)' },
  6: { rate_pct: 1.5, name: 'Estrato 6 (alto)' },
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Property convenience
export function getPredial(property: Property): PredialTax | undefined {
  return property.taxes?.predial;
}
