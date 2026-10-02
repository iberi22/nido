// Units & snap math for the scene command layer.
// Command layer unit = INTEGER millimetres. The legacy Component model stores metres,
// so conversion happens only at the model boundary (apply.ts).

export const GRID_STEP_MM = 50;

export function mmToM(mm: number): number {
  return mm / 1000;
}

export function mToMm(m: number): number {
  return Math.round(m * 1000);
}

/** Snap a millimetre value to the nearest multiple of `step` (default 50 mm). */
export function snapMm(value: number, step: number = GRID_STEP_MM): number {
  if (step <= 0) return Math.round(value);
  // `+ 0` normalises -0 to 0
  return Math.round(value / step) * step + 0;
}

/**
 * Drag math: the object ORIGIN lands on the grid, the command carries the resulting
 * integer delta (so the command stays reversible and exact).
 */
export function snapMoveDelta(
  originMm: { x: number; y: number },
  rawDeltaMm: { x: number; y: number },
  step: number = GRID_STEP_MM
): { dx: number; dy: number } {
  const nx = snapMm(originMm.x + rawDeltaMm.x, step);
  const ny = snapMm(originMm.y + rawDeltaMm.y, step);
  return { dx: nx - Math.round(originMm.x), dy: ny - Math.round(originMm.y) };
}

/** Three.js world (x, z; metres) -> plan millimetres. Plan is centred on the plot. */
export function worldToPlanMm(
  world: { x: number; z: number },
  plot: { width: number; height: number }
): { x: number; y: number } {
  return { x: mToMm(world.x + plot.width / 2), y: mToMm(world.z + plot.height / 2) };
}

/** Plan millimetres -> three.js world (x, z; metres). */
export function planMmToWorld(
  plan: { x: number; y: number },
  plot: { width: number; height: number }
): { x: number; z: number } {
  return { x: mmToM(plan.x) - plot.width / 2, z: mmToM(plan.y) - plot.height / 2 };
}

/** Length label used by every measurement: metres with 2 decimals. */
export function formatM(mm: number): string {
  return `${(mm / 1000).toFixed(2)} m`;
}

export function newId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}`;
}
