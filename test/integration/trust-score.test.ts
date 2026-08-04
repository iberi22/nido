import { describe, it, expect } from "vitest";
import {
  addLink,
  verifyLink,
  computeTrustScore,
  setVisibility,
  type TrustLink,
  type TrustHistory,
} from "../../src/lib/domain/trust";
import {
  createPaymentHistoryProvider,
  createReviewHistoryProvider,
  linkToProof,
} from "../../src/lib/domain/links";

function oauthProof(
  sub: string,
  extraClaims: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    proofId: `proof-${sub}`,
    claims: { sub, ...extraClaims },
    verifiedAt: new Date().toISOString(),
    oauth: true,
    accessToken: `tok-${sub}`,
  };
}

describe("US-603: link sessions from other apps to verify my identity - Integration Tests", () => {

  it("acceptance 1: Full integration flow of adding, verifying, and scoring a user", () => {
    const links: TrustLink[] = [];
    const history: TrustHistory = {
      completedRentals: 0,
      polygonDepositActive: false,
    };

    let res = computeTrustScore(links, history);
    expect(res.tier).toBe("T0");
    expect(res.score).toBe(0);

    const govIdLink = addLink(links, {
      provider: "gov-id",
      proof: oauthProof("gov-auth"),
    });

    const verifyGov = verifyLink(govIdLink);
    expect(verifyGov.valid).toBe(true);
    govIdLink.verified = true;

    res = computeTrustScore(links, history);
    expect(res.tier).toBe("T1");
    expect(res.score).toBe(30);

    const socialLink = addLink(links, {
      provider: "social-graph",
      proof: oauthProof("social-user"),
    });
    const verifySocial = verifyLink(socialLink);
    expect(verifySocial.valid).toBe(true);
    socialLink.verified = true;

    res = computeTrustScore(links, history);
    expect(res.tier).toBe("T2");
    expect(res.score).toBe(45);

    const historyWithRentals: TrustHistory = {
      completedRentals: 3,
      polygonDepositActive: false,
    };
    res = computeTrustScore(links, historyWithRentals);
    expect(res.tier).toBe("T3");

    const historyWithDeposit: TrustHistory = {
      completedRentals: 3,
      polygonDepositActive: true,
    };
    res = computeTrustScore(links, historyWithDeposit);
    expect(res.tier).toBe("T4");
    expect(res.score).toBe(45);
  });

  it("acceptance 2: Multi-source anti-gaming verification and visibility controls in dynamic workflow", () => {
    let links: TrustLink[] = [];
    const history: TrustHistory = {
      completedRentals: 4,
      polygonDepositActive: true,
    };

    const lGov = addLink(links, { provider: "gov-id", proof: oauthProof("abc") });
    lGov.verified = true;

    for (let i = 0; i < 5; i++) {
      const lPay = addLink(links, {
        provider: "payment-history",
        proof: oauthProof(`pay-${i}`, { paymentCount: i + 1 }),
      });
      lPay.verified = true;
    }

    const lReview = addLink(links, {
      provider: "review-history",
      proof: oauthProof("review-abc", { reviewCount: 3 }),
    });
    lReview.verified = true;

    const res = computeTrustScore(links, history, { cap: 40 });

    expect(res.breakdown.govId).toBe(30);
    expect(res.breakdown.payments).toBe(40);
    expect(res.breakdown.reviews).toBe(25);
    expect(res.score).toBe(95);
    expect(res.tier).toBe("T4");

    links = setVisibility(links, "review-history", false);
    expect(links.find(l => l.provider === "review-history")?.visible).not.toBe(true);

    const hiddenReview = links.find(l => l.provider === "review-history");
    expect(hiddenReview).toBeDefined();
    expect(hiddenReview?.visible).not.toBe(true);
  });

  it("mock OAuth provider flow: payment + review completeFlow then score uses verified only", () => {
    const links: TrustLink[] = [];
    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };

    const gov = addLink(links, { provider: "gov-id", proof: oauthProof("gov") });
    expect(verifyLink(gov).valid).toBe(true);
    gov.verified = true;

    const payProvider = createPaymentHistoryProvider({
      fixedClaims: { sub: "mock-pay", paymentCount: 10 },
    });
    const payStart = payProvider.startFlow();
    expect(payStart.url.length).toBeGreaterThan(0);
    const payLink = payProvider.completeFlow(payStart.state, {
      state: payStart.state,
      code: "pay-code",
    });
    const payTrust = addLink(links, {
      provider: "payment-history",
      proof: linkToProof(payLink),
    });
    expect(verifyLink(payTrust).valid).toBe(true);
    // Leave unverified — must not inflate score
    expect(payTrust.verified).not.toBe(true);

    const revProvider = createReviewHistoryProvider({
      fixedClaims: { sub: "mock-rev", reviewCount: 4 },
    });
    const revStart = revProvider.startFlow();
    const revLink = revProvider.completeFlow(revStart.state, {
      state: revStart.state,
      code: "rev-code",
    });
    const revTrust = addLink(links, {
      provider: "review-history",
      proof: linkToProof(revLink),
    });
    expect(verifyLink(revTrust).valid).toBe(true);
    revTrust.verified = true;

    const scored = computeTrustScore(links, history);
    // verified: gov(30) + review(25); unverified payment excluded
    expect(scored.score).toBe(55);
    expect(scored.breakdown.payments).toBe(0);
    expect(scored.tier).toBe("T2");

    payTrust.verified = true;
    const afterPay = computeTrustScore(links, history);
    expect(afterPay.score).toBe(85);
    expect(afterPay.breakdown.payments).toBe(30);
  });
});
