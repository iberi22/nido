import { describe, it, expect } from 'vitest';
import { resolveLotRules, validateLotOccupancy, stairSpec, validateStairs } from '../../src/lib/domain/norms';
import type { Zone } from '../../src/lib/domain/property';

describe('resolveLotRules', () => {
  it('defaults', () => {
    expect(resolveLotRules(undefined)).toEqual({ front: 2, rear: 3, left: 0, right: 0, maxOccupancy: 0.75, maxFloors: 5 });
  });
  it('user overrides from POT_lot', () => {
    const r = resolveLotRules({ POT_lot: { front: 3, maxOccupancy: 0.6, maxFloors: 3 } });
    expect(r.front).toBe(3); expect(r.maxOccupancy).toBe(0.6); expect(r.maxFloors).toBe(3); expect(r.rear).toBe(3);
  });
  it('ignores invalid values', () => {
    expect(resolveLotRules({ POT_lot: { front: -1, maxOccupancy: 5 } }).front).toBe(2);
    expect(resolveLotRules({ POT_lot: { maxOccupancy: 5 } }).maxOccupancy).toBe(0.75);
  });
});

describe('validateLotOccupancy', () => {
  const rules = resolveLotRules(undefined);
  it('passes within limit', () => {
    expect(validateLotOccupancy(100, 156, rules).pass).toBe(true);
  });
  it('fails over limit, mentions curaduria', () => {
    const r = validateLotOccupancy(130, 156, rules);
    expect(r.pass).toBe(false);
    expect(r.severity).toBe('fail');
    expect(r.fixHint.toLowerCase()).toContain('curadur');
  });
});

describe('stairSpec', () => {
  for (const h of [2.4, 2.7, 3.0, 4.5]) {
    it(`passes validateStairs for ${h}`, () => {
      const s = stairSpec(h);
      expect(s.riser_mm).toBeLessThanOrEqual(180);
      expect(s.tread_mm).toBeGreaterThanOrEqual(280);
      expect(s.width_m).toBeGreaterThanOrEqual(0.9);
      expect(s.totalSteps * s.riser_mm).toBeCloseTo(h * 1000, 3);
      const zone: Zone = { id: 'z', name: '', type: 'stairs', stairs: { riser_mm: s.riser_mm, tread_mm: s.tread_mm } } as any;
      expect(validateStairs(zone).pass).toBe(true);
    });
  }
  it('2.7 => 15 steps of 180', () => {
    const s = stairSpec(2.7);
    expect(s.totalSteps).toBe(15); expect(s.riser_mm).toBe(180);
  });
});
