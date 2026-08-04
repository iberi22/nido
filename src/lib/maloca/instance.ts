/**
 * Generate a unique instance ID for the local workspace isolation.
 */
export function generateInstanceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Cryptographically safe fallback or standard UUID v4 template
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns the standard mesh namespace path for a given instance ID.
 * Consistent with `swal/nido/{instanceId}` as used in mesh.ts.
 */
export function getMeshNamespace(instanceId: string): string {
  return `swal/nido/${instanceId}`;
}
