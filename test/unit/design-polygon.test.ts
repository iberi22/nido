import { describe, it, expect } from 'vitest';
import {
  normalizeLot, polygonArea, insetConvex, edgeSetbacks, largestRect, buildableRect
} from '../../src/lib/domain/design/polygon';
import { metersPerPixel } from '../../src/lib/domain/design/calibration';

const rect = (w: number, d: number): [number, number][] => [[0, 0], [w, 0], [w, d], [0, d]];
const bbox = (p: [number, number][]) => ({
  minX: Math.min(...p.map(a => a[0])), maxX: Math.max(...p.map(a => a[0])),
  minY: Math.min(...p.map(a => a[1])), maxY: Math.max(...p.map(a => a[1]))
});

describe('calibration', () => {
  it('computes m per px', () => {
    expect(metersPerPixel([0, 0], [300, 400], 10)).toBeCloseTo(0.02);
  });
  it('rejects coincident points / bad distance', () => {
    expect(() => metersPerPixel([1, 1], [1, 1], 5)).toThrow();
    expect(() => metersPerPixel([0, 0], [1, 1], 0)).toThrow();
  });
});

describe('normalizeLot', () => {
  it('scales, makes CCW and puts front edge on y=0 at front-left', () => {
    // clockwise px rect 100x300 px, y-down; front edge = edge 0 (top)
    const px: [number, number][] = [[50, 50], [150, 50], [150, 350], [50, 350]];
    const r = normalizeLot(px, 0, 0.06);
    expect(polygonArea(r.polygon)).toBeGreaterThan(0);
    const b = bbox(r.polygon);
    expect(b.minX).toBeCloseTo(0); expect(b.minY).toBeCloseTo(0);
    expect(b.maxX).toBeCloseTo(6); expect(b.maxY).toBeCloseTo(18);
    const [a, c] = [r.polygon[r.frontEdge], r.polygon[(r.frontEdge + 1) % 4]];
    expect(a[1]).toBeCloseTo(0); expect(c[1]).toBeCloseTo(0);
    expect(a[0]).toBeCloseTo(0); expect(c[0]).toBeCloseTo(6);
  });
  it('clockwise input: normalised front edge is the chosen edge (20 m) with interior at +y', () => {
    // CW 6x20 m rect (0.1 m/px); edges: 0 = 20 m, 1 = 6 m, 2 = 20 m, 3 = 6 m
    const px: [number, number][] = [[0, 0], [0, 200], [60, 200], [60, 0]];
    for (const [fe, len, depth] of [[0, 20, 6], [1, 6, 20], [2, 20, 6], [3, 6, 20]]) {
      const r = normalizeLot(px, fe, 0.1);
      const a = r.polygon[r.frontEdge], c = r.polygon[(r.frontEdge + 1) % 4];
      expect(a[0]).toBeCloseTo(0); expect(a[1]).toBeCloseTo(0);
      expect(c[1]).toBeCloseTo(0);
      expect(c[0]).toBeCloseTo(len);
      const b = bbox(r.polygon);
      expect(b.minY).toBeCloseTo(0); expect(b.maxY).toBeCloseTo(depth);
      expect(polygonArea(r.polygon)).toBeGreaterThan(0);
    }
  });
  it('handles a rotated front edge', () => {
    const px: [number, number][] = [[0, 0], [0, 100], [200, 100], [200, 0]]; // arbitrary winding
    const r = normalizeLot(px, 1, 0.1);
    const b = bbox(r.polygon);
    expect(b.minY).toBeCloseTo(0);
    const a = r.polygon[r.frontEdge], c = r.polygon[(r.frontEdge + 1) % 4];
    expect(a[1]).toBeCloseTo(0); expect(c[1]).toBeCloseTo(0);
    expect(Math.abs(polygonArea(r.polygon))).toBeCloseTo(200);
  });
});

describe('insetConvex', () => {
  it('6x26 with defaults => 6 x 21 at y in [2,23]', () => {
    const res = insetConvex(rect(6, 26), edgeSetbacks(rect(6, 26), 0, { front: 2, rear: 3, left: 0, right: 0 }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const b = bbox(res.polygon);
    expect(b.minX).toBeCloseTo(0); expect(b.maxX).toBeCloseTo(6);
    expect(b.minY).toBeCloseTo(2); expect(b.maxY).toBeCloseTo(23);
  });
  it('triangle', () => {
    const tri: [number, number][] = [[0, 0], [10, 0], [5, 10]];
    const res = insetConvex(tri, [1, 1, 1]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.polygon).toHaveLength(3);
    expect(polygonArea(res.polygon)).toBeLessThan(polygonArea(tri));
    expect(bbox(res.polygon).minY).toBeCloseTo(1);
  });
  it('convex pentagon', () => {
    const pent: [number, number][] = [[0, 0], [10, 0], [12, 6], [5, 11], [-2, 6]];
    const res = insetConvex(pent, [1, 1, 1, 1, 1]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.polygon).toHaveLength(5);
  });
  it('concave => ok:false concave', () => {
    const L: [number, number][] = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
    expect(insetConvex(L, [1, 1, 1, 1, 1, 1])).toEqual({ ok: false, reason: 'concave' });
  });
  it('too large setbacks => empty', () => {
    const res = insetConvex(rect(6, 26), [20, 0, 20, 0]);
    expect(res.ok).toBe(false);
  });
});

describe('largestRect / buildableRect', () => {
  it('finds the full rectangle in a rectangle', () => {
    const r = largestRect(rect(6, 21));
    expect(r.width * r.height).toBeCloseTo(126, 0);
  });
  it('triangle rect is inside', () => {
    const r = largestRect([[0, 0], [10, 0], [5, 10]]);
    expect(r.width * r.height).toBeGreaterThan(20);
    expect(r.width * r.height).toBeLessThanOrEqual(25.01);
  });
  it('buildableRect caps occupancy by shrinking from rear', () => {
    const lot = rect(6, 26);
    const r = buildableRect(lot, 0, { front: 2, rear: 3, left: 0, right: 0, maxOccupancy: 0.75 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rect.x).toBeCloseTo(0); expect(r.rect.y).toBeCloseTo(2);
    expect(r.rect.width).toBeCloseTo(6);
    expect(r.rect.width * r.rect.height).toBeLessThanOrEqual(0.75 * 156 + 1e-6);
    expect(r.rect.height).toBeGreaterThan(19);
  });
});
