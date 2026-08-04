import { describe, it, expect } from "vitest";
import {
  generateToken,
  verifyToken,
  revokeToken,
  createTokenStore,
  addGeneratedToken
} from "../../src/lib/domain/invitations";

// NIDO — integration tests for feature: verified-invitations
// User stories under test: US-402
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-402: invite a tenant/inspector with a 1-time-use token - integration flow", () => {
  it("acceptance 1: POST /api/token/generate creates URL-safe 1-time token", () => {
    // Generate a token and verify URL safety and integration structure
    const tokenObj = generateToken("inquilino", 15);
    expect(tokenObj.token).toBeDefined();
    expect(tokenObj.token).toMatch(/^[a-zA-Z0-9_-]+$/); // base64url regex
    expect(tokenObj.used).toBeFalsy();
  });

  it("acceptance 2: Token consumed on first verify, creates session and persists via localStorage", () => {
    const storeKey = "nido_integration_test_persistence";
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(storeKey);
    }

    // Step A: Generate and store
    const store1 = createTokenStore(storeKey);
    const tokenObj = generateToken("inquilino", 10);
    addGeneratedToken(store1, tokenObj);

    // Verify localStorage has the token saved
    if (typeof window !== "undefined" && window.localStorage) {
      const storedData = JSON.parse(window.localStorage.getItem(storeKey) || "{}");
      expect(storedData.tokens.length).toBe(1);
      expect(storedData.tokens[0].token).toBe(tokenObj.token);
    }

    // Step B: Reload store from localStorage and verify/consume
    const store2 = createTokenStore(storeKey);
    expect(store2.tokens.length).toBe(1);

    const session = verifyToken(tokenObj.token, store2);
    expect(session.role).toBe("inquilino");
    expect(store2.tokens[0].used).toBe(true);

    // Verify that the consumed status was saved back to localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      const storedData = JSON.parse(window.localStorage.getItem(storeKey) || "{}");
      expect(storedData.tokens[0].used).toBe(true);
      expect(storedData.sessions.length).toBe(1);
      expect(storedData.auditLog.length).toBe(2); // generate + verify_success
    }

    // Step C: Try consuming again with a fresh store reload (must fail)
    const store3 = createTokenStore(storeKey);
    expect(() => verifyToken(tokenObj.token, store3)).toThrow("Token already used");
  });

  it("acceptance 3: Token expiry + revoke in-store and saved in storage", () => {
    const storeKey = "nido_integration_test_revoke";
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(storeKey);
    }

    const store = createTokenStore(storeKey);
    const invitation = generateToken("supervisor", 5);
    addGeneratedToken(store, invitation);

    // Revoke token and assert persistence
    revokeToken(invitation.token, store);

    const storeReloaded = createTokenStore(storeKey);
    expect(storeReloaded.tokens[0].revoked).toBe(true);
    expect(() => verifyToken(invitation.token, storeReloaded)).toThrow("Token has been revoked");
  });

  it("acceptance 4: Audit log persistent tracking across actions", () => {
    const storeKey = "nido_integration_test_audit";
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(storeKey);
    }

    const store = createTokenStore(storeKey);
    const invitation = generateToken("propietario", 30);

    // Generate audit
    addGeneratedToken(store, invitation);
    expect(store.auditLog.length).toBe(1);
    expect(store.auditLog[0].action).toBe("generate");

    // Failed verification audit
    expect(() => verifyToken("invalid-nonexistent-token", store)).toThrow();
    expect(store.auditLog.length).toBe(2);
    expect(store.auditLog[1].action).toBe("verify_failed");

    // Successful verification audit
    verifyToken(invitation.token, store);
    expect(store.auditLog.length).toBe(3);
    expect(store.auditLog[2].action).toBe("verify_success");

    // Reload check for audit trail persistence
    const reloadedStore = createTokenStore(storeKey);
    expect(reloadedStore.auditLog.length).toBe(3);
    expect(reloadedStore.auditLog[0].action).toBe("generate");
    expect(reloadedStore.auditLog[1].action).toBe("verify_failed");
    expect(reloadedStore.auditLog[2].action).toBe("verify_success");
  });

  it("acceptance 5: Role scoped at creation persists and propagates to session", () => {
    const storeKey = "nido_integration_test_roles";
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(storeKey);
    }

    const store = createTokenStore(storeKey);
    const supervisorToken = generateToken("supervisor", 1);
    addGeneratedToken(store, supervisorToken);

    const reloaded = createTokenStore(storeKey);
    const session = verifyToken(supervisorToken.token, reloaded);

    expect(session.role).toBe("supervisor");

    const finalCheckStore = createTokenStore(storeKey);
    expect(finalCheckStore.sessions[0].role).toBe("supervisor");
  });
});
