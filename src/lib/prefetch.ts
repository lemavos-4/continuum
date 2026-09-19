import { queryClient } from "@/lib/query-client";
import { qk, STALE } from "@/lib/queries";
import { notesApi, entitiesApi, insightsApi } from "@/lib/api";
import type { Entity } from "@/types";

/**
 * Warms the main lists right after login/boot so opening Notes, Entities or
 * Insights paints instantly instead of fetching on navigation.
 */
export function prefetchPrimaryLists() {
  void queryClient.prefetchQuery({
    queryKey: qk.notes(),
    queryFn: async () => {
      const res = await notesApi.list();
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: STALE.list,
  });

  void queryClient.prefetchQuery({
    queryKey: qk.noteTypes(),
    queryFn: async () => {
      const res = await notesApi.getTypes();
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: STALE.list,
  });

  void queryClient.prefetchQuery({
    queryKey: qk.entities(),
    queryFn: async () => {
      const res = await entitiesApi.list();
      return Array.isArray(res.data) ? (res.data as Entity[]) : [];
    },
    staleTime: STALE.list,
  });

  void queryClient.prefetchQuery({
    queryKey: qk.insights("all", 12),
    queryFn: async () => {
      const [hn, fn, he, fe] = await Promise.all([
        insightsApi.hotNotes(12),
        insightsApi.forgottenNotes(12),
        insightsApi.hotEntities(12),
        insightsApi.forgottenEntities(12),
      ]);
      return {
        hotNotes: hn.data || [],
        forgottenNotes: fn.data || [],
        hotEntities: he.data || [],
        forgottenEntities: fe.data || [],
      };
    },
    staleTime: STALE.insights,
  });
}
