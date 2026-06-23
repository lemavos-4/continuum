/**
 * Continuum offline IndexedDB wrapper.
 * Hand-rolled, no external dep, ~200 lines.
 */

const DB_NAME = "continuum-offline";
const DB_VERSION = 1;

export const STORES = {
  GET_CACHE: "get_cache", // keyed by URL, value: { url, status, data, etag, savedAt }
  SYNC_QUEUE: "sync_queue", // autoinc id, indexed by status + createdAt
  WALLPAPERS: "wallpapers", // keyed by "current", value: { blob, contentType, savedAt }
  METADATA: "metadata", // kv
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.GET_CACHE)) {
        db.createObjectStore(STORES.GET_CACHE, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const s = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("status", "status");
        s.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains(STORES.WALLPAPERS)) {
        db.createObjectStore(STORES.WALLPAPERS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result: T;
    Promise.resolve(fn(s))
      .then((maybeReq) => {
        if (maybeReq && typeof (maybeReq as IDBRequest).addEventListener === "function") {
          const req = maybeReq as IDBRequest<T>;
          req.onsuccess = () => {
            result = req.result;
          };
          req.onerror = () => reject(req.error);
        } else {
          result = maybeReq as T;
        }
      })
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

// ---- Generic helpers ----
export async function idbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export async function idbPut<T>(store: StoreName, value: T): Promise<IDBValidKey> {
  return tx<IDBValidKey>(store, "readwrite", (s) => s.put(value as unknown as object));
}

export async function idbAdd<T>(store: StoreName, value: T): Promise<IDBValidKey> {
  return tx<IDBValidKey>(store, "readwrite", (s) => s.add(value as unknown as object));
}

export async function idbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  await tx<undefined>(store, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
}

export async function idbAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export async function idbCount(store: StoreName): Promise<number> {
  return tx<number>(store, "readonly", (s) => s.count());
}

export async function idbClear(store: StoreName): Promise<void> {
  await tx<undefined>(store, "readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

// ---- Metadata kv ----
export async function metaGet<T = unknown>(key: string): Promise<T | undefined> {
  const row = await idbGet<{ key: string; value: T }>(STORES.METADATA, key);
  return row?.value;
}
export async function metaSet<T = unknown>(key: string, value: T): Promise<void> {
  await idbPut(STORES.METADATA, { key, value });
}
