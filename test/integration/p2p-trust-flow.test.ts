import { describe, it, expect } from "vitest";
import {
  geohashEncode,
  listingsInRadius,
  sortByDistanceAndTrust,
  type Listing
} from "../../src/lib/domain/discovery";
import {
  addLink,
  verifyLink,
  computeTrustScore,
  type TrustLink,
  type TrustHistory
} from "../../src/lib/domain/trust";

function createOauthProof(
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

describe("P2P GPS Discovery and Verified Trust Score - Integration Tests", () => {
  // Test 1: geohash radius query returns listings
  it("should return nearby listings within a specified geohash radius", () => {
    const myGeohash = "d6w8qz"; // Bogotá center

    const listings: Listing[] = [
      {
        id: "listing-near-1",
        propertyId: "prop-1",
        landlordId: "landlord-1",
        price: 1200,
        availability: true,
        geohash: "d6w8qz", // same geohash
        planAnchor: "floor-1"
      },
      {
        id: "listing-near-2",
        propertyId: "prop-2",
        landlordId: "landlord-2",
        price: 1500,
        availability: true,
        geohash: "d6w8qy", // adjacent neighbor geohash
        planAnchor: "floor-1"
      },
      {
        id: "listing-far-3",
        propertyId: "prop-3",
        landlordId: "landlord-3",
        price: 1800,
        availability: true,
        geohash: "d6w2bc", // far away geohash
        planAnchor: "floor-1"
      }
    ];

    // precision for 1200m is 6 characters
    const results = listingsInRadius(listings, myGeohash, 1200);

    expect(results).toHaveLength(2);
    const ids = results.map(r => r.id);
    expect(ids).toContain("listing-near-1");
    expect(ids).toContain("listing-near-2");
    expect(ids).not.toContain("listing-far-3");
  });

  // Test 2: same query FILTERS OUT listings whose landlord trust < threshold
  it("should filter out listings whose landlord's trust score is below the threshold", () => {
    const myGeohash = "d6w8qz";
    const listings: Listing[] = [
      {
        id: "listing-near-1",
        propertyId: "prop-1",
        landlordId: "landlord-1",
        price: 1200,
        availability: true,
        geohash: "d6w8qz",
        planAnchor: "floor-1"
      },
      {
        id: "listing-near-2",
        propertyId: "prop-2",
        landlordId: "landlord-2",
        price: 1500,
        availability: true,
        geohash: "d6w8qy",
        planAnchor: "floor-1"
      }
    ];

    // Landlord 1 is trusted (trust score 45), Landlord 2 is not (trust score 0)
    const trustScores: Record<string, number> = {
      "landlord-1": 45,
      "landlord-2": 15
    };

    const inRadius = listingsInRadius(listings, myGeohash, 1200);
    const trustThreshold = 30;

    const trustFiltered = inRadius.filter(listing => {
      const landlordScore = trustScores[listing.landlordId || ""] ?? 0;
      return landlordScore >= trustThreshold;
    });

    expect(trustFiltered).toHaveLength(1);
    expect(trustFiltered[0].id).toBe("listing-near-1");
  });

  // Test 3: verified link raises trust and moves above threshold
  it("should demonstrate that adding and verifying a valid link raises trust, allowing the listing to pass the filter", () => {
    const myGeohash = "d6w8qz";
    const listings: Listing[] = [
      {
        id: "listing-near-1",
        propertyId: "prop-1",
        landlordId: "landlord-1",
        price: 1200,
        availability: true,
        geohash: "d6w8qz",
        planAnchor: "floor-1"
      }
    ];

    const trustThreshold = 30;
    const history: TrustHistory = {
      completedRentals: 0,
      polygonDepositActive: false
    };

    // Initialize empty links for landlord-1
    const landlordLinks: TrustLink[] = [];

    // Score initially is 0 (T0), below threshold
    let scoreRes = computeTrustScore(landlordLinks, history);
    expect(scoreRes.score).toBe(0);
    expect(scoreRes.tier).toBe("T0");

    let trustScores: Record<string, number> = {
      "landlord-1": scoreRes.score
    };

    let trustFiltered = listingsInRadius(listings, myGeohash, 1200).filter(l => {
      const score = trustScores[l.landlordId || ""] ?? 0;
      return score >= trustThreshold;
    });
    expect(trustFiltered).toHaveLength(0);

    // Now, add and verify a gov-id link to raise landlord's trust
    const govIdLink = addLink(landlordLinks, {
      provider: "gov-id",
      proof: createOauthProof("gov-auth-landlord")
    });

    const verification = verifyLink(govIdLink);
    expect(verification.valid).toBe(true);
    govIdLink.verified = true;

    // Recalculate score (should be 30, T1)
    scoreRes = computeTrustScore(landlordLinks, history);
    expect(scoreRes.score).toBe(30);
    expect(scoreRes.tier).toBe("T1");

    trustScores["landlord-1"] = scoreRes.score;

    trustFiltered = listingsInRadius(listings, myGeohash, 1200).filter(l => {
      const score = trustScores[l.landlordId || ""] ?? 0;
      return score >= trustThreshold;
    });

    expect(trustFiltered).toHaveLength(1);
    expect(trustFiltered[0].id).toBe("listing-near-1");
  });

  // Test 4: manual-upload-only accounts stay below threshold
  it("should reject manual upload attempts or keep unverified accounts below the trust threshold", () => {
    const landlordLinks: TrustLink[] = [];

    // Attempting to add manual upload proof should throw error
    const addManualCall = () => {
      addLink(landlordLinks, {
        provider: "gov-id",
        proof: "path/to/selfie_document.png"
      });
    };

    expect(addManualCall).toThrow(/Manual upload is rejected/);

    // If we have an unverified link or an empty links list, trust score stays at 0 (T0)
    const history: TrustHistory = {
      completedRentals: 0,
      polygonDepositActive: false
    };

    const scoreRes = computeTrustScore(landlordLinks, history);
    expect(scoreRes.score).toBe(0);
    expect(scoreRes.tier).toBe("T0");

    const trustThreshold = 30;
    expect(scoreRes.score).toBeLessThan(trustThreshold);
  });

  // Test 5: distance sorting respects trust tiebreak
  it("should sort listings by distance and respect trust score as a tie-breaker when distances are identical", () => {
    const myLoc = { lat: 4.710988, lng: -74.072092 }; // Bogotá Center

    const identicalGeohash = geohashEncode(4.711, -74.072, 9);

    const listings: Listing[] = [
      {
        id: "listing-A",
        propertyId: "pA",
        landlordId: "landlord-A",
        price: 1000,
        availability: true,
        geohash: identicalGeohash,
        planAnchor: "floor-1"
      },
      {
        id: "listing-B",
        propertyId: "pB",
        landlordId: "landlord-B",
        price: 1100,
        availability: true,
        geohash: identicalGeohash,
        planAnchor: "floor-1"
      }
    ];

    // Landlord B has higher trust score than landlord A
    const trustScores = {
      "landlord-A": 30,
      "landlord-B": 95
    };

    const sorted = sortByDistanceAndTrust(listings, myLoc, trustScores);

    expect(sorted).toHaveLength(2);
    // Listing B must come first because Landlord B has higher trust score
    expect(sorted[0].id).toBe("listing-B");
    expect(sorted[1].id).toBe("listing-A");
  });
});
