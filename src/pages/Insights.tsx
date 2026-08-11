import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonList } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FilterChips } from "@/components/ui/filter-chips";
import { FitText } from "@/components/ui/fit-text";
import { ListRowContent } from "@/components/ui/list-row-content";
import { EntityTypeIcon } from "@/components/ui/entity-type-icon";
import { StickyNote } from "@/lib/heroicons";
import { SummaryMetric, SummaryMetricRow } from "@/components/ui/summary-metric";

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

const CATEGORY_META: Record<InsightCategory, { labelKey: string; subtitleKey: string; icon: typeof FireIcon }> = {
  hotNotes: {
    labelKey: "ins_cat_hot_notes",
    subtitleKey: "ins_cat_hot_notes_sub",
    icon: FireIcon,
  },
  hotEntities: {
    labelKey: "ins_cat_hot_entities",
    subtitleKey: "ins_cat_hot_entities_sub",
    icon: UsersIcon,
  },
  worthRevisiting: {
    labelKey: "ins_cat_worth_revisiting",
    subtitleKey: "ins_cat_worth_revisiting_sub",
    icon: ClockIcon,
  },
  forgottenGems: {
    labelKey: "ins_cat_forgotten_gems",
    subtitleKey: "ins_cat_forgotten_gems_sub",
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

const formatDays = (d: number, t: (key: string, vars?: Record<string, any>) => string) => {
  if (d <= 0) return t("ins_today");
  if (d === 1) return t("ins_days_ago_1");
  if (d < 30) return t("ins_days_ago_n", { count: d });
  if (d < 365) return t("ins_months_ago", { count: Math.floor(d / 30) });
  return t("ins_years_ago", { count: Math.floor(d / 365) });
};

const BADGE_KEY_MAP: Record<string, string> = {
  "hot right now": "ins_badge_hot",
  "worth revisiting": "ins_badge_worth_revisiting",
  "forgotten gem": "ins_badge_forgotten_gem",
  "key entity": "ins_badge_key_entity",
};

const translateBadge = (badge: string, t: (key: string, vars?: Record<string, any>) => string) => {
  const key = BADGE_KEY_MAP[badge?.toLowerCase()?.trim() || ""];
  return key ? t(key) : badge;
};

const badgeStyle = (badge: string) => {
  const b = badge?.toLowerCase() || "";
  if (b.includes("hot")) return "bg-white/[0.06] text-white/90 border-white/20";
  if (b.includes("forgotten") || b.includes("gem")) return "bg-white/[0.04] text-white/70 border-white/10";
  return "bg-transparent text-white/50 border-white/10";
};

function StatChip({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="rounded-sm border-white/5 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
      {children}
    </Badge>
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
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "group flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-[13px] normal-case transition-colors",
        active ? "text-white" : "text-white/45 hover:text-white/80"
      )}
      onClick={onClick}
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
    </Button>
  );
}

/* ── Linha do Insight ───────────────────────────────────────────────── */

