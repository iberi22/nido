import { describe, it, expect } from "vitest";
import {
  createMeshClient,
  publishPresence,
  authzCheck,
  signWithIdentity,
  sendChatMessage,
} from "../../src/lib/domain/mesh";
import { geohashEncode, isPlanAnchored } from "../../src/lib/domain/discovery";

// NIDO — integration tests for feature: mesh-integration
// User stories under test: US-601
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-601: publish a listing anchored to my floor plan", () => {
  it("acceptance 1: mesh client has isolated namespace per instance", () => {
    const a = createMeshClient("inst-1");
    const b = createMeshClient("inst-2");
    expect(a.namespace).toBe("swal/nido/inst-1");
    expect(b.namespace).toBe("swal/nido/inst-2");
    expect(a.namespace).not.toBe(b.namespace);
  });

  it("acceptance 2: geohash computed from property location (plan anchoring)", () => {
    // Cali, Colombia coords
    const gh = geohashEncode(3.4516, -76.5320, 6);
    expect(gh.length).toBe(6);
    expect(gh).toMatch(/^[0123456789bcdefghjkmnpqrstuvwxyz]+$/);
    // Listing requires plan anchor (anti-scam, REQ-023)
    const listing = { id: "l1", propertyId: "p1", price: 1200000, availability: true, geohash: gh, planAnchor: "1" };
    const property = { id: "p1", floors: [{ id: "1", height_m: 3 }], location: { geohash: gh } };
    expect(isPlanAnchored(listing, property)).toBe(true);
  });

  it("acceptance 3: presence: landlord online indicator", () => {
    const client = createMeshClient("inst-1");
    publishPresence(client, "online");
    expect(client.peers[0].presence).toBe("online");
    publishPresence(client, "offline");
    expect(client.peers[0].presence).toBe("offline");
  });

  it("acceptance 4: authorization is namespace-scoped (REQ-022)", () => {
    const client = createMeshClient("inst-1");
    // Instance owner ('admin') can read and write plans
    expect(authzCheck(client, "plan:read", "admin")).toBe(true);
    expect(authzCheck(client, "plan:write", "admin")).toBe(true);
    // A tenant role can read but NOT write plans
    expect(authzCheck(client, "plan:write", "inquilino")).toBe(false);
    expect(authzCheck(client, "plan:read", "inquilino")).toBe(true);
    // Unknown resource defaults to admin-only
    expect(authzCheck(client, "unknown:resource", "admin")).toBe(true);
  });

  it("acceptance 5: chat message + real ML-DSA-65 signature", () => {
    const client = createMeshClient("inst-1");
    const msg = sendChatMessage(client, "peer-9", "Hola, me interesa el arriendo");
    expect(msg.to).toBe("peer-9");
    expect(msg.text).toContain("interesa");
    expect(msg.id).toBeTruthy();
    const sig = signWithIdentity("payload-data");
    expect(sig).not.toMatch(/^stub-signature:/);
    expect(sig).toMatch(/^[0-9a-f]+$/i);
    expect(sig.length).toBeGreaterThan(64);
  });
});
