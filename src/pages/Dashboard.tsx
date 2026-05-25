import { Children, ComponentType, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi, graphApi, metricsApi, notesApi, vaultApi, insightsApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getPlanLimits } from "@/lib/plan";
import { Progress } from "@/components/ui/progress";
import { ChartContainer } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Share2,
  Activity,
  FolderOpen,
  ArrowRight,
  HardDrive,
  Network,
  FileText,
  Tag,
  Flame,
  Users,
  Clock,
  TrendingUp,
  StickyNote,
  RefreshCw
} from "@/lib/heroicons";

// --- TYPES & HELPERS ---
interface NoteInsight {
  note: { id: string; title: string; type?: string; entityIds?: string[]; updatedAt?: string; };
  score: number;
  badge: string;
  mentionCount: number;
  recentMentions: number;
  hoursTracked: number;
  entityConnections: number;
  uniqueDaysReferenced: number;
  daysSinceLastInteraction: number;
}

interface EntityInsight {
  entity: { id: string; title: string; type?: string; };
  score: number;
  badge: string;
  mentionCount: number;
  recentMentions: number;
  hoursTracked: number;
  relationsCount: number;
  uniqueDaysMentioned: number;
  daysSinceLastMention: number;
}

const rangeDaysMap = {
  "14d": 14,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "total": 3650,
};
type TimeRange = keyof typeof rangeDaysMap;

