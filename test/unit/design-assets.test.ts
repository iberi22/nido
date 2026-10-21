import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
const openDB = vi.fn(async (_name: string, _version: number, opts?: any) => {
  opts?.upgrade?.({ createObjectStore: vi.fn(), objectStoreNames: { contains: () => false } });
  return {
    put: async (_s: string, v: any) => { store.set(v.id, v); return v.id; },
    get: async (_s: string, id: string) => store.get(id),
    delete: async (_s: string, id: string) => { store.delete(id); }
  };
});
vi.mock('idb', () => ({ openDB: (...a: unknown[]) => (openDB as any)(...a) }));

import { putAsset, getAsset, deleteAsset, ASSETS_DB_NAME } from '../../src/lib/design/assets-db';
import { computeDownscale, MAX_RASTER_PX } from '../../src/lib/design/pdf-raster';

describe('computeDownscale', () => {
  it('keeps small sizes unchanged', () => {
    expect(computeDownscale(1000, 500)).toEqual({ width: 1000, height: 500, scale: 1 });
  });
  it('downscales longest side to 4096', () => {
    const r = computeDownscale(8192, 4096);
    expect(r.width).toBe(MAX_RASTER_PX);
    expect(r.height).toBe(2048);
    expect(r.scale).toBe(0.5);
  });
  it('handles portrait and invalid input', () => {
    expect(computeDownscale(2000, 8000).height).toBe(4096);
    expect(() => computeDownscale(0, 10)).toThrow();
  });
});

describe('assets-db', () => {
  beforeEach(() => store.clear());
  it('uses a separate NidoAssetsDB', async () => {
    await putAsset(new Blob(['x'], { type: 'image/webp' }));
    expect(ASSETS_DB_NAME).toBe('NidoAssetsDB');
    expect(openDB.mock.calls[0][0]).toBe('NidoAssetsDB');
  });
  it('put/get/delete round trip returns ids', async () => {
    const id = await putAsset(new Blob(['x']), 'a1');
    expect(id).toBe('a1');
    expect((await getAsset('a1'))?.size).toBe(1);
    expect(await deleteAsset('a1')).toBe('a1');
    expect(await getAsset('a1')).toBeUndefined();
  });
  it('generates an id when none given', async () => {
    const id = await putAsset(new Blob(['y']));
    expect(id.length).toBeGreaterThan(0);
  });
});
