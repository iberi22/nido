import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { floorPlanStore } from "../../src/lib/stores/floorPlanStore.svelte";

// NIDO — unit tests for feature: ui-swal
// User stories under test: US-101
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

// Konva requires real layout; mock it for shell-level tests
vi.mock("konva", () => ({ default: {} }));

describe("US-101: UI shell on @swal/ui (edge-hive theme)", () => {
  it("acceptance 1: @swal/ui is a vendored dependency (no shadcn/Tailwind in src)", () => {
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(Object.keys(pkg.dependencies)).toContain("@swal/ui");
    expect(pkg.dependencies["@swal/ui"]).toMatch(/vendor/);

    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) out.push(...walk(p));
        else if (p.endsWith(".svelte")) out.push(p);
      }
      return out;
    };
    const files = walk("src/lib").filter((f) => !f.includes("/vendor/"));
    for (const f of files) {
      const content = fs.readFileSync(f, "utf8");
      expect(content, `${f} must not use shadcn`).not.toMatch(/shadcn/);
      expect(content, `${f} must not use @tailwind`).not.toMatch(/@tailwind/);
    }
  });

  it("acceptance 2: vendored @swal/ui exports core components", async () => {
    const mod = await import("../../src/lib/vendor/swal-ui/components/index.js");
    expect(mod.Button).toBeTruthy();
    expect(mod.Card).toBeTruthy();
    expect(mod.Badge).toBeTruthy();
    expect(mod.Tabs).toBeTruthy();
    expect(mod.Toaster).toBeTruthy();
  });

  it("acceptance 3: floorPlanStore holds plan state (floors, config, zones)", () => {
    expect(floorPlanStore.floors).toBeDefined();
    expect(floorPlanStore.config).toBeDefined();
    expect(floorPlanStore.config.scale).toBeGreaterThan(0);
    expect(floorPlanStore.config.wallThickness).toBeGreaterThan(0);
  });

  it("acceptance 4: Toolbar component renders tool labels", async () => {
    const { default: Toolbar } = await import("../../src/lib/Toolbar.svelte");
    const { getByText } = render(Toolbar);
    expect(getByText("Select")).toBeTruthy();
    expect(getByText("Measure")).toBeTruthy();
    expect(getByText("Delete")).toBeTruthy();
  });

  it("acceptance 5: FloorSelector exposes property floors", async () => {
    const { default: FloorSelector } = await import("../../src/lib/FloorSelector.svelte");
    const { getByText } = render(FloorSelector);
    expect(getByText(/Floor 1/)).toBeTruthy();
    expect(getByText(/Floor 2/)).toBeTruthy();
  });
});
