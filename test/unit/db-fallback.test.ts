import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as DbModule from '../../src/lib/domain/db';
import type { StorageStatus } from '../../src/lib/domain/db';

// Each test gets a fresh module: memory-only status is sticky per session.
let db: typeof DbModule;

describe('db fallback surfaces memory-only status', () => {
  beforeEach(async () => {
    vi.resetModules();
    db = await import('../../src/lib/domain/db');
    db.clearMockStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sets memory-only with a reason when IndexedDB fails on save', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('quota exceeded');
      },
    });

    await db.saveToIndexedDB({ walls: 3 });

    const status = db.storageStatus.get();
    expect(status.mode).toBe('memory-only');
    expect(status.mode === 'memory-only' && status.reason).toContain('quota exceeded');
    // Data is still kept in memory for the session.
    expect(await db.loadFromIndexedDB()).toEqual({ walls: 3 });
  });

  it('notifies subscribers when the fallback happens', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('disk gone');
      },
    });
    const seen: StorageStatus[] = [];
    const unsubscribe = db.storageStatus.subscribe((s) => seen.push(s));

    await db.saveToIndexedDB({ x: 1 });
    unsubscribe();

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[0].mode).toBe('persistent');
    expect(seen[seen.length - 1].mode).toBe('memory-only');
  });

  it('reports memory-only when IndexedDB is not available at all', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await db.saveToIndexedDB({ y: 2 });

    expect(db.storageStatus.get().mode).toBe('memory-only');
  });
});
