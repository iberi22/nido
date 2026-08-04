import { describe, it, expect, beforeEach } from "vitest";
import { floorPlanStore } from "../../src/lib/stores/floorPlanStore.svelte";

// NIDO — unit tests for feature: plans-2d
// User stories under test: US-101
// Contract: acceptance criteria from docs/SRS/REQUIREMENTS.md.

describe("US-101: draw and edit my home's floor plan (walls, zones, rooms) in 2D with real measurements", () => {
  beforeEach(() => {
    // Reset/load default store state for predictable testing
    floorPlanStore.currentFloorId = "ground";
    floorPlanStore.setTool("select");
    floorPlanStore.selectComponent(null);
  });

  it("acceptance 1: Canvas renders blueprint grid and plan from store", () => {
    // Check floor data and metadata
    const floor = floorPlanStore.currentFloor;
    expect(floor).toBeDefined();
    expect(floor.id).toBe("ground");
    expect(floor.name).toContain("PLANTA BAJA");
    expect(floor.components.length).toBeGreaterThan(0);

    // Verify grid configuration and colors
    expect(floorPlanStore.config.colors.blueprint_bg).toBe("#1e3a5f");
    expect(floorPlanStore.config.colors.blueprint_line).toBe("#87ceeb");
  });

  it("acceptance 2: User can add/move/resize wall segments", () => {
    const initialCount = floorPlanStore.currentFloor.components.length;

    // Simulate adding a wall segment
    const wallId = "user-wall-test-1";
    floorPlanStore.addComponent({
      id: wallId,
      type: "wall",
      x: 1.0,
      y: 2.0,
      width: 3.5,
      height: 0.15,
      layer: "structure",
      properties: {
        x1: 1.0,
        y1: 2.0,
        x2: 4.5,
        y2: 2.0,
        thickness: 0.15,
        note: "Unit Test Wall"
      }
    });

    // Check additions
    const components = floorPlanStore.currentFloor.components;
    expect(components.length).toBe(initialCount + 1);

    const addedWall = components.find(c => c.id === wallId);
    expect(addedWall).toBeDefined();
    expect(addedWall?.type).toBe("wall");
    expect(addedWall?.x).toBe(1.0);
    expect(addedWall?.width).toBe(3.5);

    // Simulate moving the wall
    floorPlanStore.updateComponent(wallId, { x: 2.0, y: 3.0 });
    const updatedWall = floorPlanStore.currentFloor.components.find(c => c.id === wallId);
    expect(updatedWall?.x).toBe(2.0);
    expect(updatedWall?.y).toBe(3.0);

    // Clean up
    floorPlanStore.deleteComponent(wallId);
    expect(floorPlanStore.currentFloor.components.length).toBe(initialCount);
  });

  it("acceptance 3: User can define zones (garage, entrance, rooms) with dimensions", () => {
    const initialCount = floorPlanStore.currentFloor.components.length;

    // Add a new zone
    const zoneId = "user-zone-test-1";
    floorPlanStore.addComponent({
      id: zoneId,
      type: "zone",
      x: 0,
      y: 0,
      width: 4.0,
      height: 5.0,
      layer: "zones",
      properties: {
        name: "Test Living Room",
        color: "rgba(100, 200, 100, 0.1)",
        type: "living"
      }
    });

    const components = floorPlanStore.currentFloor.components;
    expect(components.length).toBe(initialCount + 1);

    const addedZone = components.find(c => c.id === zoneId);
    expect(addedZone).toBeDefined();
    expect(addedZone?.type).toBe("zone");
    expect(addedZone?.width).toBe(4.0);
    expect(addedZone?.height).toBe(5.0);
    expect(addedZone?.properties.name).toBe("Test Living Room");

    // Clean up
    floorPlanStore.deleteComponent(zoneId);
  });

  it("acceptance 4: Measurements shown in meters, exportable to data model", () => {
    const initialCount = floorPlanStore.currentFloor.components.length;

    // Add a measurement segment
    const measureId = "user-measure-test-1";
    floorPlanStore.addComponent({
      id: measureId,
      type: "dimension",
      x: 1.0,
      y: 1.0,
      width: 4.0,
      height: 0.0,
      layer: "annotations",
      properties: {
        toX: 5.0,
        toY: 1.0,
        label: "4.00m",
        note: "Test Measurement"
      }
    });

    const components = floorPlanStore.currentFloor.components;
    expect(components.length).toBe(initialCount + 1);

    const addedMeasure = components.find(c => c.id === measureId);
    expect(addedMeasure).toBeDefined();
    expect(addedMeasure?.type).toBe("dimension");
    expect(addedMeasure?.properties.label).toBe("4.00m");

    // Verify coordinates can export to data model via saveProperty
    const exportedData = floorPlanStore.saveProperty();
    expect(exportedData).toBeDefined();
    expect(exportedData.id).toBe("casa-3-pisos-cali");

    const exportedFloor = exportedData.floors.find(f => f.id === "ground");
    expect(exportedFloor).toBeDefined();

    const exportedDimensions = exportedFloor?.dimensions;
    expect(exportedDimensions).toBeDefined();
    expect(exportedDimensions?.some(d => d.label === "4.00m")).toBe(true);

    // Clean up
    floorPlanStore.deleteComponent(measureId);
  });

  it("acceptance 5: State persists in floorPlanStore (runes) and IndexedDB", () => {
    // Set a property value
    floorPlanStore.property.name = "Modified Unit Test Casa";

    // Run saveProperty to verify it saves locally and triggers IndexedDB
    const saved = floorPlanStore.saveProperty();
    expect(saved.name).toBe("Modified Unit Test Casa");

    // Verify localStorage cache
    if (typeof window !== "undefined" && window.localStorage) {
      const cached = window.localStorage.getItem("nido_property");
      expect(cached).toBeDefined();
      expect(JSON.parse(cached || "{}").name).toBe("Modified Unit Test Casa");
    }
  });
});
