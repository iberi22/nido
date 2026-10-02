// Pure measurement plan for 3D dimension lines (plan first, mesh emission in Scene3D).
import type { Component } from '../stores/floorPlanStore.svelte';
import { wallEndsMm, wallLengthMm, wallThicknessMm } from './apply';
import { formatM, planMmToWorld } from './units';

export interface DimensionLine {
  id: string; // wall id
  lengthMm: number;
  label: string; // "3.00 m"
  /** world-space (three.js, metres) endpoints, already offset away from the wall */
  a: { x: number; z: number };
  b: { x: number; z: number };
  /** world-space label anchor (midpoint of a-b) */
  mid: { x: number; z: number };
}

/** One dimension line per wall, offset `offsetM` metres to the side of the wall. */
export function wallDimensionLines(
  components: Component[],
  plot: { width: number; height: number },
  offsetM = 0.35
): DimensionLine[] {
  const out: DimensionLine[] = [];
  for (const c of components) {
    if (c.type !== 'wall') continue;
    const e = wallEndsMm(c);
    const lengthMm = wallLengthMm(c);
    if (lengthMm <= 0) continue;
    const a = planMmToWorld({ x: e.x1, y: e.y1 }, plot);
    const b = planMmToWorld({ x: e.x2, y: e.y2 }, plot);
    const dx = (e.x2 - e.x1) / lengthMm;
    const dz = (e.y2 - e.y1) / lengthMm;
    // normal pointing away (towards -z / +x side) so labels do not sit inside walls
    const off = offsetM + wallThicknessMm(c) / 2000;
    const nx = dz * off;
    const nz = -dx * off;
    const pa = { x: a.x + nx, z: a.z + nz };
    const pb = { x: b.x + nx, z: b.z + nz };
    out.push({
      id: c.id,
      lengthMm,
      label: formatM(lengthMm),
      a: pa,
      b: pb,
      mid: { x: (pa.x + pb.x) / 2, z: (pa.z + pb.z) / 2 }
    });
  }
  return out;
}
