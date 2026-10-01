import { queryClient } from "@/lib/query-client";
import { qk, STALE } from "@/lib/queries";
import {
  notesApi,
  foldersApi,
  entitiesApi,
  insightsApi,
  vaultApi,
  graphApi,
  timeTrackingApi,
  preferencesApi,
  dashboardApi,
  metricsApi,
  trackingApi,
  subscriptionApi,
} from "@/lib/api";
import type { VaultFile } from "@/types";
import type { Entity } from "@/types";
import { resolveVaultBlob } from "@/lib/vault-blob";

/**
 * Warms the main lists right after login/boot so opening a primary screen
 * paints instantly instead of fetching on navigation.
 */
export async function prefetchPrimaryLists() {
  const [notes, entities] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: qk.notes(),
      queryFn: async () => {
        const res = await notesApi.list();
        return Array.isArray(res.data) ? res.data : [];
      },
      staleTime: STALE.list,
    }),
    queryClient.fetchQuery({
      queryKey: qk.entities(),
      queryFn: async () => {
        const res = await entitiesApi.list();
        return Array.isArray(res.data) ? (res.data as Entity[]) : [];
      },
      staleTime: STALE.list,
    }),
  ]);

  await Promise.allSettled([
    prefetchQuery(qk.noteTypes(), () => notesApi.getTypes().then((res) => res.data), STALE.list),
    prefetchQuery(qk.folders(), () => foldersApi.list().then((res) => res.data), STALE.list),
    prefetchQuery(["account", "preferences"], () => preferencesApi.get().then((res) => res.data), STALE.preferences),
  ]);
}

function prefetchQuery<T>(queryKey: readonly unknown[], queryFn: () => Promise<T>, staleTime: number) {
  return queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
}

