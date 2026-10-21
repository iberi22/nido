/**
 * Polygon Amoy testnet configuration for NIDO escrow.
 *
 * Real escrow contract deployment is manual/testnet-only:
 * deploy the contract, then set VITE_ESCROW_ADDRESS to the deployed address.
 *
 * Fail-closed: this module ships NO signer key. A client SPA must never hold a
 * private key, so wallet writes are not configurable from the bundle. When the
 * escrow address is missing or invalid, escrow is reported as unconfigured and
 * callers must handle that (see requireEscrowAddress).
 */

const DEFAULT_RPC_URL = "https://rpc-amoy.polygon.technology";
/** Zero address is a placeholder, never a deployed escrow. */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

function envString(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseEscrowAddress(raw: string | undefined): `0x${string}` | undefined {
  if (raw === undefined) return undefined;
  if (!ADDRESS_PATTERN.test(raw)) return undefined;
  if (raw.toLowerCase() === ZERO_ADDRESS) return undefined;
  return raw as `0x${string}`;
}

export const RPC_URL: string = envString("VITE_POLYGON_RPC_URL") ?? DEFAULT_RPC_URL;

/** Deployed escrow address, or undefined when not configured (fail-closed). */
export const ESCROW_CONTRACT_ADDRESS: `0x${string}` | undefined = parseEscrowAddress(
  envString("VITE_ESCROW_ADDRESS")
);

/** True only when a valid, non-placeholder escrow address is configured. */
export const ESCROW_CONFIGURED: boolean = ESCROW_CONTRACT_ADDRESS !== undefined;

/** Returns the escrow address or throws 'escrow not configured'. */
export function requireEscrowAddress(): `0x${string}` {
  if (ESCROW_CONTRACT_ADDRESS === undefined) {
    throw new Error("escrow not configured: set VITE_ESCROW_ADDRESS to a deployed escrow contract");
  }
  return ESCROW_CONTRACT_ADDRESS;
}
