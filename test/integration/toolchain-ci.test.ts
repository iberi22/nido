import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// NIDO — integration tests for feature: toolchain-ci
// Contract: test infra configured (vitest/playwright) + scripts wired.

const ROOT = join(__dirname, "..", "..");

describe("toolchain-ci", () => {
  it("vitest + playwright are configured", () => {
    expect(existsSync(join(ROOT, "vitest.config.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "playwright.config.ts"))).toBe(true);
    const vitestCfg = readFileSync(join(ROOT, "vitest.config.ts"), "utf8");
    expect(vitestCfg).toMatch(/jsdom/);
    expect(vitestCfg).toMatch(/svelte/);
    const pwCfg = readFileSync(join(ROOT, "playwright.config.ts"), "utf8");
    expect(pwCfg).toMatch(/testDir/);
  });

  it("package.json has test scripts", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.scripts["test:unit"]).toBe("vitest run test/unit");
    expect(pkg.scripts["test:e2e"]).toBe("playwright test");
    expect(pkg.devDependencies.vitest).toBeTruthy();
    expect(pkg.devDependencies["@playwright/test"]).toBeTruthy();
  });

  it("@swal/ui is the canonical core pinned by commit (unified-core rule)", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.dependencies["@swal/ui"]).toMatch(/^github:iberi22\/swal-ui#[0-9a-f]{7,40}$/);
    expect(existsSync(join(ROOT, "node_modules/@swal/ui/src/components/index.js"))).toBe(true);
  });

  it("no shadcn/Tailwind UI layer in src (UI reference rule)", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps["bits-ui"]).toBeUndefined();
    expect(allDeps["tailwind-merge"]).toBeUndefined();
    expect(allDeps["tailwindcss"]).toBeUndefined();
  });
});
