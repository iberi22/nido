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
import {
  createPaymentHistoryProvider,
  createReviewHistoryProvider,
  linkToProof,
  verifyProof,
  type Link,
} from "../../src/lib/domain/links";

/** Structural OAuth link proof acceptable to addLink / verifyLink. */
function oauthProof(
  sub: string,
  extraClaims: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    proofId: `proof-${sub}-${Date.now()}`,
    claims: { sub, ...extraClaims },
    verifiedAt: new Date().toISOString(),
    oauth: true,
    accessToken: `tok-${sub}`,
  };
}

describe("US-603: link sessions from other apps to verify my identity - Unit Tests", () => {

  it("acceptance 1: Link providers: gov-ID, payment history, review history, social graph", () => {
    const links: TrustLink[] = [];

    const l1 = addLink(links, { provider: 'gov-id', proof: oauthProof('gov') });
    const l2 = addLink(links, {
      provider: 'payment-history',
      proof: oauthProof('pay', { paymentCount: 3 }),
    });
    const l3 = addLink(links, {
      provider: 'review-history',
      proof: oauthProof('rev', { reviewCount: 2 }),
    });
    const l4 = addLink(links, { provider: 'social-graph', proof: oauthProof('soc') });

    expect(links.length).toBe(4);
    expect(l1.provider).toBe('gov-id');
    expect(l2.provider).toBe('payment-history');
    expect(l3.provider).toBe('review-history');
    expect(l4.provider).toBe('social-graph');
  });

  it("acceptance 2: Each link is an OAuth/API proof, not a manual upload", () => {
    const links: TrustLink[] = [];

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

    const validProof = oauthProof('oauth-user');
    expect(isManualUpload(validProof)).not.toBe(true);
    const added = addLink(links, { provider: 'gov-id', proof: validProof });
    expect(added.verified).not.toBe(true);

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
      {
        id: "1",
        provider: "payment-history",
        proof: oauthProof('p', { paymentCount: 1 }),
        verified: true,
        visible: true,
      }
    ];
    let res = computeTrustScore(links, history);
    expect(res.tier).toBe("T0");
    expect(res.score).toBe(30);

    // Case T1: gov-id verified but no external linked sessions
    const linksT1: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: oauthProof('g'), verified: true, visible: true }
    ];
    res = computeTrustScore(linksT1, history);
    expect(res.tier).toBe("T1");
    expect(res.score).toBe(30);

    // Case T2: gov-id verified + at least 1 external linked session
    const linksT2: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: oauthProof('g'), verified: true, visible: true },
      {
        id: "2",
        provider: "payment-history",
        proof: oauthProof('p', { paymentCount: 2 }),
        verified: true,
        visible: true,
      }
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
      { id: "1", provider: "gov-id", proof: oauthProof('g'), verified: true, visible: true },
      {
        id: "2",
        provider: "payment-history",
        proof: oauthProof('p', { paymentCount: 1 }),
        verified: true,
        visible: true,
      },
      {
        id: "3",
        provider: "review-history",
        proof: oauthProof('r', { reviewCount: 1 }),
        verified: true,
        visible: true,
      }
    ];

    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };
    const res = computeTrustScore(links, history);

    expect(res.breakdown.govId).toBe(30);
    expect(res.breakdown.payments).toBe(30);
    expect(res.breakdown.reviews).toBe(25);
    expect(res.breakdown.social).toBe(0);

    links = setVisibility(links, "payment-history", false);
    expect(links.find(l => l.provider === "payment-history")?.visible).not.toBe(true);
    expect(links.find(l => l.provider === "gov-id")?.visible).toBe(true);
  });

  it("acceptance 5: No single source can inflate score (anti-gaming cap)", () => {
    const links: TrustLink[] = [
      { id: "1", provider: "gov-id", proof: oauthProof('g'), verified: true, visible: true },
      {
        id: "2",
        provider: "payment-history",
        proof: oauthProof('p1', { paymentCount: 1 }),
        verified: true,
        visible: true,
      },
      {
        id: "3",
        provider: "payment-history",
        proof: oauthProof('p2', { paymentCount: 1 }),
        verified: true,
        visible: true,
      },
      {
        id: "4",
        provider: "payment-history",
        proof: oauthProof('p3', { paymentCount: 1 }),
        verified: true,
        visible: true,
      }
    ];

    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };

    const res = computeTrustScore(links, history, { cap: 40 });
    expect(res.breakdown.payments).toBe(40);
    expect(res.score).toBe(70);

    expect(noSingleSourceInflates(res.breakdown, 40)).toBe(true);

    const inflatedBreakdown = { govId: 30, payments: 45, reviews: 10, social: 10 };
    expect(noSingleSourceInflates(inflatedBreakdown, 40)).not.toBe(true);
  });

  it("OAuth LinkProvider startFlow returns URL + crypto state; completeFlow fixed claims", () => {
    const payment = createPaymentHistoryProvider({
      fixedClaims: { sub: 'fixed-pay', paymentCount: 99 },
    });
    const started = payment.startFlow();
    expect(started.url).toContain('payment-history/authorize');
    expect(started.state.length).toBeGreaterThan(8);

    const link = payment.completeFlow(started.state, {
      state: started.state,
      code: 'auth-code-demo',
    });
    expect(link.provider).toBe('payment-history');
    expect(link.claims.paymentCount).toBe(99);
    expect(link.claims.sub).toBe('fixed-pay');
    expect(link.verified).toBe(true);
    expect(link.proofId.length).toBeGreaterThan(0);
    expect(verifyProof(link)).toBe(true);

    expect(() =>
      payment.completeFlow(started.state, { state: 'wrong-state', code: 'x' })
    ).toThrow(/state mismatch/i);

    const review = createReviewHistoryProvider({
      fixedClaims: { sub: 'fixed-rev', reviewCount: 7 },
    });
    const revStart = review.startFlow();
    const revLink = review.completeFlow(revStart.state, {
      state: revStart.state,
      code: 'rev-code',
    });
    expect(revLink.claims.reviewCount).toBe(7);
    expect(review.verifyProof(revLink)).toBe(true);
  });

  it("verifyLink accepts valid proofId structure and rejects missing proofId", () => {
    const valid: TrustLink = {
      id: 'v1',
      provider: 'payment-history',
      proof: oauthProof('ok', { paymentCount: 4 }),
      verified: false,
      visible: true,
    };
    expect(verifyLink(valid).valid).toBe(true);

    const missingProofId: TrustLink = {
      id: 'bad',
      provider: 'payment-history',
      proof: {
        claims: { sub: 'x', paymentCount: 1 },
        verifiedAt: new Date().toISOString(),
        accessToken: 'tok',
      },
      verified: false,
      visible: true,
    };
    const bad = verifyLink(missingProofId);
    expect(bad.valid).not.toBe(true);
    expect(bad.reason).toMatch(/proofId/i);
  });

  it("computeTrustScore excludes unverified links", () => {
    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };
    const links: TrustLink[] = [
      { id: '1', provider: 'gov-id', proof: oauthProof('g'), verified: true, visible: true },
      {
        id: '2',
        provider: 'payment-history',
        proof: oauthProof('p', { paymentCount: 1 }),
        verified: false,
        visible: true,
      },
      {
        id: '3',
        provider: 'review-history',
        proof: oauthProof('r', { reviewCount: 1 }),
        verified: true,
        visible: true,
      },
    ];

    const res = computeTrustScore(links, history);
    // unverified payment-history excluded → gov(30) + reviews(25) = 55, T2 via reviews
    expect(res.score).toBe(55);
    expect(res.breakdown.payments).toBe(0);
    expect(res.breakdown.reviews).toBe(25);
    expect(res.tier).toBe('T2');
  });

  it("linkToProof wires completed OAuth Link into TrustLink verifyLink", () => {
    const provider = createPaymentHistoryProvider({
      fixedClaims: { sub: 'wire', paymentCount: 5 },
    });
    const { state } = provider.startFlow();
    const completed: Link = provider.completeFlow(state, { state, code: 'c1' });
    const proof = linkToProof(completed);

    const links: TrustLink[] = [];
    const trustLink = addLink(links, { provider: 'payment-history', proof });
    expect(verifyLink(trustLink).valid).toBe(true);
    trustLink.verified = true;

    const history: TrustHistory = { completedRentals: 0, polygonDepositActive: false };
    const withGov: TrustLink[] = [
      { id: 'g', provider: 'gov-id', proof: oauthProof('g'), verified: true, visible: true },
      trustLink,
    ];
    expect(computeTrustScore(withGov, history).tier).toBe('T2');
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
