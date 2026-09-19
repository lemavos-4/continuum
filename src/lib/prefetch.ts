import { queryClient } from "@/lib/query-client";
import { qk, STALE } from "@/lib/queries";
import { notesApi, entitiesApi, insightsApi, vaultApi, graphApi, timeTrackingApi } from "@/lib/api";
import type { VaultFile } from "@/types";
import type { Entity } from "@/types";

/**
 * Warms the main lists right after login/boot so opening a primary screen
 * paints instantly instead of fetching on navigation.
 */
export function prefetchPrimaryLists() {
  void prefetchNotesAndContent().catch(() => {});

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

  void queryClient.prefetchQuery({
    queryKey: qk.vaultFiles(),
    queryFn: async () => {
      const res = await vaultApi.list();
      return Array.isArray(res.data) ? (res.data as VaultFile[]) : [];
    },
    staleTime: STALE.list,
  });

  void queryClient.prefetchQuery({
    queryKey: qk.graph(),
    queryFn: async () => {
      const [graphRes, entitiesRes] = await Promise.all([graphApi.data(), entitiesApi.list()]);
      return {
        graph: graphRes.data,
        entities: Array.isArray(entitiesRes.data) ? entitiesRes.data : [],
      };
    },
    staleTime: STALE.list,
  });

  void queryClient.prefetchQuery({
    queryKey: ["timeTracking", "summaries"],
    queryFn: () => timeTrackingApi.getAllSummaries().then((response) => response.data),
    staleTime: 5_000,
  });

  for (const type of ["ACTIVITY", "PROJECT"] as const) {
    void queryClient.prefetchQuery({
      queryKey: qk.entities(type),
      queryFn: async () => {
        const response = await entitiesApi.list();
        return (Array.isArray(response.data) ? response.data : []).filter((entity) => entity.type === type);
      },
      staleTime: STALE.list,
    });
  }
}

async function prefetchNotesAndContent() {
  const notes = await queryClient.fetchQuery({
    queryKey: qk.notes(),
    queryFn: async () => {
      const res = await notesApi.list();
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: STALE.list,
  });

  await Promise.allSettled(
    notes.map((note) =>
      queryClient.prefetchQuery({
        queryKey: qk.note(note.id),
        queryFn: () => notesApi.get(note.id).then((response) => response.data),
        staleTime: STALE.detail,
      })
    )
  );
}
