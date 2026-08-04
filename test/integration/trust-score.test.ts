import { describe, it, expect } from "vitest";
import {
  addLink,
  verifyLink,
  computeTrustScore,
  setVisibility,
  type TrustLink,
  type TrustHistory,
  type TrustProvider
} from "../../src/lib/domain/trust";

describe("US-603: link sessions from other apps to verify my identity - Integration Tests", () => {

  it("acceptance 1: Full integration flow of adding, verifying, and scoring a user", () => {
    let links: TrustLink[] = [];
    const history: TrustHistory = {
      completedRentals: 0,
      polygonDepositActive: false,
    };

    // 1. Initial State: No verification, should be T0
    let res = computeTrustScore(links, history);
    expect(res.tier).toBe("T0");
    expect(res.score).toBe(0);

    // 2. Add gov-id with API proof
    const govIdLink = addLink(links, {
      provider: "gov-id",
      proof: { oauthToken: "gov-auth-secret-token-777" },
    });

    // Verify link status should be true
    const verifyGov = verifyLink(govIdLink);
    expect(verifyGov.valid).toBe(true);
    govIdLink.verified = true;

    // With verified gov-id, tier should become T1
    res = computeTrustScore(links, history);
    expect(res.tier).toBe("T1");
    expect(res.score).toBe(30);

    // 3. Link an external social session
    const socialLink = addLink(links, {
      provider: "social-graph",
      proof: { oauth_signature: "social-sig-12345" },
    });
    const verifySocial = verifyLink(socialLink);
    expect(verifySocial.valid).toBe(true);
    socialLink.verified = true;

    // With external session, tier should become T2
    res = computeTrustScore(links, history);
    expect(res.tier).toBe("T2");
    expect(res.score).toBe(45); // gov-id (30) + social (15)

    // 4. Update on-network history (simulate N rental completions)
    const historyWithRentals: TrustHistory = {
      completedRentals: 3, // N = 3 is threshold
      polygonDepositActive: false,
    };

    // Tier should progress to T3
    res = computeTrustScore(links, historyWithRentals);
    expect(res.tier).toBe("T3");

    // 5. User locks Polygon deposit/collateral
    const historyWithDeposit: TrustHistory = {
      completedRentals: 3,
      polygonDepositActive: true,
    };

    // Tier should progress to T4
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

    // User adds gov-id
    const lGov = addLink(links, { provider: "gov-id", proof: { token: "abc" } });
    lGov.verified = true;

    // User tries to inflate with 5 payment histories
    for (let i = 0; i < 5; i++) {
      const lPay = addLink(links, { provider: "payment-history", proof: { token: `pay-${i}` } });
      lPay.verified = true;
    }

    // User adds a review-history link
    const lReview = addLink(links, { provider: "review-history", proof: { token: "review-abc" } });
    lReview.verified = true;

    // Compute trust score with a cap of 40 per category
    let res = computeTrustScore(links, history, { cap: 40 });

    // Breakdown expectations:
    // gov-id: 30
    // payments: 5 * 30 = 150, capped at 40
    // reviews: 25
    // Total score = 30 + 40 + 25 = 95
    expect(res.breakdown.govId).toBe(30);
    expect(res.breakdown.payments).toBe(40); // successfully capped
    expect(res.breakdown.reviews).toBe(25);
    expect(res.score).toBe(95);
    expect(res.tier).toBe("T4"); // Meets all conditions for T4

    // Now test visibility control - if we hide reviews, reviews should still be calculated
    // since visible = false is a frontend visibility control, but wait!
    // Visibility control allows hiding individual proof cards from the UI list.
    links = setVisibility(links, "review-history", false);
    expect(links.find(l => l.provider === "review-history")?.visible).toBe(false);

    // Score calculations should remain correct for internal trust score computation,
    // or does hidden links hide them from being calculated? Let's check REQ-024.
    // REQ-024 says "user controls visibility" / "privacy control", meaning visible links are shared/shown.
    // Let's verify our list still has the hidden review provider links marked visible = false.
    const hiddenReview = links.find(l => l.provider === "review-history");
    expect(hiddenReview).toBeDefined();
    expect(hiddenReview?.visible).toEqual(false);

    // Visibility is UI privacy only — score/tier still include verified hidden links
    const afterHide = computeTrustScore(links, history, { cap: 40 });
    expect(afterHide.breakdown.reviews).toBe(25);
    expect(afterHide.score).toBe(95);
    expect(afterHide.tier).toBe("T4");
  });

  it("acceptance 3: rejecting manual proof mid-flow keeps tier at T0", () => {
    const links: TrustLink[] = [];
    expect(() =>
      addLink(links, { provider: "gov-id", proof: "cedula-scan.pdf" })
    ).toThrow(/Manual upload/);
    expect(links).toHaveLength(0);

    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };
    const res = computeTrustScore(links, history);
    expect(res.tier).toBe("T0");
    expect(res.score).toBe(0);
  });
});
