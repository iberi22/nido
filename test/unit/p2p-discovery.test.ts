import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  geohashEncode,
  geohashDecode,
  neighbors,
  radiusToPrecision,
  listingsInRadius,
  haversineDistance,
  sortByDistanceAndTrust,
  isPlanAnchored,
  requestLocationConsent,
  type Listing
} from "../../src/lib/domain/discovery";

// NIDO — unit tests for feature: p2p-discovery
// User stories under test: US-601, US-602
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("Geohash Encoding and Decoding", () => {
  it("should encode and decode coordinates correctly at different precisions", () => {
    const lat = 4.710988; // Bogotá coordinates
    const lng = -74.072092;
    const precision = 9;

    const hash = geohashEncode(lat, lng, precision);
    expect(hash).toBeTypeOf("string");
    expect(hash.length).toBe(precision);

    const decoded = geohashDecode(hash);
    expect(decoded.lat).toBeCloseTo(lat, 0.01);
    expect(decoded.lng).toBeCloseTo(lng, 0.01);
    expect(decoded.latMin).toBeLessThanOrEqual(decoded.lat);
    expect(decoded.latMax).toBeGreaterThanOrEqual(decoded.lat);
  });

  it("should throw error for invalid characters when decoding", () => {
    expect(() => geohashDecode("invalid#char")).toThrow();
  });
});

describe("Geohash Neighbors", () => {
  it("should return exactly 8 unique neighbors", () => {
    const hash = "d6w8";
    const result = neighbors(hash);
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(8);

    // Ensure all neighbors are unique
    const unique = new Set(result);
    expect(unique.size).toBe(8);

    // Neighbors must have the same precision/length
    result.forEach((n) => {
      expect(n.length).toBe(hash.length);
    });
  });

  it("should handle boundary wrapping of longitude and latitude", () => {
    // Extreme point: near North Pole (lat 89.99), Date Line (lng 179.99)
    const poleHash = geohashEncode(89.99, 179.99, 6);
    const result = neighbors(poleHash);
    expect(result).toHaveLength(8);
  });
});

describe("US-601: publish a listing anchored to my floor plan", () => {
  const property = {
    id: "prop-123",
    name: "Bogota Loft",
    type: "apartment" as const,
    location: {
      city: "Bogotá",
      comuna: "Usaquén",
      estrato: 4,
      geohash: "d6w8qz"
    },
    floors: [
      { id: "floor-1", name: "1st Floor", zones: [] }
    ],
    rooms: [
      { id: "room-101", floorId: "floor-1", name: "Main room" }
    ],
    items: []
  };

  it("acceptance 1: Listing matches property, floor plan reference, price, availability", () => {
    const validListing: Listing = {
      id: "listing-abc",
      propertyId: "prop-123",
      price: 1500000,
      availability: true,
      geohash: "d6w8qz",
      planAnchor: "floor-1"
    };

    expect(isPlanAnchored(validListing, property)).toBe(true);
  });

  it("acceptance 2: Geohash validation prevents fake listings without plan anchor or geohash match (REQ-023)", () => {
    const fakeGeohashListing: Listing = {
      id: "listing-fake",
      propertyId: "prop-123",
      price: 1500000,
      availability: true,
      geohash: "d6w8qy", // mismatching geohash
      planAnchor: "floor-1"
    };

    const fakeAnchorListing: Listing = {
      id: "listing-fake-2",
      propertyId: "prop-123",
      price: 1500000,
      availability: true,
      geohash: "d6w8qz",
      planAnchor: "non-existent-floor" // invalid anchor
    };

    expect(isPlanAnchored(fakeGeohashListing, property)).toBeFalsy();
    expect(isPlanAnchored(fakeAnchorListing, property)).toBeFalsy();
  });
});

