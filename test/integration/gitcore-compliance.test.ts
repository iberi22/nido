import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// NIDO — integration tests for feature: gitcore-compliance
// Contract: .gitcore/ artifacts must exist and be valid (GitCore 3.8.0).

const ROOT = join(__dirname, "..", "..");

describe("gitcore-compliance", () => {
  it("complies with GitCore contract: manifest + features + protocol version", () => {
    expect(existsSync(join(ROOT, ".git-core-protocol-version"))).toBe(true);
    const version = readFileSync(join(ROOT, ".git-core-protocol-version"), "utf8").trim();
    expect(version).toMatch(/^3\.\d+\.\d+/);
    expect(existsSync(join(ROOT, ".gitcore/MANIFEST.json"))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(ROOT, ".gitcore/MANIFEST.json"), "utf8"));
    expect(manifest.schema).toMatch(/gitcore-manifest/);
  });

  it("features.json is valid and has stable + planned features", () => {
    const features = JSON.parse(readFileSync(join(ROOT, ".gitcore/features.json"), "utf8"));
    expect(features.features.length).toBeGreaterThanOrEqual(20);
    const statuses = features.features.map((f: any) => f.status);
    expect(statuses).toContain("stable");
    expect(statuses).toContain("planned");
    // Every feature has an id
    for (const f of features.features) {
      expect(typeof f.id).toBe("string");
      expect(f.id.length).toBeGreaterThan(0);
    }
  });

  it("docs/SRS/REQUIREMENTS.md exists with REQ-IDs", () => {
    const srs = readFileSync(join(ROOT, "docs/SRS/REQUIREMENTS.md"), "utf8");
    const reqs = srs.match(/REQ-\d{3}/g) || [];
    expect(reqs.length).toBeGreaterThanOrEqual(10);
    // No Spanish remains in artifacts (user directive: all docs in English)
    expect(srs).not.toMatch(/Estado: En progreso|Criterios de aceptación/);
  });

  it("AGENTS.md + SRC.md exist (GitCore docs)", () => {
    expect(existsSync(join(ROOT, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(ROOT, "SRC.md"))).toBe(true);
    const agents = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
    expect(agents.length).toBeGreaterThan(100);
  });
});
