import { describe, it, expect, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CONFIG_PATH = path.resolve(__dirname, "../../src/lib/domain/polygon-config.ts");
const PRIVATE_KEY_PATTERN = /0x[0-9a-fA-F]{64}\b/;

async function loadConfig(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }
  return import("../../src/lib/domain/polygon-config");
}

describe("polygon-config: fail-closed signer and escrow", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("contains no 0x-prefixed 64-hex private key literal in the module source", () => {
    const source = fs.readFileSync(CONFIG_PATH, "utf8");
    expect(source).not.toMatch(PRIVATE_KEY_PATTERN);
  });

  it("does not export any private key (client SPA must never hold a signer key)", async () => {
    const cfg = await loadConfig();
    expect(cfg).not.toHaveProperty("POLYGON_PRIVATE_KEY");
  });

  it("reports escrow as unconfigured when VITE_ESCROW_ADDRESS is unset", async () => {
    const cfg = await loadConfig({ VITE_ESCROW_ADDRESS: "" });
    expect(cfg.ESCROW_CONFIGURED).toBe(false);
    expect(cfg.ESCROW_CONTRACT_ADDRESS).toBeUndefined();
    expect(() => cfg.requireEscrowAddress()).toThrow(/escrow not configured/);
  });

  it("treats the zero address placeholder as unconfigured", async () => {
    const cfg = await loadConfig({
      VITE_ESCROW_ADDRESS: "0x0000000000000000000000000000000000000000"
    });
    expect(cfg.ESCROW_CONFIGURED).toBe(false);
    expect(() => cfg.requireEscrowAddress()).toThrow(/escrow not configured/);
  });

  it("treats a malformed address as unconfigured", async () => {
    const cfg = await loadConfig({ VITE_ESCROW_ADDRESS: "not-an-address" });
    expect(cfg.ESCROW_CONFIGURED).toBe(false);
    expect(() => cfg.requireEscrowAddress()).toThrow(/escrow not configured/);
  });

  it("returns the address when a valid escrow address is configured", async () => {
    const addr = "0x1111111111111111111111111111111111111111";
    const cfg = await loadConfig({ VITE_ESCROW_ADDRESS: addr });
    expect(cfg.ESCROW_CONFIGURED).toBe(true);
    expect(cfg.requireEscrowAddress()).toBe(addr);
  });
});
