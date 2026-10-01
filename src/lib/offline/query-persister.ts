import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";
import { idbDelete, idbGet, idbPut, STORES } from "./db";
import { version as appVersion } from "@/lib/version";

const KEY = "react-query-cache";

/**
 * Persists the React Query cache in the existing `continuum-offline` IndexedDB
 * (no 5MB localStorage ceiling, survives app/APK restarts).
 */
export function createIdbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await idbPut(STORES.METADATA, { key: KEY, value: client });
      } catch {
        /* quota / private mode — cache simply won't persist */
      }
    },
    restoreClient: async () => {
      try {
        const row = await idbGet<{ key: string; value: PersistedClient }>(STORES.METADATA, KEY);
        return row?.value;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await idbDelete(STORES.METADATA, KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

/** Cache buster: a new build never restores an older cache shape. */
export const QUERY_CACHE_BUSTER = `v1-${appVersion}`;

export async function clearPersistedQueryCache() {
  try {
    await idbDelete(STORES.METADATA, KEY);
  } catch {
    /* ignore */
  }
}