describe("US-602: discover listings near me by GPS", () => {
  const myGeohash = "d6w8qz"; // Center prefix

  const listings: Listing[] = [
    {
      id: "list-1",
      propertyId: "p1",
      price: 100,
      availability: true,
      geohash: "d6w8qz", // same geohash
      planAnchor: "f1"
    },
    {
      id: "list-2",
      propertyId: "p2",
      price: 200,
      availability: true,
      geohash: "d6w8qy", // adjacent neighbor (South)
      planAnchor: "f1"
    },
    {
      id: "list-3",
      propertyId: "p3",
      price: 300,
      availability: true,
      geohash: "d6w8rp", // adjacent neighbor (East)
      planAnchor: "f1"
    },
    {
      id: "list-far",
      propertyId: "pf",
      price: 500,
      availability: true,
      geohash: "d6w2bc", // far away geohash
      planAnchor: "ff"
    }
  ];

  it("acceptance 1: GPS permission requested with consent", async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 4.7109,
            longitude: -74.072,
            accuracy: 10
          }
        });
      })
    };

    vi.stubGlobal("navigator", {
      geolocation: mockGeolocation
    });

    const result = await requestLocationConsent();
    expect(result.granted).toBe(true);
    expect(result.coords?.latitude).toBe(4.7109);
    expect(result.coords?.longitude).toBe(-74.072);

    vi.unstubAllGlobals();
  });

  it("acceptance 2: Geolocation fallback handles rejection or unsupported API", async () => {
    vi.stubGlobal("navigator", {});
    const result = await requestLocationConsent();
    expect(result.granted).toBeFalsy();
    expect(result.error).toBeDefined();

    vi.unstubAllGlobals();
  });

  it("acceptance 3: Listings within radius are filtered by geohash neighbors", () => {
    // 1200 meters maps to Precision 6 (6 chars)
    const filtered = listingsInRadius(listings, myGeohash, 1200);

    // Far listing 'list-far' should be filtered out
    expect(filtered).toHaveLength(3);
    const ids = filtered.map(l => l.id);
    expect(ids).toContain("list-1");
    expect(ids).toContain("list-2");
    expect(ids).toContain("list-3");
    expect(ids).not.toContain("list-far");
  });

  it("acceptance 4: Radius maps to correct precision length", () => {
    expect(radiusToPrecision(200000)).toBe(3);
    expect(radiusToPrecision(40000)).toBe(4);
    expect(radiusToPrecision(5000)).toBe(5);
    expect(radiusToPrecision(1200)).toBe(6);
    expect(radiusToPrecision(150)).toBe(7);
    expect(radiusToPrecision(38)).toBe(8);
    expect(radiusToPrecision(5)).toBe(9);
  });

  it("acceptance 5: Sort by distance and trust score correctly", () => {
    // Center point coordinates (Bogota)
    const myLoc = { lat: 4.710988, lng: -74.072092 };

    // We have three listings in BOG
    // Let's explicitly define their geohashes and simulate trust scores
    const bogListings: Listing[] = [
      {
        id: "list-A",
        propertyId: "pA",
        landlordId: "landlord-A",
        price: 100,
        availability: true,
        geohash: geohashEncode(4.711, -74.072, 9), // very close ~11 meters
        planAnchor: "fA"
      },
      {
        id: "list-B",
        propertyId: "pB",
        landlordId: "landlord-B",
        price: 150,
        availability: true,
        geohash: geohashEncode(4.711, -74.072, 9), // identical distance
        planAnchor: "fB"
      },
      {
        id: "list-C",
        propertyId: "pC",
        landlordId: "landlord-C",
        price: 200,
        availability: true,
        geohash: geohashEncode(4.715, -74.072, 9), // further away
        planAnchor: "fC"
      }
    ];

    const trustScores = {
      "landlord-A": 85,
      "landlord-B": 95, // Higher trust than landlord-A
      "landlord-C": 99
    };

    const sorted = sortByDistanceAndTrust(bogListings, myLoc, trustScores);

    expect(sorted).toHaveLength(3);
    // Since B is at the same distance as A but has higher trust, B must come first
    expect(sorted[0].id).toBe("list-B");
    expect(sorted[1].id).toBe("list-A");
    expect(sorted[2].id).toBe("list-C"); // C is further away despite high trust
  });
});
