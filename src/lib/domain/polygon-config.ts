/**
 * Polygon Amoy testnet configuration for NIDO escrow.
 *
 * Real escrow contract deployment is manual/testnet-only:
 * deploy the contract, then set VITE_ESCROW_ADDRESS to the deployed address.
 * Optional VITE_POLYGON_PRIVATE_KEY for wallet writes (never commit secrets).
 */

const DEFAULT_RPC_URL = "https://rpc-amoy.polygon.technology";
/** Placeholder until a testnet escrow contract is deployed manually. */
const DEFAULT_ESCROW_ADDRESS = "0x0000000000000000000000000000000000000000";
/** Hardhat/Anvil account #0 — local/testnet throwaway only, not for mainnet funds. */
const DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function envString(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const RPC_URL: string = envString("VITE_POLYGON_RPC_URL") ?? DEFAULT_RPC_URL;

export const ESCROW_CONTRACT_ADDRESS: `0x${string}` = (envString("VITE_ESCROW_ADDRESS") ??
  DEFAULT_ESCROW_ADDRESS) as `0x${string}`;

export const POLYGON_PRIVATE_KEY: `0x${string}` = (envString("VITE_POLYGON_PRIVATE_KEY") ??
  DEFAULT_PRIVATE_KEY) as `0x${string}`;
