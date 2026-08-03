import { describe, it, expect, beforeEach } from 'vitest';
import { saveToIndexedDB, loadFromIndexedDB, clearMockStorage } from '../../src/lib/domain/db';

describe('PWA Offline-First IndexedDB Integration Tests', () => {
  beforeEach(() => {
    clearMockStorage();
  });

  it('can save and load state cleanly from offline DB storage', async () => {
    const testState = {
      currentFloorId: 'second',
      zoom: 120,
      config: {
        wallThickness: 0.20,
        scale: 60
      }
    };

    // Save to database/memory store
    await saveToIndexedDB(testState);

    // Load from database/memory store
    const loadedState = await loadFromIndexedDB();

    expect(loadedState).toBeDefined();
    expect(loadedState.currentFloorId).toBe('second');
    expect(loadedState.zoom).toBe(120);
    expect(loadedState.config.wallThickness).toBe(0.20);
    expect(loadedState.config.scale).toBe(60);
  });

  it('returns null when loading non-existent state', async () => {
    const loadedState = await loadFromIndexedDB();
    expect(loadedState).toBeNull();
  });
});
