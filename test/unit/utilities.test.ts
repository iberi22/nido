import { describe, it, expect } from "vitest";
import {
  addUtility,
  updateUtility,
  removeUtility,
  budgetVsActual,
  nextDueDate,
  isDueSoon,
  UTILITY_TYPES,
} from "../../src/lib/domain/utilities";
import type { Utility, Property } from "../../src/lib/domain/property";
import type { UtilityReading } from "../../src/lib/domain/utilities";

// NIDO — unit tests for feature: utilities (REQ-014, US-303)

const util: Utility = {
  id: "u1",
  type: "energy",
  provider: "Celsia",
  account: "12345",
  dueDay: 15,
  budget: 100000,
};

const property: Property = {
  id: "p1",
  name: "Casa 3 Pisos",
  type: "house",
  location: { city: "Cali", comuna: "10", estrato: 3 },
  floors: [],
  rooms: [],
  items: [],
  utilities: [],
};

describe("US-303: utilities administration", () => {
  it("acceptance 1: addUtility/updateUtility/removeUtility CRUD", () => {
    const p1 = addUtility(property, util);
    expect(p1.utilities?.length).toBe(1);
    const p2 = updateUtility(p1, { ...util, budget: 120000 });
    expect(p2.utilities?.[0].budget).toBe(120000);
    const p3 = removeUtility(p2, "u1");
    expect(p3.utilities?.length).toBe(0);
  });

  it("acceptance 2: budgetVsActual computes over/under budget", () => {
    const readings: UtilityReading[] = [
      { utilityId: "u1", value: 60000, date: "2026-08-01" },
      { utilityId: "u1", value: 50000, date: "2026-08-15" },
    ];
    const s = budgetVsActual(util, readings);
    expect(s.budget).toBe(100000);
    expect(s.actual).toBe(110000);
    expect(s.over).toBe(true);
    expect(s.diff).toBeCloseTo(-10000, 2);
  });

  it("acceptance 3: nextDueDate honors dueDay with month rollover", () => {
    const jan15 = new Date("2026-01-10T12:00:00");
    expect(nextDueDate(util, jan15)).toBe("2026-01-15");
    const jan20 = new Date("2026-01-20T12:00:00");
    expect(nextDueDate(util, jan20)).toBe("2026-02-15");
  });

  it("acceptance 4: isDueSoon flags within window", () => {
    const tenDaysBefore = new Date("2026-01-05T12:00:00"); // due 15th, 10 days out
    expect(isDueSoon(util, 7, tenDaysBefore)).toBe(false);
    const fiveDaysBefore = new Date("2026-01-10T12:00:00"); // 5 days out
    expect(isDueSoon(util, 7, fiveDaysBefore)).toBe(true);
  });

  it("acceptance 5: UTILITY_TYPES covers water/energy/gas/internet", () => {
    expect(UTILITY_TYPES).toEqual(["water", "energy", "gas", "internet"]);
  });
});
