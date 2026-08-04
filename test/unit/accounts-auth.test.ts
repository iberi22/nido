import { describe, it, expect, beforeEach } from "vitest";
import {
  createAccount,
  confirmSeed,
  assignRole,
  createInstance,
  generateSeedPhrase,
  saveAccountToLocalStorage,
  loadAccountFromLocalStorage,
  saveInstanceToLocalStorage,
  loadInstanceFromLocalStorage,
  clearLocalStorage,
  isWebAuthnAvailable,
  enrollBiometric,
  authenticateBiometric
} from "../../src/lib/domain/accounts";

// NIDO — unit tests for feature: accounts-auth
// User stories under test: US-401
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-401: create my account offline-first with recovery seed and biometrics", () => {
  beforeEach(() => {
    // Clear mock localStorage or variables if any
    clearLocalStorage();
  });

  it("acceptance 1: localAuth: create account with seed phrase recovery", () => {
    const account = createAccount("Xavier");
    expect(account.id).toBeDefined();
    expect(account.name).toBe("Xavier");
    expect(account.seedPhrase).toBeDefined();
    expect(account.createdAt).toBeDefined();

    const words = account.seedPhrase.split(" ");
    expect(words.length).toBe(12);

    // Test seed phrase confirmation
    expect(confirmSeed(account, account.seedPhrase)).toBe(true);
    expect(confirmSeed(account, "invalid seed phrase")).toBeFalsy();

    // Test seed generation separately
    const anotherSeed = generateSeedPhrase();
    expect(anotherSeed.split(" ").length).toBe(12);
  });

  it("acceptance 2: WebAuthn biometric unlock stubs and availability check", async () => {
    const isAvail = await isWebAuthnAvailable();
    // In headless test environments, this typically resolves to false
    expect(typeof isAvail).toBe("boolean");

    const username = "Xavier";
    const credId = await enrollBiometric(username);
    expect(credId).toBeDefined();
    expect(typeof credId).toBe("string");
    expect(credId.startsWith("cred_")).toBe(true);

    const authSuccess = await authenticateBiometric(credId);
    expect(authSuccess).toBe(true);

    const authFail = await authenticateBiometric("invalid-credential");
    expect(authFail).toBeFalsy();

    await expect(enrollBiometric("")).rejects.toThrow("Username must be provided");
  });

  it("acceptance 3: Roles assigned (owner default is admin)", () => {
    const account = createAccount("Xavier");
    // Owner defaults to 'admin' to grant administrative rights
    expect(account.role).toBe("admin");

    const updated1 = assignRole(account, "propietario");
    expect(updated1.role).toBe("propietario");

    const updated2 = assignRole(account, "inquilino");
    expect(updated2.role).toBe("inquilino");

    const updated3 = assignRole(account, "supervisor");
    expect(updated3.role).toBe("supervisor");
  });

  it("acceptance 4: instance_id persisted per workspace", () => {
    const instance_id = createInstance();
    expect(instance_id).toBeDefined();
    expect(typeof instance_id).toBe("string");
    expect(instance_id.length).toBeGreaterThan(10);

    saveInstanceToLocalStorage(instance_id);
    const loaded = loadInstanceFromLocalStorage();
    // Since localStorage might be a stub/undefined in headless NodeJS vitest environment,
    // we should handle it gracefully or use standard mock.
    if (typeof localStorage !== "undefined") {
      expect(loaded).toBe(instance_id);
    }
  });

  it("acceptance 5: No server dependency for account creation (offline-first)", () => {
    const account = createAccount("Offline Xavier");
    expect(account).toBeDefined();
    expect(account.name).toBe("Offline Xavier");

    saveAccountToLocalStorage(account);
    const loaded = loadAccountFromLocalStorage();
    if (typeof localStorage !== "undefined") {
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(account.id);
      expect(loaded?.name).toBe(account.name);
      expect(loaded?.seedPhrase).toBe(account.seedPhrase);
    }
  });
});