function InsightRow({ item }: { item: InsightItem }) {
  const { t } = useLanguage();
  return (
    <li>
      <button
        onClick={item.onOpen}
        className="group relative flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <ListRowContent
          icon={
            item.kind === "note" ? (
              <StickyNote className="h-5 w-5" />
            ) : (
              <EntityTypeIcon type={item.subtitle} className="h-5 w-5" />
            )
          }
          title={item.title}
          meta={
            <>
              {item.subtitle}
              {" · "}
              {formatDays(item.metaDetails.daysAgo, t)}
              {item.metaDetails.mentions ? ` · ${t("ins_mentions", { count: item.metaDetails.mentions })}` : ""}
              {item.metaDetails.hours ? ` · ${t("ins_hours_tracked", { hours: formatHours(item.metaDetails.hours) })}` : ""}
            </>
          }
          trailing={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("rounded-sm px-1.5 py-0 text-[9px] font-mono tracking-wider uppercase", badgeStyle(item.badge))}>
                {translateBadge(item.badge, t)}
              </Badge>
              <span className="hidden font-mono text-xs text-white/40 sm:inline">{item.score.toFixed(1)}</span>
            </div>
          }
        />
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
    if (t.clientX > 160) return; // Wider edge zone for easier grab
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeRef.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = Math.abs(t.clientY - s.y);
    // More sensitive: shorter horizontal distance, longer time window
    if (dx > 28 && dy < 100 && Date.now() - s.t < 1000) setFilterDrawerOpen(true);
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
      toast({ title: t("ins_could_not_load"), variant: "destructive" });
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
        title: item.note.title || t("ins_untitled"),
        subtitle: t("ins_note"),
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
        title: item.entity.title || t("ins_untitled"),
        subtitle: item.entity.type || t("ins_atom"),
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
        title: item.note.title || t("ins_untitled"),
        subtitle: t("ins_note"),
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
        title: item.entity.title || t("ins_untitled"),
        subtitle: item.entity.type || t("ins_atom"),
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
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">{t("ins_index")}</p>
        <NavItem label={t("ins_all_insights")} count={counts.all} active={view === "all"} onClick={() => { setView("all"); setFilterDrawerOpen(false); }} />
      </div>
      <div>
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/30">{t("ins_signals")}</p>
        <div className="space-y-0.5">
          {categoryOrder.map((cat) => (
            <NavItem
              key={cat}
              label={t(CATEGORY_META[cat].labelKey)}
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
      >
        {/* Edge swipe hint (mobile only) */}
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-1/2 z-20 hidden h-24 w-[3px] -translate-y-1/2 rounded-r bg-white/15"
        />

        {/* Menu Lateral Mobile */}
        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetContent side="left" className="w-[280px] border-white/10 bg-black/95 p-6">
            <p className="mb-6 font-serif text-2xl text-white">{t("ins_filters")}</p>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-5 lg:flex-row lg:gap-16 lg:px-12 lg:py-16">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:sticky lg:top-16 lg:block lg:w-52 lg:shrink-0 lg:self-start">
            {SidebarContent}
          </aside>

          {/* Conteúdo Principal */}
          <main className="min-w-0 flex-1">
            <header className="mb-8 hidden lg:block">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">{t("ins_intelligence")}</p>
                  <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">{t("ins_title")}</h1>
                  <p className="mt-2 text-sm text-white/50">
                    {t("ins_subtitle")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    size="sm"
                    className="gap-2"
                  >
                    <ArrowPathIcon className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                    {t("ins_refresh")}
                  </Button>
                </div>
              </div>
            </header>

            {/* Métricas superiores — mesmo padrão do Dashboard */}
            <SummaryMetricRow className="mb-6 lg:mb-8">
              <SummaryMetric label={t("ins_signals_found")} value={String(counts.all)} />
              <SummaryMetric label={t("ins_top_strength")} value={topScore.toFixed(1)} />
              <SummaryMetric
                label={t("ins_archived_gems")}
                value={String(counts.worthRevisiting + counts.forgottenGems)}
              />
            </SummaryMetricRow>


            {/* Mobile: search + category chips */}
            <div className="mb-5 space-y-3 lg:hidden">
              <div className="flex items-center gap-2">
                <div className="relative z-0 flex-1">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("ins_searchAmong", { n: counts.all }) || `Search among ${counts.all} signals…`}
                    className="h-12 w-full rounded-2xl bg-accent pl-11 text-[15px] placeholder:italic placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-2xl bg-accent"
                  onClick={() => load(true)}
                  disabled={refreshing}
                  aria-label={t("ins_refresh")}
                >
                  <ArrowPathIcon className={cn("h-4 w-4", refreshing && "animate-spin")} />
                </Button>
              </div>
              <FilterChips
                value={view}
                onChange={(v) => setView(v as View)}
                options={[
                  { value: "all", label: t("ins_all_insights") },
                  ...categoryOrder.map((cat) => ({ value: cat, label: t(CATEGORY_META[cat].labelKey) })),
                ]}
              />
            </div>

            {/* Input de Busca Sticky (desktop) */}
            <div className="sticky top-14 z-10 -mx-4 hidden border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl lg:block">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("ins_search_placeholder")}
                  className="w-full border-0 bg-transparent pl-6 text-sm text-white placeholder:italic placeholder:text-white/30 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>


            <div className="flex items-center justify-between border-b border-white/5 pb-3 pt-4 mb-4 text-[11px] text-white/40">
              <div>
                {filteredInsights.length === 1
                  ? t("ins_showing_signal", { count: filteredInsights.length })
                  : t("ins_showing_signals", { count: filteredInsights.length })}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                {t("ins_sorted_by_score")}
              </div>
            </div>

            <div className="mt-2">
              {loading ? (
                <SkeletonList rows={7} className="py-6" />
              ) : filteredInsights.length === 0 ? (
                <div className="py-24 text-center">
                  <p className="font-serif text-2xl italic text-white/40">
                    {t("ins_no_matching")}
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