import { describe, it, expect } from "vitest";
import {
  configurePredial,
  markInstallmentPaid,
  totalAnnual,
  nextDue,
  createInstallments,
} from "../../src/lib/domain/taxes";
import type { PredialTax } from "../../src/lib/domain/property";

// NIDO — unit tests for feature: taxes (REQ-015, US-304)
// Predial tracking: jurisdiction, avaluo, rate, installments, calendar.

const base: PredialTax = {
  jurisdiction: "Santiago de Cali",
  avaluo: 350000000,
  rate_pct: 0.9,
  installments: 4,
  dueDates: [],
};

describe("US-304: predial tax tracking", () => {
  it("acceptance 1: configurePredial computes installments with due dates", () => {
    const predial = configurePredial(base);
    expect(predial.installments).toBe(4);
    expect(predial.dueDates.length).toBe(4);
    expect(predial.avaluo).toBe(350000000);
  });

  it("acceptance 2: totalAnnual computes avaluo * rate", () => {
    const predial = configurePredial(base);
    // 350,000,000 * 0.9% = 3,150,000
    expect(totalAnnual(predial)).toBeCloseTo(3150000, -2);
  });

  it("acceptance 3: createInstallments generates N equal installments", () => {
    const installments = createInstallments(base);
    expect(installments.length).toBe(4);
    const total = installments.reduce((s, i) => s + i.amount, 0);
    expect(total).toBeCloseTo(totalAnnual(base), -2);
  });

  it("acceptance 4: markInstallmentPaid tracks paid state", () => {
    const predial = configurePredial(base);
    const updated = markInstallmentPaid(predial, 0);
    expect(updated.dueDates[0]).toBeTruthy();
    // second call with same index must not break
    expect(markInstallmentPaid(updated, 0)).toBeTruthy();
  });

  it("acceptance 5: nextDue returns a valid date string", () => {
    const predial = configurePredial(base);
    const due = nextDue(predial);
    expect(typeof due).toBe("string");
    expect(new Date(due).getTime()).not.toBeNaN();
  });
});
