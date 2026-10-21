import { describe, test, expect } from 'vitest';
import { validateProperty } from '../../src/lib/domain/property';
import type { Property } from '../../src/lib/domain/property';
import { FloorPlanStore } from '../../src/lib/stores/floorPlanStore.svelte';
import { sceneCommands } from '../../src/lib/commands/sceneCommands.svelte';
import { applyCommand } from '../../src/lib/commands';
import houseData from '../../src/lib/data/house-data.json';

const base = (): Property => JSON.parse(JSON.stringify(houseData));

describe('lot / brief / design data model', () => {
  test('valid lot passes, bad lot fails', () => {
    const p: any = base();
    p.lot = { polygon: [[0, 0], [6, 0], [6, 26], [0, 26]], frontEdge: 0 };
    expect(validateProperty(p).valid).toBe(true);
    p.lot = { polygon: [[0, 0], [6, 0]], frontEdge: 0 };
    expect(validateProperty(p).valid).toBe(false);
    p.lot = { polygon: [[0, 0], [6, 0], [6, NaN]], frontEdge: 0 };
    expect(validateProperty(p).valid).toBe(false);
    p.lot = { polygon: [[0, 0], [6, 0], [6, 2]], frontEdge: 3 };
    expect(validateProperty(p).valid).toBe(false);
  });

  test('lot/brief/design round-trip save -> load', () => {
    const s = new FloorPlanStore();
    const p: any = base();
    p.lot = { polygon: [[0, 0], [6, 0], [6, 26], [0, 26]], frontEdge: 0, source: { kind: 'dimensions' } };
    p.brief = { v: 1, lang: 'es', floors: 2 };
    p.design = { generator: 'nido-layout@1', seed: 7, strategy: 'stair-left', generatedAt: 'x' };
    s.loadProperty(p);
    const saved = JSON.parse(JSON.stringify(s.saveProperty()));
    const s2 = new FloorPlanStore();
    s2.loadProperty(saved);
    expect(s2.property.lot).toEqual(p.lot);
    expect(s2.property.brief).toEqual(p.brief);
    expect(s2.property.design).toEqual(p.design);
  });

  test('window + opening props and wall thickness survive reload', () => {
    const s = new FloorPlanStore();
    s.loadProperty(base());
    const floor = s.currentFloor;
    floor.components.push({
      id: 'w-t', type: 'wall', x: 0, y: 0, width: 4, height: 0.2, rotation: 0, layer: 'structure',
      properties: { x1: 0, y1: 0, x2: 4, y2: 0, thickness: 0.2 }
    });
    const r = applyCommand(
      { components: floor.components },
      { op: 'addOpening', id: 'win-1', kind: 'window', wallId: 'w-t', offset: 500, width: 1200, height: 1000, sill: 800 }
    );
    expect(r.ok).toBe(true);
    if (r.ok) floor.components = r.model.components;
    const saved = JSON.parse(JSON.stringify(s.saveProperty()));
    const s2 = new FloorPlanStore();
    s2.loadProperty(saved);
    const win = s2.floors[s.currentFloorId].components.find((c) => c.type === 'window' && c.properties.wallId === 'w-t');
    expect(win).toBeTruthy();
    expect(win!.properties).toMatchObject({ wallId: 'w-t', offsetMm: 500, widthMm: 1200, heightMm: 1000, sillMm: 800 });
    const wall = s2.floors[s.currentFloorId].components.find((c) => c.id === 'w-t');
    expect(wall!.properties.thickness).toBe(0.2);
  });

  test('applyDesign replaces floors, resets history, keeps one undo generation', () => {
    const s = new FloorPlanStore();
    s.loadProperty(base());
    const before = s.property.floors.length;
    const lot = { polygon: [[0, 0], [6, 0], [6, 26], [0, 26]] as [number, number][], frontEdge: 0 };
    s.applyDesign({
      floors: [{ id: 'g', name: 'G', zones: [] }],
      states: { g: { id: 'g', name: 'G', components: [] } },
      lot
    });
    expect(Object.keys(s.floors)).toEqual(['g']);
    expect(s.property.floors.map((f) => f.id)).toEqual(['g']);
    expect(s.property.lot).toEqual(lot);
    expect(s.currentFloorId).toBe('g');
    expect(sceneCommands.canUndo).toBe(false);
    expect(s.previousProperty?.floors.length).toBe(before);
  });
});
