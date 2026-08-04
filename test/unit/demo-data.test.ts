import { describe, it, expect } from 'vitest';
import { DEMO_PROPERTIES, loadDemoProperty } from '../../src/lib/data/demo-data';
import { validateProperty } from '../../src/lib/domain/property';

describe('Demo Data Unit Tests', () => {
  it('should validate every property against validateProperty with zero errors', () => {
    expect(DEMO_PROPERTIES.length).toBeGreaterThanOrEqual(2);

    for (const property of DEMO_PROPERTIES) {
      const result = validateProperty(property);
      expect(result.valid).toEqual(true);
      expect(result.errors).toEqual([]);
    }
  });

  it('should ensure each inventory item has a valid roomId matching an existing room', () => {
    for (const property of DEMO_PROPERTIES) {
      const roomIds = new Set(property.rooms.map((r) => r.id));
      for (const item of property.items) {
        expect(item.roomId).toBeDefined();
        expect(roomIds.has(item.roomId!)).toEqual(true);
      }
    }
  });

  it('should ensure maintenance schedules have valid nextDue dates', () => {
    for (const property of DEMO_PROPERTIES) {
      if (property.maintenance) {
        for (const maint of property.maintenance) {
          expect(maint.nextDue).toBeDefined();
          const timestamp = Date.parse(maint.nextDue!);
          expect(Number.isNaN(timestamp)).toEqual(false);
        }
      }
    }
  });

  it('should ensure the entire dataset is JSON-serializable with no cyclic references', () => {
    const serialized = JSON.stringify(DEMO_PROPERTIES);
    expect(typeof serialized).toBe('string');
    expect(serialized.length).toBeGreaterThan(0);

    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual(DEMO_PROPERTIES);
  });

  it('should verify loadDemoProperty resolves correct property or defaults correctly', () => {
    const firstProp = DEMO_PROPERTIES[0];
    const secondProp = DEMO_PROPERTIES[1];

    // default loads first property
    const defaultProp = loadDemoProperty();
    expect(defaultProp.id).toBe(firstProp.id);

    // loads by id
    const loadedSecond = loadDemoProperty(secondProp.id);
    expect(loadedSecond.id).toBe(secondProp.id);

    // handles non-existent id gracefully by returning default
    const fallbackProp = loadDemoProperty('non-existent-id');
    expect(fallbackProp.id).toBe(firstProp.id);
  });
});
