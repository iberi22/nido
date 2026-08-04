import type { NodeStatus } from "./client";

/**
 * Checks if the current workspace/node tier is Pro.
 * Pro tier is unlocked purely by having an active SWAL node status.
 * Stripe or payments are strictly NOT used.
 *
 * @param nodeStatus The status of the SWAL node
 * @returns boolean indicating if Pro tier is active
 */
export function isPro(nodeStatus: NodeStatus | null | undefined): boolean {
  if (!nodeStatus) {
    return false;
  }
  return nodeStatus.active === true;
}
