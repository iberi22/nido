const DB_NAME = 'NidoOfflineDB';
const STORE_NAME = 'AppState';
const STATE_KEY = 'current_state';

// Fallback in-memory storage for test/headless environments
let mockStorage: Record<string, any> = {};

export type StorageStatus =
  | { mode: 'persistent' }
  | { mode: 'memory-only'; reason: string };

type StatusListener = (status: StorageStatus) => void;

let currentStatus: StorageStatus = { mode: 'persistent' };
const statusListeners = new Set<StatusListener>();

/**
 * Svelte-store-compatible status of the persistence layer. Once the app falls
 * back to memory-only it stays so until reload, because unsaved edits then
 * exist only in memory. UI can subscribe to show a warning banner.
 */
export const storageStatus = {
  get(): StorageStatus {
    return currentStatus;
  },
  subscribe(listener: StatusListener): () => void {
    statusListeners.add(listener);
    listener(currentStatus);
    return () => {
      statusListeners.delete(listener);
    };
  },
};

function markMemoryOnly(reason: unknown): void {
  if (currentStatus.mode === 'memory-only') return;
  const message = reason instanceof Error ? reason.message : String(reason);
  currentStatus = { mode: 'memory-only', reason: message };
  for (const listener of statusListeners) listener(currentStatus);
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains('properties')) {
        db.createObjectStore('properties', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToIndexedDB(state: any): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    markMemoryOnly('IndexedDB is not available');
    mockStorage[STATE_KEY] = JSON.parse(JSON.stringify(state));
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, STATE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB save failed, saving to memory:', err);
    markMemoryOnly(err);
    mockStorage[STATE_KEY] = JSON.parse(JSON.stringify(state));
  }
}

export async function loadFromIndexedDB(): Promise<any> {
  if (typeof indexedDB === 'undefined') {
    markMemoryOnly('IndexedDB is not available');
    return mockStorage[STATE_KEY] || null;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB load failed, trying memory:', err);
    markMemoryOnly(err);
    return mockStorage[STATE_KEY] || null;
  }
}

export async function saveQueueToIndexedDB(queue: any[]): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    markMemoryOnly('IndexedDB is not available');
    mockStorage['offline_queue'] = JSON.parse(JSON.stringify(queue));
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(queue, 'offline_queue');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB queue save failed, saving to memory:', err);
    markMemoryOnly(err);
    mockStorage['offline_queue'] = JSON.parse(JSON.stringify(queue));
  }
}

export async function loadQueueFromIndexedDB(): Promise<any[]> {
  if (typeof indexedDB === 'undefined') {
    markMemoryOnly('IndexedDB is not available');
    return mockStorage['offline_queue'] || [];
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('offline_queue');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB queue load failed, trying memory:', err);
    markMemoryOnly(err);
    return mockStorage['offline_queue'] || [];
  }
}

export function clearMockStorage(): void {
  mockStorage = {};
}
