import { describe, it, expect } from "vitest";
import {
  generateToken,
  verifyToken,
  addGeneratedToken,
  createTokenStore
} from "../../src/lib/domain/invitations";
import {
  createPaymentHistoryProvider,
  linkToProof,
} from "../../src/lib/domain/links";
import {
  addLink,
  verifyLink,
  computeTrustScore,
  type TrustLink,
  type TrustHistory
} from "../../src/lib/domain/trust";

describe("Verified Invitations to OAuth Proof Flow - Integration Tests", () => {
  it("acceptance 1: 1-time invite token generated, verified, and second verify is REJECTED", () => {
    const store = createTokenStore("nido_test_flow_store_1");
    const tokenObj = generateToken("inquilino", 7);
    addGeneratedToken(store, tokenObj);

    // First verification - should succeed and return a session
    const session = verifyToken(tokenObj.token, store);
    expect(session.id).toBeDefined();
    expect(session.role).toEqual("inquilino");

    // Second verification - should be rejected as already used
    expect(() => verifyToken(tokenObj.token, store)).toThrow("Token already used");
  });

  it("acceptance 2: Expired token verification is rejected", () => {
    const store = createTokenStore("nido_test_flow_store_2");

    // Create a token and manually set expired date
    const tokenObj = generateToken("supervisor", -1); // expired 1 day ago
    addGeneratedToken(store, tokenObj);

    expect(() => verifyToken(tokenObj.token, store)).toThrow("Token has expired");
  });

  it("acceptance 3: Invitation acceptance and creation of a valid OAuth link proof", () => {
    const store = createTokenStore("nido_test_flow_store_3");
    const tokenObj = generateToken("propietario", 5);
    addGeneratedToken(store, tokenObj);

    // Verify token to establish session
    const session = verifyToken(tokenObj.token, store);
    expect(session).toBeDefined();

    // Start OAuth provider flow (e.g., payment history)
    const provider = createPaymentHistoryProvider({
      fixedClaims: { sub: "user-payment-sub", paymentCount: 15 }
    });
    const flowStart = provider.startFlow();
    expect(flowStart.url).toContain("payment-history");

    const completedLink = provider.completeFlow(flowStart.state, {
      state: flowStart.state,
      code: "valid-auth-code-123"
    });

    expect(completedLink.provider).toEqual("payment-history");
    expect(completedLink.claims.paymentCount).toEqual(15);

    const proof = linkToProof(completedLink);
    expect(proof.proofId).toEqual(completedLink.proofId);
    expect(proof.oauth).toEqual(true);
  });

  it("acceptance 4: Valid proof is integrated into trust-score (verifyLink raises trust score)", () => {
    const links: TrustLink[] = [];
    const history: TrustHistory = {
      completedRentals: 0,
      polygonDepositActive: false
    };

    // Base score is T0 / 0 points
    let currentScore = computeTrustScore(links, history);
    expect(currentScore.tier).toEqual("T0");
    expect(currentScore.score).toEqual(0);

    // Mock completing flow
    const provider = createPaymentHistoryProvider({
      fixedClaims: { sub: "user-payment-sub", paymentCount: 5 }
    });
    const flowStart = provider.startFlow();
    const completedLink = provider.completeFlow(flowStart.state, {
      state: flowStart.state,
      code: "code"
    });

    const proof = linkToProof(completedLink);

    // Need a verified gov-id first to progress from T0 to higher tiers
    const govIdLink = addLink(links, {
      provider: "gov-id",
      proof: {
        proofId: "gov-id-proof",
        claims: { sub: "user-gov-sub" },
        verifiedAt: new Date().toISOString()
      }
    });
    govIdLink.verified = true;

    // Base score with verified gov-id is T1 / 30 points
    currentScore = computeTrustScore(links, history);
    expect(currentScore.tier).toEqual("T1");
    expect(currentScore.score).toEqual(30);

    // Now link external OAuth proof
    const paymentLink = addLink(links, {
      provider: "payment-history",
      proof: proof
    });

    const verifyRes = verifyLink(paymentLink);
    expect(verifyRes.valid).toEqual(true);

    // Mark as verified
    paymentLink.verified = true;

    // Trust score should raise to T2 / 60 points
    currentScore = computeTrustScore(links, history);
    expect(currentScore.tier).toEqual("T2");
    expect(currentScore.score).toEqual(60);
    expect(currentScore.breakdown.payments).toEqual(30);
  });

  it("acceptance 5: Tampered or invalid proof is rejected during structural verification", () => {
    const links: TrustLink[] = [];

    // Create a proof with missing proofId but OAuth/API typical keys to pass isManualUpload check
    const badProof = {
      claims: { sub: "tampered" },
      verifiedAt: new Date().toISOString()
    };

    const linkWithBadProof = addLink(links, {
      provider: "payment-history",
      proof: badProof
    });

    // verifyLink should report it as invalid
    const verifyRes = verifyLink(linkWithBadProof);
    expect(verifyRes.valid).toEqual(false);
    expect(verifyRes.reason).toContain("missing proofId");

    // Now try manual file upload (which should throw an error in addLink)
    const manualFileProof = {
      proofId: "manual-id",
      claims: { sub: "user" },
      file: "my_id.pdf",
      verifiedAt: new Date().toISOString()
    };

    expect(() => {
      addLink(links, {
        provider: "payment-history",
        proof: manualFileProof
      });
    }).toThrow();
  });
});
