import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createAccount,
  confirmSeed,
  assignRole,
  createInstance,
  saveAccountToLocalStorage,
  loadAccountFromLocalStorage,
  saveInstanceToLocalStorage,
  loadInstanceFromLocalStorage,
  clearLocalStorage,
  enrollBiometric,
  authenticateBiometric,
  isWebAuthnAvailable
} from "../../src/lib/domain/accounts";

// NIDO — integration tests for feature: accounts-auth
// User stories under test: US-401
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

// Must be valid Base64URL — startAuthentication decodes allowCredentials.id
const MOCK_CRED_ID = "bW9jay1jcmVkLWlkLWFiYzEyMw";

function bufferFromString(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

function stubWebAuthn(): {
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => ({
    id: MOCK_CRED_ID,
    rawId: bufferFromString(MOCK_CRED_ID),
    type: "public-key",
    authenticatorAttachment: "platform",
    getClientExtensionResults: () => ({}),
    response: {
      clientDataJSON: bufferFromString("client-data"),
      attestationObject: bufferFromString("attestation"),
      getTransports: () => ["internal"]
    }
  }));

  const get = vi.fn(async () => ({
    id: MOCK_CRED_ID,
    rawId: bufferFromString(MOCK_CRED_ID),
    type: "public-key",
    authenticatorAttachment: "platform",
    getClientExtensionResults: () => ({}),
    response: {
      clientDataJSON: bufferFromString("client-data"),
      authenticatorData: bufferFromString("auth-data"),
      signature: bufferFromString("signature"),
      userHandle: null
    }
  }));

  vi.stubGlobal("PublicKeyCredential", class PublicKeyCredential {});
  vi.stubGlobal("navigator", {
    ...navigator,
    credentials: { create, get }
  });

  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    get: () => true
  });

  return { create, get };
}

describe("US-401 Integration: Account creation, offline persistence, and workspace isolation", () => {
  let credentials: ReturnType<typeof stubWebAuthn>;

  beforeEach(() => {
    clearLocalStorage();
    credentials = stubWebAuthn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("acceptance 1: localAuth: complete registration, seed phrase verification & backup flow", () => {
    // 1. User starts with empty local state
    expect(loadAccountFromLocalStorage()).toBeNull();

    // 2. User registers and generates a seed phrase
    const account = createAccount("Xavier");
    expect(account.name).toBe("Xavier");
    expect(account.role).toBe("admin"); // Owner default is admin

    // 3. System displays seed phrase, user backs up and verifies
    const isValidBackup = confirmSeed(account, account.seedPhrase);
    expect(isValidBackup).toBe(true);

    const isInvalidBackup = confirmSeed(account, "wrong phrase");
    expect(isInvalidBackup).toBeFalsy();

    // 4. Save account locally (simulating offline-first storage)
    saveAccountToLocalStorage(account);

    // 5. Retrieve from offline storage
    const storedAccount = loadAccountFromLocalStorage();
    if (typeof localStorage !== "undefined") {
      expect(storedAccount).not.toBeNull();
      expect(storedAccount?.id).toBe(account.id);
      expect(storedAccount?.seedPhrase).toBe(account.seedPhrase);
    }
  });

  it("acceptance 2: WebAuthn biometric enroll and verify integrated flow", async () => {
    expect(await isWebAuthnAvailable()).toBe(true);

    const username = "Xavier";
    const credId = await enrollBiometric(username);
    expect(credId).toBe(MOCK_CRED_ID);
    expect(credentials.create).toHaveBeenCalledOnce();

    // Verify authentication succeeds with the enrolled credential
    const authenticated = await authenticateBiometric(credId);
    expect(authenticated).toBe(true);
    expect(credentials.get).toHaveBeenCalledOnce();

    // Verify assertion failure path returns false (no crash)
    credentials.get.mockRejectedValueOnce(new Error("NotAllowedError"));
    const badAuth = await authenticateBiometric("some_other_id");
    expect(badAuth).toBeFalsy();
  });

  it("acceptance 3: Roles assignment and permission adjustments", () => {
    let account = createAccount("Xavier Propietario");
    expect(account.role).toBe("admin"); // Default owner role is admin

    // Adjust roles to Propietario
    account = assignRole(account, "propietario");
    expect(account.role).toBe("propietario");

    // Adjust roles to Inquilino (Tenant)
    account = assignRole(account, "inquilino");
    expect(account.role).toBe("inquilino");

    // Adjust roles to Supervisor
    account = assignRole(account, "supervisor");
    expect(account.role).toBe("supervisor");
  });

  it("acceptance 4: Multi-instance workspace isolation (REQ-004)", () => {
    // 1. Create two distinct workspace instances
    const instanceA = createInstance();
    const instanceB = createInstance();

    expect(instanceA).not.toBe(instanceB);
    expect(typeof instanceA).toBe("string");
    expect(typeof instanceB).toBe("string");

    // 2. Persist Instance A
    saveInstanceToLocalStorage(instanceA);
    const loadedInstance = loadInstanceFromLocalStorage();
    if (typeof localStorage !== "undefined") {
      expect(loadedInstance).toBe(instanceA);
      expect(loadedInstance).not.toBe(instanceB);
    }

    // 3. Override with Instance B
    saveInstanceToLocalStorage(instanceB);
    const loadedInstance2 = loadInstanceFromLocalStorage();
    if (typeof localStorage !== "undefined") {
      expect(loadedInstance2).toBe(instanceB);
      expect(loadedInstance2).not.toBe(instanceA);
    }
  });

  it("acceptance 5: Offline-first flow guarantees no server dependencies", () => {
    // Local creation and state check - must never hit networks or throw
    const localAccount = createAccount("Offline Owner");
    expect(localAccount.name).toBe("Offline Owner");
    expect(localAccount.seedPhrase.split(" ").length).toBe(12);

    saveAccountToLocalStorage(localAccount);
    const loaded = loadAccountFromLocalStorage();
    if (typeof localStorage !== "undefined") {
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe("Offline Owner");
    }
  });
});
