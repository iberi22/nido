import { describe, test, expect, beforeEach, vi } from 'vitest';
import { FloorPlanStore } from '../../src/lib/stores/floorPlanStore.svelte';
import type { Property } from '../../src/lib/domain/property';

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

describe('Nido Integration / Round-Trip Persistence Tests', () => {
  beforeEach(() => {
    // Setup mock global window/localStorage
    vi.stubGlobal('window', {
      localStorage: localStorageMock,
      indexedDB: undefined // Mock DB as undefined for stub mode
    });
    localStorageMock.clear();
  });

  test('should initialize store from seed fallback when localStorage is empty', () => {
    const store = new FloorPlanStore();
    expect(store.property).toBeDefined();
    expect(store.property.id).toBe('casa-3-pisos-cali');
    expect(store.property.name).toBe('Casa 3 Pisos - Barrio Santa Elena');
    expect(store.property.type).toBe('house');
    expect(store.property.floors).toHaveLength(4);
    expect(store.floors).toBeDefined();
    expect(store.floors['ground']).toBeDefined();
  });

  test('should load property correctly via loadProperty', () => {
    const store = new FloorPlanStore();
    const customProperty: Property = {
      id: 'custom-id',
      name: 'Bodega de Repuestos',
      type: 'bodega',
      location: { city: 'Bogota', comuna: 'Usaquen', estrato: 4 },
      floors: [
        {
          id: 'b1',
          name: 'Nivel Principal',
          zones: [
            { id: 'z1', name: 'Almacen', type: 'warehouse', x: 0, y: 0, width: 10, height: 20 }
          ]
        }
      ],
      rooms: [],
      items: []
    };

    store.loadProperty(customProperty);
    expect(store.property.id).toBe('custom-id');
    expect(store.property.name).toBe('Bodega de Repuestos');
    expect(store.property.type).toBe('bodega');
    expect(store.floors['b1']).toBeDefined();
    expect(store.floors['b1'].components).toHaveLength(1);
    expect(store.floors['b1'].components[0].type).toBe('zone');
  });

  test('should save and persist property in localStorage', () => {
    const store = new FloorPlanStore();

    // Modify some collections reactively
    store.addRoom({
      id: 'new-room-1',
      floorId: 'ground',
      name: 'Cuarto de Maquinas',
    });

    store.addItem({
      id: 'new-item-1',
      roomId: 'new-room-1',
      name: 'Generador Electrico',
      category: 'power_source'
    });

    store.addUtility({
      id: 'new-util-gas',
      type: 'gas',
      provider: 'Gases de Occidente',
      account: 'GAS-778',
      dueDay: 5,
      budget: 35000
    });

    // Save
    const saved = store.saveProperty();
    expect(saved.rooms.find(r => r.id === 'new-room-1')).toBeDefined();
    expect(saved.items.find(i => i.id === 'new-item-1')).toBeDefined();
    expect(saved.utilities?.find(u => u.id === 'new-util-gas')).toBeDefined();

    // Verify localStorage has the saved property
    const cachedString = localStorageMock.getItem('nido_property');
    expect(cachedString).toBeDefined();
    expect(cachedString).toContain('Cuarto de Maquinas');
    expect(cachedString).toContain('Generador Electrico');
    expect(cachedString).toContain('Gases de Occidente');

    // Round-trip load: new store instance should initialize with localStorage data
    const secondStore = new FloorPlanStore();
    expect(secondStore.property.id).toBe(store.property.id);
    expect(secondStore.property.rooms.find(r => r.id === 'new-room-1')).toBeDefined();
    expect(secondStore.property.items.find(i => i.id === 'new-item-1')).toBeDefined();
  });

  test('should perform CRUD on collections reactively', () => {
    const store = new FloorPlanStore();

    // Leases CRUD
    store.addLease({ id: 'lease-1', tenantName: 'Xavier', rentAmount: 1200 });
    expect(store.property.leases).toHaveLength(1);

    store.updateLease('lease-1', { rentAmount: 1300 });
    expect(store.property.leases?.[0].rentAmount).toBe(1300);

    store.removeLease('lease-1');
    expect(store.property.leases).toHaveLength(0);

    // Maintenance CRUD
    store.addMaintenance({ id: 'maint-1', type: 'Ascensor', interval_days: 30 });
    expect(store.property.maintenance).toHaveLength(2); // 1 pre-seeded + 1 new

    store.updateMaintenance('maint-1', { interval_days: 45 });
    expect(store.property.maintenance?.find(m => m.id === 'maint-1')?.interval_days).toBe(45);

    store.removeMaintenance('maint-1');
    expect(store.property.maintenance?.find(m => m.id === 'maint-1')).toBeUndefined();
  });
});
