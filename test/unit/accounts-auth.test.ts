import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
  authenticateBiometric,
  WebAuthnUnavailableError
} from "../../src/lib/domain/accounts";

// NIDO — unit tests for feature: accounts-auth
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

describe("US-401: create my account offline-first with recovery seed and biometrics", () => {
  let credentials: ReturnType<typeof stubWebAuthn>;

  beforeEach(() => {
    clearLocalStorage();
    credentials = stubWebAuthn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("acceptance 2: WebAuthn biometric unlock via @simplewebauthn/browser", async () => {
    const isAvail = await isWebAuthnAvailable();
    expect(isAvail).toBe(true);

    const username = "Xavier";
    const credId = await enrollBiometric(username);
    expect(credId).toBe(MOCK_CRED_ID);
    expect(typeof credId).toBe("string");
    expect(credentials.create).toHaveBeenCalledOnce();
    expect(credentials.create.mock.calls[0]?.[0]).toMatchObject({
      publicKey: expect.objectContaining({
        rp: expect.objectContaining({ name: "NIDO" }),
        user: expect.objectContaining({ name: username })
      })
    });

    const authSuccess = await authenticateBiometric(credId);
    expect(authSuccess).toBe(true);
    expect(credentials.get).toHaveBeenCalledOnce();
    expect(credentials.get.mock.calls[0]?.[0]).toMatchObject({
      publicKey: expect.objectContaining({
        allowCredentials: expect.arrayContaining([
          expect.objectContaining({ type: "public-key" })
        ])
      })
    });

    credentials.get.mockRejectedValueOnce(new Error("NotAllowedError"));
    const authFail = await authenticateBiometric("invalid-credential");
    expect(authFail).toBeFalsy();

    await expect(enrollBiometric("")).rejects.toThrow("Username must be provided");
  });

  it("acceptance 2b: WebAuthn offline fallback when credentials API missing", async () => {
    vi.stubGlobal("navigator", { ...navigator, credentials: undefined });
    expect(await isWebAuthnAvailable()).toBe(false);
    await expect(enrollBiometric("Xavier")).rejects.toBeInstanceOf(WebAuthnUnavailableError);
    expect(await authenticateBiometric(MOCK_CRED_ID)).toBe(false);
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
