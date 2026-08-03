import { describe, it, expect } from "vitest";
import { splitBill } from "../../src/lib/domain/utilities";

// NIDO — unit tests for split-bill math (REQ-014, US-303)

describe("US-303: split bill support for tenants", () => {
  it("splits a bill equally among tenants", () => {
    const shares = splitBill(150000, 3);
    expect(shares.length).toBe(3);
    expect(shares.reduce((s, x) => s + x, 0)).toBeCloseTo(150000, 2);
  });

  it("handles non-divisible amounts without losing money", () => {
    const shares = splitBill(100000, 3);
    expect(shares.length).toBe(3);
    expect(shares.reduce((s, x) => s + x, 0)).toBeCloseTo(100000, 2);
  });

  it("returns empty array for zero shares", () => {
    expect(splitBill(100, 0)).toEqual([]);
  });

  it("single tenant gets the full bill", () => {
    expect(splitBill(85000, 1)).toEqual([85000]);
  });

  it("all shares are positive", () => {
    const shares = splitBill(999, 4);
    expect(shares.every((s) => s > 0)).toBe(true);
  });
});
