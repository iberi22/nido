import { describe, it, expect } from "vitest";
import { buildExtrusion, parseColorToHexAndOpacity } from "../../src/lib/three-extrusion";

describe("plans-3d-extrusion: Pure math builder for 3D real wall & zone extrusion", () => {
  it("Test 1: should return empty array for empty floor / components list", () => {
    const result = buildExtrusion([], 2.8, 6, 26, 0.15);
    expect(result.length).toEqual(0);
  });

  it("Test 2: should correctly extrude a horizontal wall segment", () => {
    const components = [
      {
        id: "wall-horizontal",
        type: "wall",
        x: 0,
        y: 0,
        layer: "structure",
        properties: {
          x1: 0,
          y1: 0,
          x2: 6,
          y2: 0,
          thickness: 0.15
        }
      }
    ];

    const floorHeight = 4.0;
    const plotWidth = 6;
    const plotHeight = 26;

    // Midpoint = (3, 0). Offset = (-3, -13).
    // Expected position = (0, 2.0, -13)
    const result = buildExtrusion(components, floorHeight, plotWidth, plotHeight, 0.15);
    expect(result.length).toEqual(1);

    const wall = result[0];
    expect(wall.id).toEqual("wall-horizontal");
    expect(wall.type).toEqual("wall");
    expect(wall.position.x).toEqual(0); // 3 + (-3)
    expect(wall.position.y).toEqual(2.0); // 4 / 2
    expect(wall.position.z).toEqual(-13); // 0 + (-13)
    expect(wall.dimensions.width).toEqual(6); // hypot(6, 0)
    expect(wall.dimensions.height).toEqual(4.0);
    expect(wall.dimensions.depth).toEqual(0.15);
    expect(wall.rotationY).toEqual(-0); // atan2(0, 6)
  });

  it("Test 3: should correctly extrude a vertical wall segment", () => {
    const components = [
      {
        id: "wall-vertical",
        type: "wall",
        x: 2.5,
        y: 0,
        layer: "structure",
        properties: {
          x1: 2.5,
          y1: 0,
          x2: 2.5,
          y2: 6,
          thickness: 0.15
        }
      }
    ];

    const floorHeight = 4.0;
    const plotWidth = 6;
    const plotHeight = 26;

    // Midpoint = (2.5, 3). Offset = (-3, -13).
    // Expected position = (-0.5, 2.0, -10)
    // Angle = atan2(6, 0) = PI / 2. RotationY = -PI / 2
    const result = buildExtrusion(components, floorHeight, plotWidth, plotHeight, 0.15);
    expect(result.length).toEqual(1);

    const wall = result[0];
    expect(wall.id).toEqual("wall-vertical");
    expect(wall.position.x).toEqual(-0.5); // 2.5 - 3
    expect(wall.position.y).toEqual(2.0);
    expect(wall.position.z).toEqual(-10); // 3 - 13
    expect(wall.dimensions.width).toEqual(6); // length of wall
    expect(wall.dimensions.depth).toEqual(0.15);
    expect(wall.rotationY).toEqual(-Math.PI / 2);
  });

  it("Test 4: should correctly extrude a diagonal wall segment", () => {
    const components = [
      {
        id: "wall-diagonal",
        type: "wall",
        x: 0,
        y: 0,
        layer: "structure",
        properties: {
          x1: 0,
          y1: 0,
          x2: 3,
          y2: 4,
          thickness: 0.2
        }
      }
    ];

    const floorHeight = 3.0;
    const plotWidth = 10;
    const plotHeight = 10;

    // Midpoint = (1.5, 2). Offset = (-5, -5).
    // Expected position = (-3.5, 1.5, -3)
    // Angle = atan2(4, 3) = ~0.927
    const result = buildExtrusion(components, floorHeight, plotWidth, plotHeight, 0.2);
    expect(result.length).toEqual(1);

    const wall = result[0];
    expect(wall.id).toEqual("wall-diagonal");
    expect(wall.position.x).toEqual(-3.5);
    expect(wall.position.y).toEqual(1.5);
    expect(wall.position.z).toEqual(-3);
    expect(wall.dimensions.width).toEqual(5); // Math.hypot(3, 4) = 5
    expect(wall.dimensions.depth).toEqual(0.2);
    expect(wall.rotationY).toBeLessThan(0);
    expect(Math.abs(wall.rotationY + Math.atan2(4, 3))).toBeLessThan(0.0001);
  });

  it("Test 5: should correctly generate zone slabs with calculated areas and opacity", () => {
    const components = [
      {
        id: "zone-garage",
        type: "zone",
        x: 0,
        y: 0,
        width: 2.5,
        height: 6,
        layer: "zones",
        properties: {
          name: "GARAJE / PARQUEO",
          color: "rgba(135, 206, 235, 0.08)"
        }
      }
    ];

    const result = buildExtrusion(components, 3.0, 6, 26, 0.15);
    expect(result.length).toEqual(1);

    const zone = result[0];
    expect(zone.id).toEqual("zone-garage");
    expect(zone.type).toEqual("zone");
    expect(zone.dimensions.width).toEqual(2.5);
    expect(zone.dimensions.depth).toEqual(6);
    expect(zone.dimensions.height).toEqual(0.05); // Slab thickness is 0.05
    expect(zone.area_m2).toEqual(15.0); // 2.5 * 6
    expect(zone.opacity).toEqual(0.08);
    expect(zone.label).toEqual("GARAJE / PARQUEO");
  });

  it("Test 6: should parse hex colors with different styles correctly", () => {
    const hex3Color = parseColorToHexAndOpacity("#fff");
    expect(hex3Color.color).toEqual(0xffffff);
    expect(hex3Color.opacity).toEqual(1.0);

    const hex6Color = parseColorToHexAndOpacity("#e2e8f0");
    expect(hex6Color.color).toEqual(0xe2e8f0);
    expect(hex6Color.opacity).toEqual(1.0);

    const rgbaColor = parseColorToHexAndOpacity("rgba(135, 206, 235, 0.08)");
    expect(rgbaColor.color).toEqual((135 << 16) + (206 << 8) + 235);
    expect(rgbaColor.opacity).toEqual(0.08);

    const emptyColor = parseColorToHexAndOpacity("");
    expect(emptyColor.color).toEqual(0x3b82f6);
    expect(emptyColor.opacity).toEqual(1.0);
  });
});
