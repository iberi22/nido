// Pure lot-polygon geometry. Plan coords: metres, front edge on y=0, y grows into the lot.

export type Pt = [number, number];
export interface Rect { x: number; y: number; width: number; height: number }
export interface Setbacks { front: number; rear: number; left: number; right: number }

const EPS = 1e-9;

/** Signed shoelace area (>0 for CCW). */
export function polygonArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/**
 * px -> m, force CCW, rotate/translate so the front edge starts at the origin and runs
 * along +x (index 0), with the lot interior on +y.
 */
export function normalizeLot(
  px: Pt[],
  frontEdge: number,
  m_per_px: number
): { polygon: Pt[]; frontEdge: number } {
  const n = px.length;
  let pts: Pt[] = px.map(([x, y]) => [x * m_per_px, y * m_per_px]);
  let fe = frontEdge;
  if (polygonArea(pts) < 0) {
    pts = pts.slice().reverse();
    fe = (n - 2 - frontEdge + 2 * n) % n;
  }
  pts = pts.slice(fe).concat(pts.slice(0, fe));
  const a = pts[0], b = pts[1];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const c = Math.cos(-ang), s = Math.sin(-ang);
  const polygon = pts.map(([x, y]): Pt => {
    const dx = x - a[0], dy = y - a[1];
    return [dx * c - dy * s, dx * s + dy * c];
  });
  return { polygon, frontEdge: 0 };
}

/** Per-edge setbacks (edge i = v[i]->v[i+1], CCW) classified by outward normal. */
export function edgeSetbacks(poly: Pt[], frontEdge: number, sb: Setbacks): number[] {
  return poly.map((a, i) => {
    if (i === frontEdge) return sb.front;
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len, ny = -dx / len; // outward for CCW
    if (ny > 0.7) return sb.rear;
    return nx >= 0 ? sb.right : sb.left;
  });
}

function isConvex(p: Pt[]): boolean {
  const n = p.length;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cr < -EPS) return false;
  }
  return true;
}

export type InsetResult =
  | { ok: true; polygon: Pt[] }
  | { ok: false; reason: 'concave' | 'empty' | 'degenerate' };

/** Inset a convex CCW polygon; setbacks[i] applies to edge v[i]->v[i+1]. */
export function insetConvex(poly: Pt[], setbacks: number[]): InsetResult {
  const n = poly.length;
  if (n < 3 || setbacks.length !== n) return { ok: false, reason: 'degenerate' };
  let p = poly, sb = setbacks;
  const area = polygonArea(poly);
  if (Math.abs(area) < EPS) return { ok: false, reason: 'degenerate' };
  if (area < 0) {
    p = poly.slice().reverse();
    sb = Array.from({ length: n }, (_, k) => setbacks[(n - 2 - k + 2 * n) % n]);
  }
  if (!isConvex(p)) return { ok: false, reason: 'concave' };

  let cur: Pt[] = p.slice();
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < EPS) continue;
    const nx = -dy / len, ny = dx / len; // inward
    const f = (q: Pt) => (q[0] - a[0]) * nx + (q[1] - a[1]) * ny - sb[i];
    const out: Pt[] = [];
    for (let j = 0; j < cur.length; j++) {
      const s = cur[j], e = cur[(j + 1) % cur.length];
      const fs = f(s), fe = f(e);
      if (fs >= -EPS) out.push(s);
      if ((fs > EPS && fe < -EPS) || (fs < -EPS && fe > EPS)) {
        const t = fs / (fs - fe);
        out.push([s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t]);
      }
    }
    cur = out.filter((q, k) => {
      const prev = out[(k + out.length - 1) % out.length];
      return Math.hypot(q[0] - prev[0], q[1] - prev[1]) > 1e-7;
    });
    if (cur.length < 3) return { ok: false, reason: 'empty' };
  }
  if (polygonArea(cur) < 1e-6) return { ok: false, reason: 'empty' };
  return { ok: true, polygon: cur };
}

function xRange(p: Pt[], y: number): [number, number] | null {
  let lo = Infinity, hi = -Infinity;
  const tol = 1e-7;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    if (y < y0 - tol || y > y1 + tol) continue;
    if (y1 - y0 < tol) {
      lo = Math.min(lo, a[0], b[0]); hi = Math.max(hi, a[0], b[0]);
    } else {
      const t = Math.min(1, Math.max(0, (y - a[1]) / (b[1] - a[1])));
      const x = a[0] + (b[0] - a[0]) * t;
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Largest axis-aligned rectangle in a convex polygon (scanline over y, 0.05 m step). */
export function largestRect(poly: Pt[], step = 0.05): Rect {
  const minY = Math.min(...poly.map(q => q[1])), maxY = Math.max(...poly.map(q => q[1]));
  const ys: number[] = [];
  for (let y = minY; y < maxY - 1e-7; y += step) ys.push(y);
  ys.push(maxY);
  const rs = ys.map(y => xRange(poly, y));
  let best: Rect = { x: 0, y: minY, width: 0, height: 0 };
  let bestA = 0;
  for (let i = 0; i < ys.length; i++) {
    const ri = rs[i];
    if (!ri) continue;
    for (let j = i + 1; j < ys.length; j++) {
      const rj = rs[j];
      if (!rj) continue;
      const left = Math.max(ri[0], rj[0]), right = Math.min(ri[1], rj[1]);
      const w = right - left, h = ys[j] - ys[i];
      if (w > 0 && w * h > bestA + 1e-9) {
        bestA = w * h;
        best = { x: left, y: ys[i], width: w, height: h };
      }
    }
  }
  return best;
}

export type BuildableResult =
  | { ok: true; rect: Rect; buildable: Pt[] }
  | { ok: false; reason: 'concave' | 'empty' | 'degenerate' };

/** Setback inset -> largest frontage-aligned rect -> shrink from the rear to the occupancy cap. */
export function buildableRect(
  lot: Pt[],
  frontEdge: number,
  rules: Setbacks & { maxOccupancy: number }
): BuildableResult {
  const inset = insetConvex(lot, edgeSetbacks(lot, frontEdge, rules));
  if (!inset.ok) return inset;
  const rect = largestRect(inset.polygon);
  if (rect.width <= 0 || rect.height <= 0) return { ok: false, reason: 'empty' };
  const cap = rules.maxOccupancy * Math.abs(polygonArea(lot));
  if (rect.width * rect.height > cap) rect.height = cap / rect.width;
  return { ok: true, rect, buildable: inset.polygon };
}
