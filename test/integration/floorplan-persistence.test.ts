import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FloorPlanStore } from '../../src/lib/stores/floorPlanStore.svelte';
import type { Property } from '../../src/lib/domain/property';

// Mock simple in-memory IndexedDB structures for tests
class MockIDBRequest {
  onsuccess: any = null;
  onerror: any = null;
  onupgradeneeded: any = null;
  result: any = null;
  error: any = null;
}

class MockIDBTransaction {
  store: any;
  constructor(store: any) {
    this.store = store;
  }
  objectStore() {
    return this.store;
  }
}

class MockIDBDatabase {
  objectStoreNames: {
    contains: (name: string) => boolean;
  };
  stores: Record<string, any>;
  constructor(stores: Record<string, any>) {
    this.stores = stores;
    this.objectStoreNames = {
      contains: (name: string) => name in this.stores
    };
  }
  transaction(storeName: string, mode: string) {
    const storeObj = {
      get: (key: string) => {
        const req = new MockIDBRequest();
        queueMicrotask(() => {
          req.result = this.stores['properties']?.[key] || null;
          if (req.onsuccess) req.onsuccess();
        });
        return req;
      },
      put: (val: any) => {
        const req = new MockIDBRequest();
        queueMicrotask(() => {
          if (!this.stores['properties']) {
            this.stores['properties'] = {};
          }
          this.stores['properties'][val.id] = JSON.parse(JSON.stringify(val));
          if (req.onsuccess) req.onsuccess();
        });
        return req;
      }
    };
    return new MockIDBTransaction(storeObj);
  }
  createObjectStore(name: string, options?: any) {
    this.stores[name] = {};
    return {};
  }
}

describe('Floor Plan Persistence Integration Tests', () => {
  let mockDBStores: Record<string, any>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDBStores = {
      AppState: {},
      properties: {}
    };

    const mockIndexedDB = {
      open: () => {
        const req = new MockIDBRequest();
        queueMicrotask(() => {
          const db = new MockIDBDatabase(mockDBStores);
          req.result = db;
          if (req.onupgradeneeded) {
            req.onupgradeneeded({ target: { result: db } });
          }
          if (req.onsuccess) {
            req.onsuccess({ target: { result: db } });
          }
        });
        return req;
      }
    };

    vi.stubGlobal('window', {
      indexedDB: mockIndexedDB,
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
      }
    });
  });

  it('acceptance 1: save -> restore round-trip in IndexedDB works flawlessly', async () => {
    const store = new FloorPlanStore();
    await store.dbLoadPromise;

    store.property.name = 'Hacienda El Paraiso';
    await store.saveProperty();

    // Advance timers for any async operations
    await vi.runAllTimersAsync();

    // Create a new store to restore from IndexedDB
    const newStore = new FloorPlanStore();
    await newStore.dbLoadPromise;

    expect(newStore.property.name).toBe('Hacienda El Paraiso');
  });

  it('acceptance 2: debounced save coalesces rapid changes into a single saveProperty call', async () => {
    const store = new FloorPlanStore();
    await store.dbLoadPromise;

    const spy = vi.spyOn(store, 'saveProperty');

    // Perform rapid changes
    store.config.wallThickness = 0.22;
    await vi.advanceTimersByTimeAsync(50);
    store.config.scale = 75;
    await vi.advanceTimersByTimeAsync(50);
    store.property.name = 'Updated Villa Name';

    // Verify no saveProperty called immediately
    expect(spy).not.toHaveBeenCalled();

    // Advance beyond the 300ms debounce
    await vi.advanceTimersByTimeAsync(350);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.property.name).toBe('Updated Villa Name');
  });

  it('acceptance 3: corrupted/empty database fallback loads the fallback seed data', async () => {
    // Override MockIndexedDB to fail or return nothing
    const failingIndexedDB = {
      open: () => {
        const req = new MockIDBRequest();
        queueMicrotask(() => {
          if (req.onerror) req.onerror();
        },);
        return req;
      }
    };
    vi.stubGlobal('window', {
      indexedDB: failingIndexedDB,
      localStorage: {
        getItem: () => null,
        setItem: () => {}
      }
    });

    const store = new FloorPlanStore();
    await store.dbLoadPromise;

    // Verify it fallbacked to seed
    expect(store.property.id).toBe('casa-3-pisos-cali');
    expect(store.property.name).toBe('Casa 3 Pisos - Barrio Santa Elena');
  });

  it('acceptance 4: versioned schema migration no-op execution', async () => {
    let upgradeCalled = false;
    const migrationIndexedDB = {
      open: () => {
        const req = new MockIDBRequest();
        queueMicrotask(() => {
          const db = new MockIDBDatabase(mockDBStores);
          req.result = db;
          if (req.onupgradeneeded) {
            upgradeCalled = true;
            req.onupgradeneeded({ target: { result: db } });
          }
          if (req.onsuccess) {
            req.onsuccess({ target: { result: db } });
          }
        });
        return req;
      }
    };
    vi.stubGlobal('window', {
      indexedDB: migrationIndexedDB
    });

    const store = new FloorPlanStore();
    await store.dbLoadPromise;

    expect(upgradeCalled).toEqual(true);
  });

  it('acceptance 5: saveProperty correctly maps live floor components back to property.floors array', async () => {
    const store = new FloorPlanStore();
    await store.dbLoadPromise;

    // Modify a component in a live floor
    const groundFloor = store.floors['ground'];
    expect(groundFloor).toBeDefined();

    // Find first wall component or add a custom one
    const customWallId = 'test-wall-xyz';
    store.addComponent({
      id: customWallId,
      type: 'wall',
      x: 2.5,
      y: 4.5,
      width: 3.0,
      height: 0.15,
      layer: 'structure',
      properties: {
        x1: 2.5, y1: 4.5, x2: 5.5, y2: 4.5,
        thickness: 0.15,
        note: 'Live Modified Wall'
      }
    });

    const saved = store.saveProperty();
    const savedGround = saved.floors.find(f => f.id === 'ground');
    expect(savedGround).toBeDefined();

    const savedWall = savedGround?.walls?.find(w => w.id === customWallId);
    expect(savedWall).toBeDefined();
    expect(savedWall?.x1).toBe(2.5);
    expect(savedWall?.y1).toBe(4.5);
    expect(savedWall?.note).toBe('Live Modified Wall');
  });
});