const formatHours = (h: number) => {
  if (!h) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h < 10 ? 1 : 0)}h`;
};

const formatDays = (d: number) => {
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
};

const badgeStyle = (badge: string) => {
  const b = badge?.toLowerCase() || "";
  if (b.includes("hot")) return "bg-white/[0.06] text-white/90 border-white/20";
  if (b.includes("forgotten") || b.includes("gem")) return "bg-white/[0.04] text-white/70 border-white/10";
  return "bg-transparent text-white/50 border-white/10";
};

const formatNoteDate = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// --- SUB-COMPONENTS ---
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
      <div className="h-16 rounded-2xl bg-neutral-900/40 border border-white/5 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-[360px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-4 h-[360px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
      </div>
    </div>
  </AppLayout>
);

function StatCard({ icon: Icon, label, value, hint }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string; }) {
  return (
    <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex flex-col gap-1 min-w-0 shadow-inner transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/30">
      <div className="flex items-center gap-1.5 text-white/50">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold truncate">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-white/95 tabular-nums leading-none mt-1 truncate">{value}</p>
      {hint && <p className="text-[10px] sm:text-[11px] text-white/40 truncate mt-0.5">{hint}</p>}
    </div>
  );
}

function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-white/5 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
      {children}
    </span>
  );
}

function NoteCard({ item, onOpen }: { item: NoteInsight; onOpen: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col gap-2.5 overflow-hidden rounded-xl border border-white/5 bg-neutral-900/40 p-3.5 text-left shadow-sm",
        "transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("border text-[9px] font-medium px-1.5 py-0 shadow-sm", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[9px] text-white/50">{item.score.toFixed(1)}</span>
      </div>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="mt-0.5 rounded-lg bg-white/[0.06] p-1 border border-white/5 shrink-0">
          <StickyNote className="h-3.5 w-3.5 text-neutral-400" />
        </div>
        <h3 className="line-clamp-2 text-xs sm:text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{item.note.title || "Untitled"}</h3>
      </div>
      <div className="mt-auto flex flex-wrap gap-1 pt-2 border-t border-white/5">
        {item.mentionCount > 0 && <StatChip>{item.mentionCount} m</StatChip>}
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)}</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastInteraction)}</StatChip>
      </div>
    </motion.button>
  );
}

function EntityCard({ item, onOpen }: { item: EntityInsight; onOpen: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col gap-2.5 overflow-hidden rounded-xl border border-white/5 bg-neutral-900/40 p-3.5 text-left shadow-sm",
        "transition-all duration-300 hover:border-white/10 hover:bg-neutral-900/60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn("border text-[9px] font-medium px-1.5 py-0 shadow-sm", badgeStyle(item.badge))}>
          {item.badge}
        </Badge>
        <span className="font-mono text-[9px] text-white/50">{item.score.toFixed(1)}</span>
      </div>
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="mt-0.5 rounded-lg bg-white/[0.06] p-1 border border-white/5 shrink-0">
          <Network className="h-3.5 w-3.5 text-neutral-400" />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-xs sm:text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{item.entity.title}</h3>
          {item.entity.type && (
            <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/50 truncate">{item.entity.type}</p>
          )}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-1 pt-2 border-t border-white/5">
        {item.mentionCount > 0 && <StatChip>{item.mentionCount} m</StatChip>}
        {item.hoursTracked > 0 && <StatChip>{formatHours(item.hoursTracked)}</StatChip>}
        <StatChip>{formatDays(item.daysSinceLastMention)}</StatChip>
      </div>
    </motion.button>
  );
}

function DashboardInsightSection({
  title, subtitle, icon: Icon, children, empty, loading, className, onRefresh, refreshing, viewMoreHref, viewMoreLabel, gridColsClass = "grid-cols-1"
}: {
  title: string; subtitle?: string; icon: ComponentType<{ className?: string }>; children: ReactNode; empty: boolean; loading: boolean; className?: string; onRefresh?: () => void; refreshing?: boolean; viewMoreHref?: string; viewMoreLabel?: string; gridColsClass?: string;
}) {
  const navigate = useNavigate();
  const items = Children.toArray(children);
  const previewItems = items.slice(0, 4);
  const expandedItems = items.slice(4, 10);
  const totalCount = items.length;
  const visibleCount = Math.min(10, totalCount);
  const showAccordion = !loading && !empty && items.length > 4;

  return (
    <div className={cn("border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 sm:p-6 flex flex-col shadow-inner", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-400" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-neutral-200">{title}</h2>
            {subtitle && <p className="text-[11px] text-white/50">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 mt-1 sm:mt-0 border-t border-white/5 sm:border-none pt-2 sm:pt-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="text-[11px] sm:text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
              <span>Refresh</span>
            </button>
          )}
          {viewMoreHref && (
            <button
              type="button"
              onClick={() => navigate(viewMoreHref)}
              className="text-[11px] sm:text-xs text-white/50 hover:text-white transition-colors"
            >
              {viewMoreLabel || "View all"}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between min-h-0">
        {loading ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-[120px] w-full animate-pulse rounded-xl border border-white/5 bg-neutral-900/30" />
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-6 text-center text-xs text-white/30 h-full flex flex-col items-center justify-center min-h-[120px]">
            Nothing to show yet.
          </div>
        ) : (
          <>
            <div className={cn("grid gap-3", gridColsClass)}>{previewItems}</div>
            {showAccordion ? (
              <Accordion type="single" collapsible className="mt-3">
                <AccordionItem value={title} className="border-none">
                  <AccordionTrigger className="px-0 py-0 hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.01] px-3 py-2 text-xs font-medium text-white/50 hover:bg-white/[0.02] transition-colors">
                      <span>Show {visibleCount - previewItems.length} more</span>
                      <span>{visibleCount} of {totalCount}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pt-3 pb-0">
                    <div className={cn("grid gap-3 mb-3", gridColsClass)}>
                      {expandedItems}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[10px] text-white/40 pt-2 border-t border-white/5">
                      <span>{totalCount > visibleCount ? `Showing ${visibleCount} of ${totalCount}` : `Showing all ${visibleCount}`}</span>
                      {viewMoreHref && (
                        <button
                          type="button"
                          onClick={() => navigate(viewMoreHref)}
                          className="text-white/50 hover:text-white transition-colors"
                        >
                          {viewMoreLabel || "View all"}
                        </button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// --- MAIN DASHBOARD ---
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usage, applyUsageDelta } = usePlanGate();
  const limits = getPlanLimits(user);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("14d");

  // Insights State
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [hotNotes, setHotNotes] = useState<NoteInsight[]>([]);
  const [forgottenNotes, setForgottenNotes] = useState<NoteInsight[]>([]);
  const [hotEntities, setHotEntities] = useState<EntityInsight[]>([]);
  const [forgottenEntities, setForgottenEntities] = useState<EntityInsight[]>([]);

  const loadInsights = async (silent = false) => {
    if (!silent) setInsightsLoading(true);
    else setRefreshingInsights(true);
    try {
      const [hn, fn, he, fe] = await Promise.all([
        insightsApi.hotNotes(12),
        insightsApi.forgottenNotes(12),
        insightsApi.hotEntities(12),
        insightsApi.forgottenEntities(12),
      ]);
      
      const extractData = (res: any) => {
        if (!res) return [];
        const d = res.data;
        if (Array.isArray(d)) return d;
        if (d && typeof d === 'object') {
          return d.items || d.content || d.data || d.insights || [];
        }
        return [];
      };

      setHotNotes(extractData(hn));
      setForgottenNotes(extractData(fn));
      setHotEntities(extractData(he));
      setForgottenEntities(extractData(fe));
    } catch (err) {
      toast({ title: "Couldn't load insights", description: "Please try again.", variant: "destructive" });
    } finally {
      setInsightsLoading(false);
      setRefreshingInsights(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { authApi } = await import("@/lib/api");
      const res = await authApi.exportData();
      const json = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "continuum-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", "list"],
    queryFn: () => notesApi.list().then((r) => r.data),
  });

  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then((r) => r.data),
  });

  const {
    data: scoreTimeline,
    isLoading: scoreTimelineLoading,
    isFetching: scoreTimelineFetching,
    isError: scoreTimelineError,
    refetch: refetchScoreTimeline,
  } = useQuery({
    queryKey: ["metrics", "scoreTimeline"],
    queryFn: () => metricsApi.scoreTimeline().then((r) => r.data),
    retry: 1,
    staleTime: 60_000,
  });

  const { data: vaultFiles } = useQuery({
    queryKey: ["vault", "files"],
    queryFn: () => vaultApi.list().then((r) => r.data),
  });

  const vaultFilesList = useMemo(() => {
    if (Array.isArray(vaultFiles)) return vaultFiles;
    if (vaultFiles && typeof vaultFiles === 'object') {
      return (vaultFiles as any).files || (vaultFiles as any).data || (vaultFiles as any).content || [];
    }
    return [];
  }, [vaultFiles]);

  const vaultUsedMB = useMemo(() => {
    return vaultFilesList.reduce((t: number, f: any) => t + (f?.size ?? 0) / (1024 * 1024), 0) ?? 0;
  }, [vaultFilesList]);

  const vaultMaxMB = limits.maxVaultSizeMB;
  const storageUsed = `${vaultUsedMB.toFixed(1)} MB`;
  const storageLimit = vaultMaxMB === -1 ? "Unlimited" : `${vaultMaxMB} MB`;

  useEffect(() => {
    if (vaultFilesList == null || usage == null || vaultFilesList.length === 0) return;
    const storageMB = Number(vaultUsedMB.toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [vaultFilesList, vaultUsedMB, usage, applyUsageDelta]);

  const recentNotes = useMemo(() => {
    const summaryNotes = summary?.recentNotes || (summary && typeof summary === 'object' ? ((summary as any).notes || (summary as any).data) : null);
    if (Array.isArray(summaryNotes) && summaryNotes.length > 0) {
      return summaryNotes.slice(0, 6);
    }
    const notesList = Array.isArray(notes) ? notes : (notes && typeof notes === 'object' ? ((notes as any).notes || (notes as any).data || (notes as any).content || []) : []);
    if (!Array.isArray(notesList) || notesList.length === 0) return [];
    return [...notesList]
      .filter((note: any) => note && (note.createdAt || note.updatedAt))
      .sort((a: any, b: any) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime())
      .slice(0, 6)
      .map((note: any) => ({
        id: note.id,
        title: note.title,
        createdAtTimestamp: new Date(note.createdAt || note.updatedAt).getTime(),
      }));
  }, [summary, notes]);

  const graphNodeCount = useMemo(() => {
    if (graphData?.nodes) return graphData.nodes.length;
    if (Array.isArray(graphData)) return graphData.length;
    if (graphData && typeof graphData === 'object') return (graphData as any).totalNodes || (graphData as any).count || 0;
    return 0;
  }, [graphData]);

  const totalNotes = useMemo(() => {
    if (summary?.stats?.totalNotes !== undefined) return summary.stats.totalNotes;
    if ((summary as any)?.totalNotes !== undefined) return (summary as any).totalNotes;
    const notesList = Array.isArray(notes) ? notes : (notes && typeof notes === 'object' ? ((notes as any).notes || (notes as any).data || (notes as any).content || []) : []);
    if (Array.isArray(notesList)) return notesList.length;
    return 0;
  }, [summary, notes]);

  const totalEntities = useMemo(() => {
    if (summary?.stats?.totalEntities !== undefined) return summary.stats.totalEntities;
    if ((summary as any)?.totalEntities !== undefined) return (summary as any).totalEntities;
    return 0;
  }, [summary]);

  const { currentScore, fullHistory } = useMemo(() => {
    const rawHistory = Array.isArray(scoreTimeline)
      ? scoreTimeline
      : scoreTimeline && typeof scoreTimeline === "object"
        ? ((scoreTimeline as any).history ?? (scoreTimeline as any).timeline ?? (scoreTimeline as any).points ?? (scoreTimeline as any).data ?? [])
        : [];

    const normalized = rawHistory.reduce((acc: any[], point: any) => {
      if (!point?.date) return acc;
      const scoreValue = point.score !== undefined ? Number(point.score) : Number(point.value ?? 0);
      const dateStr = String(point.date).includes("T") ? point.date : `${point.date}T00:00:00`;
      const date = new Date(dateStr);
      if (!Number.isNaN(date.getTime()) && !Number.isNaN(scoreValue)) {
        acc.push({
          date: String(point.date).slice(0, 10),
          ts: date.getTime(),
          score: Number(scoreValue.toFixed(2)),
        });
      }
      return acc;
    }, [] as Array<{ date: string; ts: number; score: number }>);

    normalized.sort((a, b) => a.ts - b.ts);

    return {
      currentScore: normalized.length > 0 ? normalized[normalized.length - 1].score : 0,
      fullHistory: normalized,
    };
  }, [scoreTimeline]);

  // Local filtering by selected time range.
  const scoreTimelineData = useMemo(() => {
    const days = rangeDaysMap[timeRange];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = (timeRange === "total" ? fullHistory : fullHistory.filter((p) => p.ts >= cutoff));

    if (filtered.length === 0) {
      // Render a flat zero baseline so the chart doesn't look broken.
      const today = new Date();
      const cappedDays = Math.min(days, 90);
      return Array.from({ length: cappedDays }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (cappedDays - 1 - i));
        return {
          date: d.toISOString().slice(0, 10),
          ts: d.getTime(),
          score: 0,
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      });
    }

    return filtered.map((p) => ({
      ...p,
      label: new Date(p.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  }, [fullHistory, timeRange]);

  const scoreStats = useMemo(() => {
    const values = scoreTimelineData.map((p: any) => p.score);
    const max = Math.max(...values, 0.1);
    const hasData = scoreTimelineData.some((p: any) => p.score > 0);
    return { current: currentScore, max, hasData };
  }, [scoreTimelineData, currentScore]);

  if (summaryLoading) return <DashboardSkeleton />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();
  const displayName = user?.username || user?.email?.split("@")[0] || "there";

  return (
    <AppLayout>
      <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="border-b border-white/5 pb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-white/40 font-semibold mb-0.5">Overview</p>
            <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-white/95">
              {greeting}, {displayName}
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              Here's what's happening across your knowledge graph.
            </p>
          </div>
        </header>

        {/* CONTADORES / CARDS KPI */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={FileText} label="Notes" value={totalNotes} hint={limits.maxNotes === -1 ? "Unlimited" : `of ${limits.maxNotes}`} />
          <StatCard icon={Tag} label="Entities" value={totalEntities} hint={limits.maxEntities === -1 ? "Unlimited" : `of ${limits.maxEntities}`} />
          <StatCard icon={Network} label="Graph nodes" value={graphNodeCount} hint="In your network" />
          <StatCard icon={HardDrive} label="Storage" value={storageUsed} hint={`of ${storageLimit}`} />
        </section>

        {/* CORPO DO DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* BLOCO 1: PERFORMANCE & METRICS */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:col-span-8 flex flex-col justify-between shadow-inner">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                    <Share2 className="h-4 w-4 text-neutral-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-200">Score evolution</h2>
                    <p className="text-xs text-white/50\">Knowledge graph gravity index</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-white/50 font-semibold">Current</p>
                    <p className="font-mono text-lg sm:text-xl text-white/95 tabular-nums leading-none mt-0.5">
                      {scoreStats.current.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchScoreTimeline()}
                    disabled={scoreTimelineFetching}
                    className="text-xs text-white/50 hover:text-white hidden sm:flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3 w-3", scoreTimelineFetching && "animate-spin")} />
                    Score
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/insights")}
                    className="text-xs text-white/50 hover:text-white hidden sm:block transition-colors"
                  >
                    Insights →
                  </button>
                </div>
              </div>

              {/* BARRA SELETORA DE PERÍODO */}
              <div className="flex items-center -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none gap-1 border-y sm:border border-white/5 sm:rounded-xl bg-white/[0.01] p-1.5">
                {(Object.keys(rangeDaysMap) as TimeRange[]).map((range) => {
                  const labels: Record<TimeRange, string> = {
                    "14d": "14 Days",
                    "1mo": "1 Month",
                    "3mo": "3 Months",
                    "6mo": "6 Months",
                    "1y": "1 Year",
                    "total": "All Time"
                  };
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        "text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all shrink-0",
                        timeRange === range 
                          ? "bg-white/10 text-white border border-white/10 shadow-sm" 
                          : "text-white/40 hover:text-white/70 border border-transparent"
                      )}
                    >
                      {labels[range]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-[200px] sm:h-[250px] w-full -mx-2 relative">
              {scoreTimelineLoading && scoreTimelineData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                  Loading score history…
                </div>
              ) : !scoreStats.hasData ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-4">
                  <p className="text-xs text-white/40">No score history yet</p>
                  <p className="text-[11px] text-white/30">Create notes and entities to build your knowledge gravity.</p>
                </div>
              ) : (
                <>
                  {/* Alerta visual de falha na sincronização */}
                  {scoreTimelineError && (
                    <div className="absolute right-2 top-1 z-10 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
                      Failed to sync score
                    </div>
                  )}
                  <ChartContainer config={{}} className="h-full w-full">
                    <AreaChart data={scoreTimelineData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.22} />
                          <stop offset="60%" stopColor="hsl(var(--foreground))" stopOpacity={0.06} />
                          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--foreground) / 0.04)" strokeDasharray="2 6" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        tickMargin={8}
                        minTickGap={32}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 1)]}
                        tickFormatter={(value) => Number(value).toFixed(0)}
                        width={32}
                        tickCount={4}
                      />
                      <Tooltip
                        cursor={{ stroke: "hsl(var(--foreground) / 0.2)", strokeWidth: 1, strokeDasharray: "3 3" }}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                          fontSize: 11,
                          color: "hsl(var(--foreground))",
                          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.6)",
                          padding: "8px 10px",
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10, marginBottom: 4 }}
                        formatter={(value) => [Number(value as number).toFixed(2), "Score"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={1.75}
                        fill="url(#scoreFill)"
                        dot={false}
                        activeDot={{ r: 4, fill: "hsl(var(--foreground))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                        isAnimationActive
                        animationDuration={500}
                      />
                    </AreaChart>
                  </ChartContainer>
                </>
              )}
            </div>
          </div>

          {/* PLAN USAGE CARD */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:col-span-4 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-neutral-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-neutral-200">Plan usage</h2>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/60 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-md">
                  {user?.plan || "FREE"}
                </span>
              </div>

              {usage ? (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Notes</span>
                      <span className="text-white/80 font-mono text-[11px] tabular-nums">
                        {usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}
                      </span>
                    </div>
                    <Progress value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Entities</span>
                      <span className="text-white/80 font-mono text-[11px] tabular-nums">
                        {usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}
                      </span>
                    </div>
                    <Progress value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">Vault storage</span>
                      <span className="text-white/80 font-mono text-[11px] tabular-nums">{storageUsed} / {storageLimit}</span>
                    </div>
                    <Progress value={limits.maxVaultSizeMB === -1 ? 0 : Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-white/40">Loading usage…</div>
              )}

              <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 text-[11px]">
                <div className="grid gap-3 grid-cols-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-neutral-500 text-[9px] uppercase font-semibold tracking-wider">History retention</span>
                    <span className="text-neutral-300 font-medium">{limits.historyDays === -1 ? "Unlimited" : `${limits.historyDays} days`}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-neutral-500 text-[9px] uppercase font-semibold tracking-wider">Metadata limit</span>
                    <span className="text-neutral-300 font-medium">{limits.maxMetadataSizeKb === -1 ? "Unlimited" : `${limits.maxMetadataSizeKb} KB`}</span>
                  </div>
                  <div className="flex items-center justify-between col-span-2 pt-2.5 border-t border-white/5 mt-0.5 text-neutral-400">
                    <span>Data export</span>
                    {user?.dataExport ? (
                      <button
                        type="button"
                        onClick={handleExportData}
                        disabled={exporting}
                        className="text-neutral-200 underline underline-offset-4 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {exporting ? "Exporting…" : "Download backup"}
                      </button>
                    ) : (
                      <span className="text-neutral-600 text-[10px]">Upgrade required</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/subscription")}
              className="mt-4 text-xs text-neutral-400 hover:text-white self-start transition-colors"
            >
              Manage subscription →
            </button>
          </div>

          {/* BLOCO 2: WORKSPACE ACTIVITY */}
          {/* RECENT NOTES CARD */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:col-span-4 flex flex-col shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
                </div>
                <h2 className="text-xs sm:text-sm font-semibold text-neutral-200">Recent notes</h2>
              </div>
              <button type="button" onClick={() => navigate("/notes")} className="text-xs text-white/50 hover:text-white transition-colors\">
                View all
              </button>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto max-h-[280px] sm:max-h-[310px] pr-1 scrollbar-thin">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group w-full rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:bg-neutral-900/50 hover:border-white/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs sm:text-sm font-medium text-white/80 group-hover:text-white truncate">{note.title || "Untitled"}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-white/30 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50" />
                    </div>
                    <p className="mt-0.5 text-[9px] font-mono text-white/40">{formatNoteDate(note.createdAtTimestamp)}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-6 text-center text-xs text-white/30 h-full flex items-center justify-center">
                  No recent notes yet.
                </div>
              )}
            </div>
          </div>

          {/* INSIGHTS: HOT RIGHT NOW */}
          <DashboardInsightSection
            title="Hot right now"
            subtitle="Strongest recent gravity across notes"
            icon={Flame}
            loading={insightsLoading}
            empty={hotNotes.length === 0}
            className="lg:col-span-8"
            gridColsClass="grid-cols-1 sm:grid-cols-2"
            onRefresh={() => loadInsights(true)}
            refreshing={refreshingInsights}
            viewMoreHref="/notes"
            viewMoreLabel="View all notes"
          >
            {hotNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* BLOCO 3: GRAPH DISCOVERY */}
          {/* INSIGHTS: KEY PEOPLE & PROJECTS */}
          <DashboardInsightSection
            title="Key people & projects"
            subtitle="Trending graph entities"
            icon={Users}
            loading={insightsLoading}
            empty={hotEntities.length === 0}
            className="lg:col-span-4"
            gridColsClass="grid-cols-1"
            viewMoreHref="/entities"
            viewMoreLabel="View all entities"
          >
            {hotEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* INSIGHTS: WORTH REVISITING */}
          <DashboardInsightSection
            title="Worth revisiting"
            subtitle="High-value aging notes"
            icon={Clock}
            loading={insightsLoading}
            empty={forgottenNotes.length === 0}
            className="lg:col-span-4"
            gridColsClass="grid-cols-1"
            viewMoreHref="/notes"
            viewMoreLabel="View all notes"
          >
            {forgottenNotes.map((n) => (
              <NoteCard key={n.note.id} item={n} onOpen={() => navigate(`/notes/${n.note.id}`)} />
            ))}
          </DashboardInsightSection>

          {/* INSIGHTS: FORGOTTEN GEMS */}
          <DashboardInsightSection
            title="Forgotten gems"
            subtitle="Entities that once mattered"
            icon={TrendingUp}
            loading={insightsLoading}
            empty={forgottenEntities.length === 0}
            className="lg:col-span-4"
            gridColsClass="grid-cols-1"
            viewMoreHref="/entities"
            viewMoreLabel="View all entities"
          >
            {forgottenEntities.map((e) => (
              <EntityCard key={e.entity.id} item={e} onOpen={() => navigate(`/entities/${e.entity.id}`)} />
            ))}
          </DashboardInsightSection>

        </section>
      </div>
    </AppLayout>
  );
}