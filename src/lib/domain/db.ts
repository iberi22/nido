const DB_NAME = 'NidoOfflineDB';
const STORE_NAME = 'AppState';
const STATE_KEY = 'current_state';

// Fallback in-memory storage for test/headless environments
let mockStorage: Record<string, any> = {};

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
    mockStorage[STATE_KEY] = JSON.parse(JSON.stringify(state));
  }
}

export async function loadFromIndexedDB(): Promise<any> {
  if (typeof indexedDB === 'undefined') {
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
    return mockStorage[STATE_KEY] || null;
  }
}

export function clearMockStorage(): void {
  mockStorage = {};
}
