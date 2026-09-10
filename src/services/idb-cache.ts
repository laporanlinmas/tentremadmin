/**
 * idb-cache.ts
 * Persistent IndexedDB cache for TENTREM Admin.
 *
 * - Survives page reloads; no repeated API calls on refresh.
 * - Per-key TTL (default 30 min).
 * - Simple key-value store in a single object-store.
 */

const DB_NAME = 'tentrem_cache';
const STORE_NAME = 'kv';
const DB_VERSION = 1;
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

interface IDBEntry {
  key: string;
  data: any;
  ts: number;
  ttl: number;
}

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key: string): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const entry: IDBEntry | undefined = req.result;
        if (!entry) return resolve(null);
        if (Date.now() - entry.ts > (entry.ttl ?? DEFAULT_TTL)) {
          // Stale – delete in background and return null
          idbDel(key).catch(() => {});
          return resolve(null);
        }
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, data: any, ttl = DEFAULT_TTL): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const entry: IDBEntry = { key, data, ts: Date.now(), ttl };
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // Fail silently
    });
  } catch {
    // Ignore
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

export async function idbClear(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

/**
 * Returns the raw stored timestamp for a key (ms since epoch).
 * Useful to check how stale the data is without invalidating it.
 */
export async function idbGetTs(key: string): Promise<number | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const entry: IDBEntry | undefined = req.result;
        resolve(entry ? entry.ts : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
