import { describe, it, expect } from "vitest";
import {
  addLink,
  verifyLink,
  computeTrustScore,
  setVisibility,
  noSingleSourceInflates,
  isManualUpload,
  type TrustLink,
  type TrustHistory
} from "../../src/lib/domain/trust";

describe("US-603: link sessions from other apps to verify my identity - Unit Tests", () => {

  it("acceptance 1: Link providers: gov-ID, payment history, review history, social graph", () => {
    const links: TrustLink[] = [];
    const oauthProof = { accessToken: "abc-token-123", expires: 3600 };

    const l1 = addLink(links, { provider: 'gov-id', proof: oauthProof });
    const l2 = addLink(links, { provider: 'payment-history', proof: oauthProof });
    const l3 = addLink(links, { provider: 'review-history', proof: oauthProof });
    const l4 = addLink(links, { provider: 'social-graph', proof: oauthProof });

    expect(links.length).toBe(4);
    expect(l1.provider).toBe('gov-id');
    expect(l2.provider).toBe('payment-history');
    expect(l3.provider).toBe('review-history');
    expect(l4.provider).toBe('social-graph');
  });

  it("acceptance 2: Each link is an OAuth/API proof, not a manual upload", () => {
    const links: TrustLink[] = [];

    // Manual uploads should be rejected immediately or detected as manual uploads
    const manualFile1 = "id_scan_v1.png";
    const manualFile2 = "selfie_verification.jpg";
    const manualFile3 = "/usr/uploads/passport.pdf";
    const manualObj = { filepath: "/tmp/doc.pdf", scanDate: Date.now() };

    expect(isManualUpload(manualFile1)).toBe(true);
    expect(isManualUpload(manualFile2)).toBe(true);
    expect(isManualUpload(manualFile3)).toBe(true);
    expect(isManualUpload(manualObj)).toBe(true);

    expect(() => addLink(links, { provider: 'gov-id', proof: manualFile1 })).toThrow();
    expect(() => addLink(links, { provider: 'gov-id', proof: manualObj })).toThrow();

    // Valid OAuth proof should not be rejected
    const validProof = { token: "oauth-jwt-999" };
    expect(isManualUpload(validProof)).toBe(false);
    const added = addLink(links, { provider: 'gov-id', proof: validProof });
    expect(added.verified).toBe(false);

    // Test verifyLink logic
    const verResult = verifyLink(added);
    expect(verResult.valid).toBe(true);
  });

  it("acceptance 3: Trust score T1-T4 computed from links and history", () => {
    const history: TrustHistory = {
      completedRentals: 0,
      polygonDepositActive: false,
    };

    // Case T0: No gov-id
    const links: TrustLink[] = [
      { id: "1", provider: "payment-history", proof: { token: "1" }, verified: true, visible: true }
    ];
    let res = computeTrustScore(links, history);
    expect(res.tier).toBe("T0");
    expect(res.score).toBe(30);

    // Case T1: gov-id verified but no external linked sessions
    const linksT1: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: { token: "1" }, verified: true, visible: true }
    ];
    res = computeTrustScore(linksT1, history);
    expect(res.tier).toBe("T1");
    expect(res.score).toBe(30);

    // Case T2: gov-id verified + at least 1 external linked session
    const linksT2: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: { token: "1" }, verified: true, visible: true },
      { id: "2", provider: "payment-history", proof: { token: "2" }, verified: true, visible: true }
    ];
    res = computeTrustScore(linksT2, history);
    expect(res.tier).toBe("T2");
    expect(res.score).toBe(60);

    // Case T3: T2 + on-network history (>= 3 completed rentals)
    const historyT3: TrustHistory = {
      completedRentals: 4,
      polygonDepositActive: false
    };
    res = computeTrustScore(linksT2, historyT3);
    expect(res.tier).toBe("T3");

    // Case T4: T3 + Polygon deposit active
    const historyT4: TrustHistory = {
      completedRentals: 5,
      polygonDepositActive: true
    };
    res = computeTrustScore(linksT2, historyT4);
    expect(res.tier).toBe("T4");
  });

  it("acceptance 4: Score shown with breakdown; user controls visibility", () => {
    let links: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: { token: "1" }, verified: true, visible: true },
      { id: "2", provider: "payment-history", proof: { token: "2" }, verified: true, visible: true },
      { id: "3", provider: "review-history", proof: { token: "3" }, verified: true, visible: true }
    ];

    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };
    const res = computeTrustScore(links, history);

    // Check breakdown values are assigned correctly
    expect(res.breakdown.govId).toBe(30);
    expect(res.breakdown.payments).toBe(30);
    expect(res.breakdown.reviews).toBe(25);
    expect(res.breakdown.social).toBe(0);

    // Test visibility toggle
    links = setVisibility(links, "payment-history", false);
    expect(links.find(l => l.provider === "payment-history")?.visible).toBe(false);
    expect(links.find(l => l.provider === "gov-id")?.visible).toBe(true);
  });

  it("acceptance 5: No single source can inflate score (anti-gaming cap)", () => {
    const links: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: { token: "1" }, verified: true, visible: true },
      // Multiple payment histories to simulate trying to inflate the score
      { id: "2", provider: "payment-history", proof: { token: "2" }, verified: true, visible: true },
      { id: "3", provider: "payment-history", proof: { token: "3" }, verified: true, visible: true },
      { id: "4", provider: "payment-history", proof: { token: "4" }, verified: true, visible: true }
    ];

    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };

    // With default cap of 40:
    // gov-id contribution: 30
    // payment-history: 3 * 30 = 90, capped to 40
    // Total should be 30 + 40 = 70 (not 30 + 90 = 120)
    const res = computeTrustScore(links, history, { cap: 40 });
    expect(res.breakdown.payments).toBe(40);
    expect(res.score).toBe(70);

    // Test with noSingleSourceInflates helper function
    expect(noSingleSourceInflates(res.breakdown, 40)).toBe(true);

    // If one single source has contribution > 40:
    const inflatedBreakdown = { govId: 30, payments: 45, reviews: 10, social: 10 };
    expect(noSingleSourceInflates(inflatedBreakdown, 40)).toBe(false);
  });

  it("unverified links do not contribute to score or tier", () => {
    const links: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: { token: "1" }, verified: false, visible: true },
      { id: "2", provider: "payment-history", proof: { token: "2" }, verified: false, visible: true }
    ];
    const history: TrustHistory = { completedRentals: 5, polygonDepositActive: true };
    const res = computeTrustScore(links, history);
    expect(res.tier).toBe("T0");
    expect(res.score).toBe(0);
    expect(res.breakdown.govId).toBe(0);
    expect(res.breakdown.payments).toBe(0);
  });

  it("verifyLink rejects manual proofs and accepts OAuth shapes", () => {
    const manualLink: TrustLink = {
      id: "m1",
      provider: "gov-id",
      proof: "passport-scan.png",
      verified: false,
      visible: true
    };
    expect(verifyLink(manualLink).valid).toEqual(false);
    expect(verifyLink(manualLink).reason).toMatch(/manual/i);

    const weakObj: TrustLink = {
      id: "w1",
      provider: "social-graph",
      proof: { note: "hello" },
      verified: false,
      visible: true
    };
    // addLink would reject this; verifyLink still flags missing API keys
    expect(verifyLink(weakObj).valid).toEqual(false);
  });

});
