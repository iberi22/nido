// GPS Proximity Discovery — geohash neighbors, radius filter, plan-anchored listings
// NIDO — Feature: p2p-discovery (US-601, US-602, REQ-023)

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface LocationConsentResult {
  granted: boolean;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  error?: string;
}

export interface Listing {
  id: string;
  propertyId: string;
  landlordId?: string;
  price: number;
  availability: boolean;
  geohash: string;
  planAnchor: string;
}

/**
 * Wraps coordinate longitude value to ensure it falls within [-180, 180].
 */
function wrapLng(lng: number): number {
  let w = lng;
  while (w > 180) w -= 360;
  while (w < -180) w += 360;
  return w;
}

/**
 * Clamps coordinate latitude value to [-90, 90].
 */
function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

/**
 * Encodes latitude and longitude into a geohash string of the specified precision.
 */
export function geohashEncode(lat: number, lng: number, precision: number = 9): string {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let geohash = '';
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (bit % 2 === 0) {
      // Longitude (even bits)
      const mid = (lngMin + lngMax) / 2;
      if (lng > mid) {
        ch |= (1 << (4 - (bit % 5)));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      // Latitude (odd bits)
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        ch |= (1 << (4 - (bit % 5)));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    bit++;
    if (bit % 5 === 0) {
      geohash += BASE32[ch];
      ch = 0;
    }
  }

  return geohash;
}

export interface GeohashDecoded {
  lat: number;
  lng: number;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/**
 * Decodes a geohash string into its center coordinate and bounding box limits.
 */
export function geohashDecode(geohash: string): GeohashDecoded {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;

  let isEven = true;
  for (let i = 0; i < geohash.length; i++) {
    const c = geohash[i];
    const val = BASE32.indexOf(c);
    if (val === -1) {
      throw new Error(`Invalid geohash character: ${c}`);
    }

    for (let mask = 16; mask > 0; mask >>= 1) {
      if (isEven) {
        const mid = (lngMin + lngMax) / 2;
        if ((val & mask) !== 0) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if ((val & mask) !== 0) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
    latMin,
    latMax,
    lngMin,
    lngMax,
  };
}

/**
 * Returns 8 adjacent geohashes for radius/proximity queries.
 */
export function neighbors(geohash: string): string[] {
  const decoded = geohashDecode(geohash);
  const precision = geohash.length;
  const latHeight = decoded.latMax - decoded.latMin;
  const lngWidth = decoded.lngMax - decoded.lngMin;

  const lat = decoded.lat;
  const lng = decoded.lng;

  const dirs = [
    { dLat: 1, dLng: 0 },   // North
    { dLat: -1, dLng: 0 },  // South
    { dLat: 0, dLng: 1 },   // East
    { dLat: 0, dLng: -1 },  // West
    { dLat: 1, dLng: 1 },   // North-East
    { dLat: 1, dLng: -1 },  // North-West
    { dLat: -1, dLng: 1 },  // South-East
    { dLat: -1, dLng: -1 }  // South-West
  ];

  return dirs.map(dir => {
    const neighborLat = clampLat(lat + dir.dLat * latHeight);
    const neighborLng = wrapLng(lng + dir.dLng * lngWidth);
    return geohashEncode(neighborLat, neighborLng, precision);
  });
}

/**
 * Maps radius in meters to an appropriate geohash precision/prefix length.
 */
export function radiusToPrecision(radius: number): number {
  if (radius >= 150000) return 3; // ~156km
  if (radius >= 39000) return 4;  // ~39km
  if (radius >= 4900) return 5;   // ~4.9km
  if (radius >= 1200) return 6;   // ~1.2km
  if (radius >= 150) return 7;    // ~150m
  if (radius >= 38) return 8;     // ~38m
  return 9;                       // ~4.8m
}

/**
 * Filters listings in the authorized network radius by geohash prefix match.
 * Includes center prefix and its 8 neighbor prefixes to eliminate edge-boundary issues.
 */
export function listingsInRadius(listings: Listing[], myGeohash: string, radius: number): Listing[] {
  const precision = radiusToPrecision(radius);
  const centerPrefix = myGeohash.substring(0, precision);
  const neighborPrefixes = neighbors(centerPrefix);
  const allowedPrefixes = new Set([centerPrefix, ...neighborPrefixes]);

  return listings.filter(listing => {
    if (!listing.geohash) return false;
    const listingPrefix = listing.geohash.substring(0, precision);
    return allowedPrefixes.has(listingPrefix);
  });
}

/**
 * Computes Haversine distance between two latitude and longitude points in meters.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Sorts listings primarily by distance ascending, and secondarily by trust scores descending.
 */
export function sortByDistanceAndTrust(
  listings: Listing[],
  myLoc: { lat: number; lng: number } | string,
  trustScores: Record<string, number>
): Listing[] {
  let center: { lat: number; lng: number };
  if (typeof myLoc === 'string') {
    const decoded = geohashDecode(myLoc);
    center = { lat: decoded.lat, lng: decoded.lng };
  } else {
    center = myLoc;
  }

  const withScores = listings.map(listing => {
    let distance = Infinity;
    if (listing.geohash) {
      try {
        const decoded = geohashDecode(listing.geohash);
        distance = haversineDistance(center.lat, center.lng, decoded.lat, decoded.lng);
      } catch (e) {
        // ignore invalid geohashes
      }
    }

    const trust = trustScores[listing.landlordId || ''] ?? trustScores[listing.id] ?? 0;
    return { listing, distance, trust };
  });

  withScores.sort((a, b) => {
    if (Math.abs(a.distance - b.distance) < 0.1) { // identical or extremely close
      return b.trust - a.trust;
    }
    return a.distance - b.distance;
  });

  return withScores.map(w => w.listing);
}

/**
 * REQ-023 / Anti-scam: Validates that a listing is anchored to a real property plan.
 * Checks that the listing refers to the property, the property has floor plans,
 * the listing points to a valid plan anchor (floor or room id), and the geohashes match.
 */
export function isPlanAnchored(listing: Listing, property: any): boolean {
  if (!listing || !property) return false;

  // 1. Must refer to the same property ID
  if (listing.propertyId !== property.id) return false;

  // 2. Property must have floor plans defined
  if (!property.floors || property.floors.length === 0) return false;

  // 3. Must have a valid planAnchor
  if (!listing.planAnchor) return false;

  // 4. Must match floor or room inside that property
  const hasFloor = property.floors.some((f: any) => f.id === listing.planAnchor || f.ref === listing.planAnchor);
  const hasRoom = property.rooms ? property.rooms.some((r: any) => r.id === listing.planAnchor) : false;

  if (!hasFloor && !hasRoom) return false;

  // 5. Geohash match (no spoofed/fake listings)
  if (listing.geohash !== property.location?.geohash) return false;

  return true;
}

/**
 * Requests location consent from the user via the browser geolocation API.
 */
export function requestLocationConsent(options?: PositionOptions): Promise<LocationConsentResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ granted: false, error: 'Geolocation not supported' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          granted: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
      },
      (error) => {
        resolve({
          granted: false,
          error: error.message,
        });
      },
      options
    );
  });
}
