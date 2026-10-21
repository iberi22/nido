// Scale calibration from two clicked points and a real-world distance.

export function metersPerPixel(
  p1: [number, number],
  p2: [number, number],
  distance_m: number
): number {
  const px = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  if (!Number.isFinite(px) || px <= 0) throw new Error('calibration points must be distinct');
  if (!Number.isFinite(distance_m) || distance_m <= 0) throw new Error('distance must be > 0');
  return distance_m / px;
}
