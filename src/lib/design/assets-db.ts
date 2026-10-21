import { openDB, type IDBPDatabase } from 'idb';

/** Separate from NidoOfflineDB on purpose: raster blobs never live in the Property. */
export const ASSETS_DB_NAME = 'NidoAssetsDB';
const STORE = 'assets';

interface AssetRecord {
  id: string;
  blob: Blob;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(ASSETS_DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: 'id' });
      }
    }
  });
  return dbPromise;
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Stores a blob and returns its id. */
export async function putAsset(blob: Blob, id: string = newId()): Promise<string> {
  const rec: AssetRecord = { id, blob, createdAt: Date.now() };
  await (await db()).put(STORE, rec);
  return id;
}

export async function getAsset(id: string): Promise<Blob | undefined> {
  const rec = (await (await db()).get(STORE, id)) as AssetRecord | undefined;
  return rec?.blob;
}

/** Deletes an asset and returns its id. */
export async function deleteAsset(id: string): Promise<string> {
  await (await db()).delete(STORE, id);
  return id;
}
