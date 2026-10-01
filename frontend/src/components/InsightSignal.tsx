import { useEffect, useRef, useState } from "react";
import { insightsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FireIcon, SparklesIcon, ArrowPathIcon, KeyIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/contexts/LanguageContext";

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


const BADGE_KEY_MAP: Record<string, string> = {
  "hot right now": "ins_badge_hot",
  "worth revisiting": "ins_badge_worth_revisiting",
  "forgotten gem": "ins_badge_forgotten_gem",
  "key entity": "ins_badge_key_entity",
  hot: "ins_badge_hot",
  forgotten: "ins_badge_forgotten_gem",
};

function normalizeBadgeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BADGE_STYLE: Record<
  string,
  { icon: typeof FireIcon; classes: string }
> = {
  "hot right now": { icon: FireIcon, classes: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
  hot: { icon: FireIcon, classes: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
  "worth revisiting": { icon: ArrowPathIcon, classes: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  "forgotten gem": { icon: SparklesIcon, classes: "border-violet-500/30 bg-violet-500/10 text-violet-300" },
  forgotten: { icon: SparklesIcon, classes: "border-violet-500/30 bg-violet-500/10 text-violet-300" },
  "key entity": { icon: KeyIcon, classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
};

export function InsightSignalBadge({ kind, id, className }: { kind: Kind; id?: string; className?: string }) {
  const { t } = useLanguage();
  const signal = useInsightSignal(kind, id);
  const [open, setOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 170;
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2));
      const top = Math.max(12, rect.top - 8);
      setPopupPosition({ left, top });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerOutside = (event: PointerEvent | MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const insideTrigger = triggerRef.current?.contains(target);
      const insidePopup = popupRef.current?.contains(target);
      if (!insideTrigger && !insidePopup) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerOutside, true);
    document.addEventListener("mousedown", handlePointerOutside, true);
    document.addEventListener("touchstart", handlePointerOutside, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerOutside, true);
      document.removeEventListener("mousedown", handlePointerOutside, true);
      document.removeEventListener("touchstart", handlePointerOutside, true);
    };
  }, [open]);

  if (!signal) return null;

  const key = normalizeBadgeKey(signal.badge || "");
  const style = BADGE_STYLE[key] || {
    icon: signal.category === "hot" ? FireIcon : SparklesIcon,
    classes:
      signal.category === "hot"
        ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
        : "border-violet-500/30 bg-violet-500/10 text-violet-300",
  };
  const Icon = style.icon;
  const label = BADGE_KEY_MAP[key] ? t(BADGE_KEY_MAP[key]) : signal.badge;

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors hover:brightness-125",
          style.classes,
          className
        )}
      >
        <Icon className="h-3 w-3" />
      </button>

      {open && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label={label}
          className="fixed z-[60] rounded-md border border-white/10 bg-black/90 px-2 py-1.5 text-popover-foreground shadow-2xl backdrop-blur-xl"
          style={{
            left: `${popupPosition.left}px`,
            top: `${popupPosition.top}px`,
            width: "170px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-2">
            <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full border", style.classes)}>
              <Icon className="h-2.5 w-2.5" />
            </span>
            <p className="text-[11px] font-medium text-foreground">{label}</p>
          </div>
        </div>
      )}
    </div>
  );
}
