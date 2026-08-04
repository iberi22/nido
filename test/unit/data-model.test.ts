import { describe, test, expect } from 'vitest';
import { validateProperty } from '../../src/lib/domain/property';
import type { Property } from '../../src/lib/domain/property';
import propertySchema from '../../src/lib/data/property.schema.json';

describe('Nido Canonical Data Model Unit Tests', () => {
  const validProperty: Property = {
    id: 'prop-123',
    name: 'Casa Ficticia',
    type: 'house',
    location: {
      city: 'Cali',
      comuna: 'Comuna 10',
      estrato: 3,
      geohash: 'd0ybf91z'
    },
    floors: [
      {
        id: 'floor-1',
        name: 'Primer Piso',
        height_m: 3.5,
        zones: [
          {
            id: 'zone-1',
            name: 'Sala',
            type: 'social',
            x: 0,
            y: 0,
            width: 4,
            height: 5
          }
        ]
      }
    ],
    rooms: [
      {
        id: 'room-1',
        floorId: 'floor-1',
        zoneId: 'zone-1',
        name: 'Sala de Estar',
        area_m2: 20,
        items: []
      }
    ],
    items: [
      {
        id: 'item-1',
        roomId: 'room-1',
        name: 'Televisor Smart',
        category: 'electronics',
        value: 1200000
      }
    ],
    taxes: {
      predial: {
        jurisdiction: 'Cali',
        avaluo: 180000000,
        rate_pct: 0.007,
        installments: 1,
        dueDates: ['2026-04-30']
      }
    },
    leases: [],
    maintenance: [
      {
        id: 'maint-1',
        itemId: 'item-1',
        type: 'General Inspection',
        interval_days: 365
      }
    ],
    utilities: [
      {
        id: 'util-water',
        type: 'water',
        provider: 'EMCALI',
        account: 'A-1002',
        dueDay: 15,
        budget: 50000
      }
    ]
  };

  test('should validate a valid property successfully', () => {
    const result = validateProperty(validProperty);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should detect missing required top-level fields', () => {
    const invalid: any = { id: 'prop-123', name: 'Incompleta' };
    const result = validateProperty(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Property type must be one of: house, apartment, bodega, construction');
    expect(result.errors).toContain('Property location must be an object');
    expect(result.errors).toContain('Property floors must be an array');
    expect(result.errors).toContain('Property rooms must be an array');
    expect(result.errors).toContain('Property items must be an array');
  });

  test('should detect invalid property type', () => {
    const invalid: Property = {
      ...validProperty,
      type: 'mansion' as any
    };
    const result = validateProperty(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Property type must be one of:');
  });

  test('should validate JSON schema fields', () => {
    // Basic verification that JSON Schema exists and has proper top-level fields
    expect(propertySchema.$schema).toBeDefined();
    expect(propertySchema.properties).toBeDefined();
    expect(propertySchema.properties.id.type).toBe('string');
    expect(propertySchema.properties.type.enum).toEqual(['house', 'apartment', 'bodega', 'construction']);
    expect(propertySchema.required).toContain('id');
    expect(propertySchema.required).toContain('name');
    expect(propertySchema.required).toContain('type');
    expect(propertySchema.required).toContain('location');
    expect(propertySchema.required).toContain('floors');
  });

  test('should reject null/non-object property and nested floor/zone errors', () => {
    expect(validateProperty(null).valid).toEqual(false);
    expect(validateProperty(null).errors).toContain('Property must be a non-null object');

    const badFloor: Property = {
      ...validProperty,
      floors: [
        {
          id: '',
          name: '',
          zones: [{ id: 'z1', name: 'Sala', type: 'social', x: 0, y: 0, width: 4, height: 5 }]
        }
      ]
    };
    const floorResult = validateProperty(badFloor);
    expect(floorResult.valid).toEqual(false);
    expect(floorResult.errors.some((e) => e.includes('non-empty string id'))).toEqual(true);
    expect(floorResult.errors.some((e) => e.includes('non-empty string name'))).toEqual(true);
  });

  test('should reject invalid utility type and incomplete location', () => {
    const badUtil: Property = {
      ...validProperty,
      utilities: [
        {
          id: 'u-bad',
          type: 'fiber' as any,
          provider: 'X',
          account: '1',
          dueDay: 1,
          budget: 10
        }
      ]
    };
    const utilResult = validateProperty(badUtil);
    expect(utilResult.valid).toEqual(false);
    expect(utilResult.errors.some((e) => e.includes('valid type: water, energy, gas, internet'))).toEqual(true);

    const badLoc: any = {
      ...validProperty,
      location: { city: '', comuna: '10', estrato: 'three' }
    };
    const locResult = validateProperty(badLoc);
    expect(locResult.valid).toEqual(false);
    expect(locResult.errors).toContain('Location city must be a non-empty string');
    expect(locResult.errors).toContain('Location estrato must be a number');
  });
});
