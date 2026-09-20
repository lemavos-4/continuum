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
    prefetchNotesAndContent(notes),
    prefetchQuery(qk.noteTypes(), () => notesApi.getTypes().then((res) => res.data), STALE.list),
    prefetchQuery(qk.folders(), () => foldersApi.list().then((res) => res.data), STALE.list),
    prefetchVaultFiles(),
    prefetchQuery(["vault", "entity-index"], () => vaultApi.entityIndex().then((res) => res.data), STALE.list),
    prefetchQuery(["account", "preferences"], () => preferencesApi.get().then((res) => res.data), STALE.preferences),
    prefetchQuery(qk.graph(), async () => {
      const [graphRes, entitiesRes] = await Promise.all([graphApi.data(), entitiesApi.list()]);
      return { graph: graphRes.data, entities: entitiesRes.data };
    }, STALE.list),
    prefetchQuery(qk.insights("all", 12), async () => {
      const [hn, fn, he, fe] = await Promise.all([
        insightsApi.hotNotes(12), insightsApi.forgottenNotes(12),
        insightsApi.hotEntities(12), insightsApi.forgottenEntities(12),
      ]);
      return { hotNotes: hn.data || [], forgottenNotes: fn.data || [], hotEntities: he.data || [], forgottenEntities: fe.data || [] };
    }, STALE.insights),
    prefetchQuery(["timeTracking", "summaries"], () => timeTrackingApi.getAllSummaries().then((res) => res.data), 5_000),
    prefetchQuery(["tracking", "today"], () => trackingApi.today().then((res) => res.data), STALE.list),
    prefetchQuery(qk.dashboard(), () => dashboardApi.summary().then((res) => res.data), STALE.insights),
    prefetchQuery(["metrics", "dashboard"], () => metricsApi.dashboard().then((res) => res.data), STALE.insights),
    prefetchQuery(["subscription", "me"], () => subscriptionApi.me().then((res) => res.data), STALE.preferences),
    ...prefetchEntityDetails(entities),
  ]);
}

function prefetchQuery<T>(queryKey: readonly unknown[], queryFn: () => Promise<T>, staleTime: number) {
  return queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
}

async function prefetchNotesAndContent(notes: Array<{ id: string }>) {
  await Promise.allSettled(
    notes.flatMap((note) => [
      prefetchQuery(qk.note(note.id), () => notesApi.get(note.id).then((response) => response.data), STALE.detail),
      prefetchQuery(["notes", "backlinks", note.id], () => notesApi.getBacklinks(note.id).then((response) => response.data), STALE.detail),
      prefetchQuery(["notes", "forward-links", note.id], () => notesApi.getForwardLinks(note.id).then((response) => response.data), STALE.detail),
      prefetchQuery(["notes", "backlink-count", note.id], () => notesApi.getBacklinkCount(note.id).then((response) => response.data), STALE.detail),
    ])
  );
}

async function prefetchVaultFiles() {
  const files = await queryClient.fetchQuery({
    queryKey: qk.vaultFiles(),
    queryFn: async () => {
      const res = await vaultApi.list();
      return Array.isArray(res.data) ? (res.data as VaultFile[]) : [];
    },
    staleTime: STALE.list,
  });

  await Promise.allSettled(files.map((file) => resolveVaultBlob(file.id)));
}

function prefetchEntityDetails(entities: Entity[]) {
  return entities.flatMap((entity) => [
    prefetchQuery(qk.entity(entity.id), () => entitiesApi.get(entity.id).then((res) => res.data), STALE.detail),
    prefetchQuery(["entities", "context", entity.id], () => entitiesApi.getContext(entity.id).then((res) => res.data), STALE.detail),
    prefetchQuery(qk.entityNotes(entity.id), () => entitiesApi.getNotes(entity.id).then((res) => res.data), STALE.detail),
    prefetchQuery(qk.entityConnections(entity.id), () => entitiesApi.getConnections(entity.id).then((res) => res.data), STALE.detail),
    prefetchQuery(qk.entityStats(entity.id), () => entitiesApi.stats(entity.id).then((res) => res.data), STALE.detail),
    prefetchQuery(qk.entityHeatmap(entity.id), () => entitiesApi.heatmap(entity.id).then((res) => res.data), STALE.detail),
  ]);
}
