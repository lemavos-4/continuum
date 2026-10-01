import { QueryClient } from "@tanstack/react-query";
import { STALE } from "@/lib/queries";
import { clearPersistedQueryCache } from "@/lib/offline/query-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data paints instantly and refreshes in the background.
      staleTime: STALE.list,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

/** Drops every cached response (memory + IndexedDB). Used on logout. */
export async function resetAllCaches() {
  queryClient.clear();
  await clearPersistedQueryCache();
}
