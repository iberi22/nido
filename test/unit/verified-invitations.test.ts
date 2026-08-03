import { describe, it, expect } from "vitest";
import {
  generateToken,
  verifyToken,
  revokeToken,
  createTokenStore,
  addGeneratedToken
} from "../../src/lib/domain/invitations";

// NIDO — unit tests for feature: verified-invitations
// User stories under test: US-402
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-402: invite a tenant/inspector with a 1-time-use token", () => {
  it("acceptance 1: creates URL-safe 1-time token of 24 random bytes in base64url", () => {
    const tokenObj = generateToken("inquilino", 7);
    expect(tokenObj.token).toBeDefined();
    expect(typeof tokenObj.token).toBe("string");
    expect(tokenObj.token.length).toBeGreaterThanOrEqual(32); // 24 bytes in base64url is 32 chars

    // URL-safe checks (no +, /, or = characters)
    expect(tokenObj.token).not.toContain("+");
    expect(tokenObj.token).not.toContain("/");
    expect(tokenObj.token).not.toContain("=");
    expect(tokenObj.role).toBe("inquilino");
    expect(tokenObj.used).toBeFalsy();
  });

  it("acceptance 2: Token consumed on first verify, creates session", () => {
    const store = createTokenStore("test_unit_store_1");
    store.tokens = [];
    store.auditLog = [];
    store.sessions = [];

    const invitation = generateToken("supervisor", 2);
    addGeneratedToken(store, invitation);

    const session = verifyToken(invitation.token, store);
    expect(session.id).toBeDefined();
    expect(session.role).toBe("supervisor");
    expect(store.sessions.length).toBe(1);
    expect(invitation.used).toBe(true);

    // Verify 1-time consumption: consecutive verify must fail
    expect(() => verifyToken(invitation.token, store)).toThrow("Token already used");
  });

  it("acceptance 3: Token expiry + revoke", () => {
    const store = createTokenStore("test_unit_store_2");
    store.tokens = [];
    store.auditLog = [];
    store.sessions = [];

    const invitation = generateToken("propietario", 5);
    addGeneratedToken(store, invitation);

    // Revoke token
    revokeToken(invitation.token, store);
    expect(invitation.revoked).toBe(true);

    // Verify revoked token throws
    expect(() => verifyToken(invitation.token, store)).toThrow("Token has been revoked");

    // Expiry test (by manually setting expired date)
    const expiredInvitation = generateToken("inquilino", -1); // expired 1 day ago
    addGeneratedToken(store, expiredInvitation);

    expect(() => verifyToken(expiredInvitation.token, store)).toThrow("Token has expired");
  });

  it("acceptance 4: Audit log of invitations", () => {
    const store = createTokenStore("test_unit_store_3");
    store.tokens = [];
    store.auditLog = [];
    store.sessions = [];

    const invitation = generateToken("supervisor", 10);
    addGeneratedToken(store, invitation);

    expect(store.auditLog.length).toBe(1);
    expect(store.auditLog[0].action).toBe("generate");
    expect(store.auditLog[0].tokenId).toBe(invitation.token);
    expect(store.auditLog[0].role).toBe("supervisor");

    // Verify
    verifyToken(invitation.token, store);
    expect(store.auditLog.length).toBe(2);
    expect(store.auditLog[1].action).toBe("verify_success");
    expect(store.auditLog[1].role).toBe("supervisor");

    // Failed verify also logged
    expect(() => verifyToken(invitation.token, store)).toThrow();
    expect(store.auditLog.length).toBe(3);
    expect(store.auditLog[2].action).toBe("verify_failed");
  });

  it("acceptance 5: Role scoped at creation", () => {
    const store = createTokenStore("test_unit_store_4");
    store.tokens = [];

    const supervisorInvitation = generateToken("supervisor", 1);
    const inquilinoInvitation = generateToken("inquilino", 1);
    const propietarioInvitation = generateToken("propietario", 1);

    addGeneratedToken(store, supervisorInvitation);
    addGeneratedToken(store, inquilinoInvitation);
    addGeneratedToken(store, propietarioInvitation);

    const session1 = verifyToken(supervisorInvitation.token, store);
    expect(session1.role).toBe("supervisor");

    const session2 = verifyToken(inquilinoInvitation.token, store);
    expect(session2.role).toBe("inquilino");

    const session3 = verifyToken(propietarioInvitation.token, store);
    expect(session3.role).toBe("propietario");
  });
});
