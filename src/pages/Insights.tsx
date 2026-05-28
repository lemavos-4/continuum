import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SparklesIcon,
  FireIcon,
  ClockIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { insightsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

/* ── Types ────────────────────────────────────────────────────────────── */

interface NoteInsight {
  note: { id: string; title: string; type?: string };
  score: number;
  badge: string;
  mentionCount: number;
  entityConnections: number;
  hoursTracked: number;
  daysSinceLastInteraction: number;
}

interface EntityInsight {
  entity: { id: string; title: string; type?: string };
  score: number;
  badge: string;
  mentionCount: number;
  relationsCount: number;
  hoursTracked: number;
  daysSinceLastMention: number;
}

type InsightCategory = "hotNotes" | "hotEntities" | "worthRevisiting" | "forgottenGems";
type View = "all" | InsightCategory;

interface InsightItem {
  id: string;
  kind: "note" | "entity";
  category: InsightCategory;
  score: number;
  badge: string;
  title: string;
  subtitle: string;
  metaDetails: {
    mentions?: number;
    links?: number;
    hours?: number;
    daysAgo: number;
  };
  onOpen: () => void;
}

/* ── Meta de Categorias ──────────────────────────────────────────────── */

const CATEGORY_META: Record<InsightCategory, { label: string; subtitle: string; icon: typeof FireIcon }> = {
  hotNotes: {
    label: "Hot notes",
    subtitle: "Recent notes with the strongest signal.",
    icon: FireIcon,
  },
  hotEntities: {
    label: "Key people & projects",
    subtitle: "Entities appearing frequently across your graph.",
    icon: UsersIcon,
  },
  worthRevisiting: {
    label: "Worth revisiting",
    subtitle: "Valuable notes that haven't been touched lately.",
    icon: ClockIcon,
  },
  forgottenGems: {
    label: "Forgotten gems",
    subtitle: "Entities that once mattered and deserve another look.",
    icon: ArrowTrendingUpIcon,
  },
};

const categoryOrder: InsightCategory[] = ["hotNotes", "hotEntities", "worthRevisiting", "forgottenGems"];

/* ── Helpers de Formatação e Estilo ─────────────────────────────────── */

const formatHours = (h: number) => {
  if (!h) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h < 10 ? 1 : 0)}h`;
};

const formatDays = (d: number) => {
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const badgeStyle = (badge: string) => {
  const b = badge?.toLowerCase() || "";
  if (b.includes("hot")) return "bg-white/[0.06] text-white/90 border-white/20";
  if (b.includes("forgotten") || b.includes("gem")) return "bg-white/[0.04] text-white/70 border-white/10";
  return "bg-transparent text-white/50 border-white/10";
};

function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-white/5 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
      {children}
    </span>
  );
}

/* ── Sidebar Nav Item ─────────────────────────────────────────────────── */

interface NavItemProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function NavItem({ label, count, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[13px] transition-colors",
        active ? "text-white" : "text-white/45 hover:text-white/80"
      )}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-px w-3 transition-all",
            active ? "bg-white w-5" : "bg-white/20 group-hover:bg-white/40"
          )}
        />
        {label}
      </span>
      <span className={cn("font-mono text-[10px] tabular-nums", active ? "text-white/60" : "text-white/30")}>
        {count}
      </span>
    </button>
  );
}

/* ── Linha do Insight ───────────────────────────────────────────────── */

function InsightRow({ item }: { item: InsightItem }) {
  return (
    <li>
      <button
        onClick={item.onOpen}
        className="group relative flex w-full items-start gap-4 py-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-8 w-px -translate-x-3 -translate-y-1/2 bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />

        <div className="hidden w-16 shrink-0 pt-1 sm:block">
          <p className="font-mono text-xs font-medium text-white/40 group-hover:text-white/80 transition-colors">
            {item.score.toFixed(1)}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className={cn("rounded-sm px-1.5 py-0 text-[9px] font-mono tracking-wider uppercase", badgeStyle(item.badge))}>
              {item.badge}
            </Badge>
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">
              {item.subtitle}
            </span>
          </div>

          <h3 className="mt-2 font-serif text-xl leading-snug text-white/95 group-hover:text-white transition-colors">
            {item.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {item.metaDetails.mentions ? <StatChip>{item.metaDetails.mentions} mentions</StatChip> : null}
            {item.metaDetails.links ? <StatChip>{item.metaDetails.links} links</StatChip> : null}
            {item.metaDetails.hours ? <StatChip>{formatHours(item.metaDetails.hours)} tracked</StatChip> : null}
            <StatChip>{formatDays(item.metaDetails.daysAgo)}</StatChip>
          </div>
        </div>
      </button>
    </li>
  );
}

/* ── Componente Principal ─────────────────────────────────────────────── */

export default function Insights() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [hotNotes, setHotNotes] = useState<NoteInsight[]>([]);
  const [forgottenNotes, setForgottenNotes] = useState<NoteInsight[]>([]);
  const [hotEntities, setHotEntities] = useState<EntityInsight[]>([]);
  const [forgottenEntities, setForgottenEntities] = useState<EntityInsight[]>([]);
  
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Edge swipe to open mobile filter drawer
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const onSwipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t.clientX > 96) return; // Only left edge (0-96px)
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x; // Δx (horizontal)
    const dy = Math.abs(t.clientY - s.y); // Δy (vertical)
    // Opens drawer if: >50px horizontal, <80px vertical, <700ms
    if (dx > 50 && dy < 80 && Date.now() - s.t < 700) setFilterDrawerOpen(true);
    swipeRef.current = null;
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [hn, fn, he, fe] = await Promise.all([
        insightsApi.hotNotes(12),
        insightsApi.forgottenNotes(12),
        insightsApi.hotEntities(12),
        insightsApi.forgottenEntities(12),
      ]);

      setHotNotes(hn.data || []);
      setForgottenNotes(fn.data || []);
      setHotEntities(he.data || []);
      setForgottenEntities(fe.data || []);
    } catch {
      toast({ title: "Could not load insights", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const insights = useMemo(() => {
    const items: InsightItem[] = [];

    hotNotes.forEach((item) => {
      items.push({
        id: item.note.id,
        kind: "note",
        category: "hotNotes",
        score: item.score,
        badge: item.badge,
        title: item.note.title || "Untitled",
        subtitle: "Note",
        metaDetails: { mentions: item.mentionCount, links: item.entityConnections, hours: item.hoursTracked, daysAgo: item.daysSinceLastInteraction },
        onOpen: () => navigate(`/notes/${item.note.id}`),
      });
    });

    hotEntities.forEach((item) => {
      items.push({
        id: item.entity.id,
        kind: "entity",
        category: "hotEntities",
        score: item.score,
        badge: item.badge,
        title: item.entity.title || "Untitled",
        subtitle: item.entity.type || "Atom",
        metaDetails: { mentions: item.mentionCount, links: item.relationsCount, hours: item.hoursTracked, daysAgo: item.daysSinceLastMention },
        onOpen: () => navigate(`/entities/${item.entity.id}`),
      });
    });

    forgottenNotes.forEach((item) => {
      items.push({
        id: item.note.id,
        kind: "note",
        category: "worthRevisiting",
        score: item.score,
        badge: item.badge,
        title: item.note.title || "Untitled",
        subtitle: "Note",
        metaDetails: { mentions: item.mentionCount, links: item.entityConnections, hours: item.hoursTracked, daysAgo: item.daysSinceLastInteraction },
        onOpen: () => navigate(`/notes/${item.note.id}`),
      });
    });

    forgottenEntities.forEach((item) => {
      items.push({
        id: item.entity.id,
        kind: "entity",
        category: "forgottenGems",
        score: item.score,
        badge: item.badge,
        title: item.entity.title || "Untitled",
        subtitle: item.entity.type || "Atom",
        metaDetails: { mentions: item.mentionCount, links: item.relationsCount, hours: item.hoursTracked, daysAgo: item.daysSinceLastMention },
        onOpen: () => navigate(`/entities/${item.entity.id}`),
      });
    });

    return items.sort((a, b) => b.score - a.score);
  }, [hotNotes, hotEntities, forgottenNotes, forgottenEntities, navigate]);

  const filteredInsights = useMemo(() => {
    const query = search.trim().toLowerCase();
    return insights.filter((item) => {
      if (view !== "all" && item.category !== view) return false;
      if (!query) return true;
      return `${item.title} ${item.subtitle} ${item.badge}`.toLowerCase().includes(query);
    });
  }, [insights, search, view]);

  const counts = {
    all: insights.length,
    hotNotes: hotNotes.length,
    hotEntities: hotEntities.length,
    worthRevisiting: forgottenNotes.length,
    forgottenGems: forgottenEntities.length,
  };

  const topScore = Math.max(0, ...insights.map((item) => item.score));

  const SidebarContent = (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">Index</p>
        <NavItem label="All insights" count={counts.all} active={view === "all"} onClick={() => { setView("all"); setFilterDrawerOpen(false); }} />
      </div>
      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">Signals</p>
        <div className="space-y-0.5">
          {categoryOrder.map((cat) => (
            <NavItem
              key={cat}
              label={CATEGORY_META[cat].label}
              count={counts[cat]}
              active={view === cat}
              onClick={() => { setView(cat); setFilterDrawerOpen(false); }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div
        className="relative min-h-full"
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
      >
        {/* Edge swipe hint (mobile only) */}
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-1/2 z-20 hidden h-24 w-[3px] -translate-y-1/2 rounded-r bg-white/15 max-lg:block"
        />

        {/* Menu Lateral Mobile */}
        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetContent side="left" className="w-[280px] border-white/10 bg-black/95 p-6">
            <p className="mb-6 font-serif text-2xl text-white">Filters</p>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 lg:flex-row lg:gap-16 lg:px-12 lg:py-16">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:sticky lg:top-16 lg:block lg:w-52 lg:shrink-0 lg:self-start">
            {SidebarContent}
          </aside>

          {/* Conteúdo Principal */}
          <main className="min-w-0 flex-1">
            <header className="mb-8">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">Intelligence</p>
                  <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">{t("insights_title")}</h1>
                  <p className="mt-2 text-sm text-white/50">
                    Surface structures that matter most across your graph.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setFilterDrawerOpen(true)}
                    className="grid h-9 w-9 place-items-center rounded-sm border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white lg:hidden"
                    aria-label="Open filters"
                  >
                    <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 h-9 border border-white/15 bg-transparent hover:border-white/40 text-white/80 hover:text-white px-4 rounded-sm text-sm font-medium transition-colors disabled:opacity-40"
                  >
                    <ArrowPathIcon className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                    Refresh
                  </button>
                </div>
              </div>
            </header>

            {/* Métricas Superiores em Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 mb-8">
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-sm">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono">Signals Found</p>
                <p className="mt-2 text-2xl font-mono tracking-tight text-white">{counts.all}</p>
              </div>
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-sm">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono">Top Strength</p>
                <p className="mt-2 text-2xl font-mono tracking-tight text-white">{topScore.toFixed(1)}</p>
              </div>
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-sm col-span-2 md:col-span-1">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono">Archived Gems</p>
                <p className="mt-2 text-2xl font-mono tracking-tight text-white">{counts.worthRevisiting + counts.forgottenGems}</p>
              </div>
            </div>

            {/* Input de Busca Sticky */}
            <div className="sticky top-14 z-10 -mx-4 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search insights by title, type or strength…"
                  className="w-full border-0 bg-transparent pl-6 text-sm text-white placeholder:italic placeholder:text-white/30 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-3 pt-4 mb-4 text-[11px] text-white/40">
              <div>
                Showing {filteredInsights.length} {filteredInsights.length === 1 ? "signal" : "signals"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                Sorted by signal score
              </div>
            </div>

            <div className="mt-2">
              {loading ? (
                <div className="flex justify-center py-24">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-white/30" />
                </div>
              ) : filteredInsights.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="font-serif text-2xl italic text-white/40">
                    No matching insights found.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {filteredInsights.map((item) => (
                    <InsightRow key={`${item.kind}-${item.id}-${item.category}`} item={item} />
                  ))}
                </ul>
              )}
            </div>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}