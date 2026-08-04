/**
 * Polygon escrow client (viem) for Amoy testnet.
 *
 * Domain escrow state machine stays pure; this client performs on-chain txs.
 * Real contract deployment is manual/testnet — configure via polygon-config.ts.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex,
  type Abi,
  type Account,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";
import {
  ESCROW_CONTRACT_ADDRESS,
  POLYGON_PRIVATE_KEY,
  RPC_URL
} from "./polygon-config";

/**
 * Minimal escrow contract surface used by NIDO.
 * Deploy a matching contract on Amoy and set VITE_ESCROW_ADDRESS.
 */
export const ESCROW_ABI = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "leaseId", type: "string" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "escrowKey", type: "bytes32" }]
  },
  {
    type: "function",
    name: "lock",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "release",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "bytes32" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "getBalance",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [{ name: "balance", type: "uint256" }]
  }
] as const satisfies Abi;

export interface PolygonClient {
  createEscrowContract(leaseId: string, amount: number): Promise<string>;
  lock(escrowId: string): Promise<string>;
  release(escrowId: string, amount: number): Promise<string>;
  getBalance(escrowId: string): Promise<bigint>;
}

function toEscrowKey(escrowId: string): Hex {
  return keccak256(stringToHex(escrowId));
}

function toTokenAmount(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Escrow amount must be a non-negative finite number");
  }
  return BigInt(Math.round(amount));
}

/**
 * Viem-backed Polygon Amoy client.
 * Uses createPublicClient + createWalletClient; no mainnet wiring.
 */
export class ViemPolygonClient implements PolygonClient {
  private readonly publicClient: PublicClient<Transport, Chain>;
  private readonly walletClient: WalletClient<Transport, Chain, Account>;
  private readonly account: Account;
  private readonly contractAddress: `0x${string}`;

  constructor(options?: {
    rpcUrl?: string;
    contractAddress?: `0x${string}`;
    privateKey?: `0x${string}`;
  }) {
    const rpcUrl = options?.rpcUrl ?? RPC_URL;
    this.contractAddress = options?.contractAddress ?? ESCROW_CONTRACT_ADDRESS;
    this.account = privateKeyToAccount(options?.privateKey ?? POLYGON_PRIVATE_KEY);

    this.publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(rpcUrl)
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: polygonAmoy,
      transport: http(rpcUrl)
    });
  }

  async createEscrowContract(leaseId: string, amount: number): Promise<string> {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ESCROW_ABI,
      functionName: "createEscrow",
      args: [leaseId, toTokenAmount(amount)],
      chain: polygonAmoy,
      account: this.account
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    // Shared escrow contract address (per-escrow keys are lease/escrow ids on-chain).
    return this.contractAddress;
  }

  async lock(escrowId: string): Promise<string> {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ESCROW_ABI,
      functionName: "lock",
      args: [toEscrowKey(escrowId)],
      chain: polygonAmoy,
      account: this.account
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async release(escrowId: string, amount: number): Promise<string> {
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ESCROW_ABI,
      functionName: "release",
      args: [toEscrowKey(escrowId), toTokenAmount(amount)],
      chain: polygonAmoy,
      account: this.account
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async getBalance(escrowId: string): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: ESCROW_ABI,
      functionName: "getBalance",
      args: [toEscrowKey(escrowId)]
    });
  }
}

let defaultClient: PolygonClient | undefined;

/**
 * Default Polygon client (Viem / Amoy).
 * Tests must inject a mock — never call real RPC in CI.
 */
export function getDefaultPolygonClient(): PolygonClient {
  if (!defaultClient) {
    defaultClient = new ViemPolygonClient();
  }
  return defaultClient;
}

/** Test helper: replace the lazy default (e.g. with a stub). */
export function setDefaultPolygonClient(client: PolygonClient | undefined): void {
  defaultClient = client;
}
