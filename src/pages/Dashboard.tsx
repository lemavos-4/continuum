import { ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import { SummaryMetric, SummaryMetricRow } from "@/components/ui/summary-metric";
import { FloatingCreateButton } from "@/components/ui/floating-create-button";
import { TodayHabitsCard } from "@/components/dashboard/TodayHabitsCard";
import { ScoreEvolutionCard } from "@/components/dashboard/ScoreEvolutionCard";

import { dashboardApi, graphApi, notesApi } from "@/lib/api";
import { useCreateNote } from "@/hooks/useCreateNote";
import UpgradeModal from "@/components/UpgradeModal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Plus } from "@/lib/heroicons";
import { Skeleton } from "@/components/ui/skeleton";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

// --- TYPES & HELPERS ---
const formatHours = (h: number) => {
  if (!h) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h < 10 ? 1 : 0)}h`;
};

const formatDays = (d: number, t: (key: string, vars?: Record<string, string | number>) => string) => {
  if (d <= 0) return t("db_today");
  if (d < 30) return t("db_dAgo", { n: d });
  if (d < 365) return t("db_moAgo", { n: Math.round(d / 30) });
  return t("db_yAgo", { n: Math.round(d / 365) });
};

const formatNoteDate = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// --- SUB-COMPONENTS ---
const DashboardSkeleton = () => (
  <AppLayout>
    <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-8 h-[360px] rounded-2xl" />
        <Skeleton className="lg:col-span-4 h-[360px] rounded-2xl" style={{ animationDelay: "120ms" }} />
      </div>
    </div>
  </AppLayout>
);

function StatCard({ icon: Icon, label, value, hint }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string; }) {
  return (
    <div className="border border-white/5 bg-white/[0.01] rounded-sm p-4 flex flex-col gap-1 min-w-0 transition-colors hover:border-white/10">
      <div className="flex items-center gap-1.5 text-white/30">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="text-[9px] uppercase tracking-widest font-mono truncate">{label}</span>
      </div>
      <p className="text-2xl font-mono tracking-tight text-white tabular-nums leading-none mt-2 truncate">{value}</p>
      {hint && <p className="text-[10px] font-mono uppercase tracking-wider text-white/30 truncate mt-1">{hint}</p>}
    </div>
  );
}

function WeeklySummary({ notes, totalNotes, totalEntities, graphNodeCount, currentScore }: {
  notes: any[]; totalNotes: number; totalEntities: number; graphNodeCount: number; currentScore: number;
}) {
  const { t } = useLanguage();
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const list = Array.isArray(notes) ? notes : [];
  const inRange = (n: any, from: number, to: number) => {
    const t = new Date(n?.createdAt || n?.updatedAt || 0).getTime();
    return t >= from && t < to;
  };
  const thisWeek = list.filter((n) => inRange(n, now - WEEK, now + 1)).length;
  const lastWeek = list.filter((n) => inRange(n, now - 2 * WEEK, now - WEEK)).length;
  const notesDelta = thisWeek - lastWeek;

  return (
    <SummaryMetricRow eyebrow={t("db_last7days")} className="-mt-4 sm:-mt-6">
      <SummaryMetric label={t("db_notes")} value={String(totalNotes)} delta={notesDelta} comparison={t("db_vsLastWeek")} />
      <SummaryMetric label={t("db_entities")} value={String(totalEntities)} delta={0} comparison={t("db_nodes", { n: graphNodeCount })} />
      <SummaryMetric label={t("db_score")} value={currentScore.toFixed(2)} delta={0} comparison={t("db_gravityIndex")} />
    </SummaryMetricRow>
  );
}



export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentScore, setCurrentScore] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);
  const { createNote, creating } = useCreateNote({ onLimitReached: () => setUpgradeOpen(true) });

  useEffect(() => {
    const isNewAccount = localStorage.getItem("newAccountCreated") === "true";
    if (isNewAccount) {
      setShowOnboardingPopup(true);
      localStorage.removeItem("newAccountCreated");
    }
  }, []);

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

  if (summaryLoading) return <DashboardSkeleton />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("db_goodMorning");
    if (hour < 18) return t("db_goodAfternoon");
    return t("db_goodEvening");
  })();
  const displayName = user?.username || user?.email?.split("@")[0] || t("db_there");

  return (
    <AppLayout>
      <Stagger className="px-4 sm:px-6 lg:px-12 py-6 sm:py-10 max-w-7xl mx-auto space-y-6" stagger={0.07}>

        {/* HEADER */}
        <StaggerItem>
        <header className="border-b border-white/10 pb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl tracking-tight text-white">
              {greeting}, {displayName}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {t("db_subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
          </div>


        </header>
        </StaggerItem>


        {/* WEEKLY SUMMARY */}
        <StaggerItem>
        <WeeklySummary
          notes={Array.isArray(notes) ? notes : []}
          totalNotes={totalNotes}
          totalEntities={totalEntities}
          graphNodeCount={graphNodeCount}
          currentScore={currentScore}
        />
        </StaggerItem>


        {/* CORPO DO DASHBOARD */}
        <StaggerItem className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* BLOCO 1: SCORE — evolução, explicabilidade e marcos */}
          <ScoreEvolutionCard
            onScoreChange={setCurrentScore}
            onOpenInsights={() => navigate("/insights")}
          />

          {/* HABITS TO COMPLETE TODAY */}
          <TodayHabitsCard />

          {/* RECENT NOTES CARD */}
          <Card variant="faint" className="lg:col-span-8 flex flex-col">

            <CardContent className="p-4 sm:p-6 flex flex-col flex-1">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">{t("db_stream")}</p>
                  <h2 className="mt-1 font-serif text-xl text-white">{t("db_recentNotes")}</h2>
                </div>
                <Button type="button" variant="ghost" onClick={() => navigate("/notes")} className="h-auto p-0 bg-transparent hover:bg-transparent normal-case text-[11px] font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                  {t("db_viewAll")}
                </Button>
              </div>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto max-h-[280px] sm:max-h-[310px] pr-1 scrollbar-thin">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <Button
                    key={note.id}
                    type="button"
                    variant="ghost"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group w-full h-auto flex-col items-stretch normal-case rounded-xl border border-transparent px-2.5 py-2 text-left bg-transparent transition-all hover:bg-neutral-900/50 hover:border-white/5"
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <p className="text-xs sm:text-sm font-medium text-white/80 group-hover:text-white truncate">{note.title || t("db_untitled")}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-white/30 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-white/50" />
                    </div>
                    <p className="mt-0.5 text-[9px] font-mono text-white/40 w-full text-left">{formatNoteDate(note.createdAtTimestamp)}</p>
                  </Button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-6 text-center text-xs text-white/30 h-full flex items-center justify-center">
                  {t("db_noRecentNotes")}
                </div>
              )}
            </div>
            </CardContent>
          </Card>

        </StaggerItem>
      </Stagger>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={t("db_notesLimitReason")} />
      
      {/* Onboarding popup after account creation */}
      <Dialog open={showOnboardingPopup} onOpenChange={setShowOnboardingPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{t("db_welcomeTitle")}</DialogTitle>
            <DialogDescription className="mt-2">
              {t("db_welcomeDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-foreground/80">
              {t("db_welcomeParagraphPart1")} <span className="font-semibold">{t("db_welcomeParagraphMarkdown")}</span> {t("db_welcomeParagraphPart2")}
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-white/50 mb-2">{t("db_importSupportsLabel")}</p>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• {t("db_importSupport1")}</li>
                <li>• {t("db_importSupport2")}</li>
                <li>• {t("db_importSupport3")}</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnboardingPopup(false)}
              className="flex-1"
            >
              {t("db_gotIt")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowOnboardingPopup(false);
                navigate("/notes");
              }}
              className="flex-1"
            >
              {t("db_importNotesArrow")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FloatingCreateButton
        label={t("db_newNote")}
        onClick={() => void createNote()}
        icon={<Plus className="h-4 w-4" />}
      />
    </AppLayout>


  );
}
