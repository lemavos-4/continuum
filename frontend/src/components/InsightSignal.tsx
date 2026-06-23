import { useEffect, useState } from "react";
import { insightsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FireIcon, SparklesIcon } from "@heroicons/react/24/outline";

/**
 * Loads insights once per session and resolves the most relevant
 * badge for a given note/entity id (hot / forgotten / key / none).
 *
 * Cached in-module so listings don't refetch per row.
 */

type Kind = "note" | "entity";
type CacheEntry = {
  byId: Map<string, { badge: string; score: number; category: "hot" | "forgotten" }>;
  fetchedAt: number;
};

const CACHE: Record<Kind, CacheEntry | null> = { note: null, entity: null };
const CACHE_TTL_MS = 5 * 60 * 1000;

let pending: Record<Kind, Promise<CacheEntry> | null> = { note: null, entity: null };

async function loadCache(kind: Kind): Promise<CacheEntry> {
  const existing = CACHE[kind];
  if (existing && Date.now() - existing.fetchedAt < CACHE_TTL_MS) return existing;
  if (pending[kind]) return pending[kind]!;

  pending[kind] = (async () => {
    const [hot, forgotten] = await Promise.all(
      kind === "note"
        ? [insightsApi.hotNotes(50), insightsApi.forgottenNotes(50)]
        : [insightsApi.hotEntities(50), insightsApi.forgottenEntities(50)]
    );
    const byId = new Map<string, { badge: string; score: number; category: "hot" | "forgotten" }>();
    (hot.data || []).forEach((it: any) => {
      const id = kind === "note" ? it.note?.id : it.entity?.id;
      if (id) byId.set(id, { badge: it.badge || "Hot", score: it.score, category: "hot" });
    });
    (forgotten.data || []).forEach((it: any) => {
      const id = kind === "note" ? it.note?.id : it.entity?.id;
      if (!id) return;
      if (!byId.has(id)) byId.set(id, { badge: it.badge || "Forgotten Gem", score: it.score, category: "forgotten" });
    });
    const entry = { byId, fetchedAt: Date.now() };
    CACHE[kind] = entry;
    pending[kind] = null;
    return entry;
  })();
  return pending[kind]!;
}

export function useInsightSignal(kind: Kind, id?: string) {
  const [data, setData] = useState<{ badge: string; score: number; category: "hot" | "forgotten" } | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    loadCache(kind)
      .then((cache) => {
        if (!active) return;
        setData(cache.byId.get(id) || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [kind, id]);
  return data;
}

export function InsightSignalBadge({ kind, id, className }: { kind: Kind; id?: string; className?: string }) {
  const signal = useInsightSignal(kind, id);
  if (!signal) return null;
  const isHot = signal.category === "hot";
  const Icon = isHot ? FireIcon : SparklesIcon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 border text-[9px] font-medium uppercase tracking-wider",
        isHot
          ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
          : "border-violet-500/30 bg-violet-500/10 text-violet-300",
        className
      )}
      title={`${signal.badge} · score ${signal.score.toFixed(1)}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {signal.badge}
    </Badge>
  );
}
