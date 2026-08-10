import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

import { metricsApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, RefreshCw } from "@/lib/heroicons";

const rangeDaysMap = { "14d": 14, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, total: 3650 };
type TimeRange = keyof typeof rangeDaysMap;

type Components = Record<string, number>;
type Point = { date: string; score: number; rawScore: number; delta: number; components: Components };
type Contribution = { kind: string; value: number; count: number; subject?: string | null };
type Comparison = {
  currentScore: number;
  firstScore: number;
  average30: number;
  percentVsAverage30: number;
  bestWeekStart?: string | null;
  bestWeekAverage: number;
  daysTracked: number;
  coldStart: boolean;
};
type Milestone = { kind: string; value: number; date: string; achievedToday: boolean };
type Insights = {
  points: Point[];
  todayContributions: Contribution[];
  comparison: Comparison;
  milestones: Milestone[];
};

const COMPONENT_KEYS = ["notes", "entities", "connections", "freshness", "continuity", "daily"] as const;

const fmtDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

export function ScoreEvolutionCard({
  onScoreChange,
  onOpenInsights,
}: {
  onScoreChange?: (score: number) => void;
  onOpenInsights?: () => void;
}) {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>("14d");

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["metrics", "scoreInsights"],
    queryFn: () => metricsApi.scoreInsights().then((r) => r.data as Insights),
    retry: 1,
    staleTime: 60_000,
  });

  const points = useMemo(() => (Array.isArray(data?.points) ? data!.points : []), [data]);
  const current = points.length ? points[points.length - 1].score : 0;

  useEffect(() => {
    onScoreChange?.(current);
  }, [current, onScoreChange]);

  const chartData = useMemo(() => {
    const days = rangeDaysMap[timeRange];
    const sliced = timeRange === "total" ? points : points.slice(-days);
    const step = Math.max(1, Math.ceil(sliced.length / 365));
    return sliced
      .filter((_, i) => i % step === 0 || i === sliced.length - 1)
      .map((p) => ({ ...p, label: fmtDate(p.date) }));
  }, [points, timeRange]);

  const hasData = points.length > 0;

  const contributionText = (c: Contribution) => {
    const n = c.kind === "TIME" ? c.count : c.count;
    switch (c.kind) {
      case "NOTES":
        return c.subject ? t("sc_c_notes_in", { n, s: c.subject }) : t("sc_c_notes", { n });
      case "ACTIVITIES":
        return c.subject ? t("sc_c_activities_in", { n, s: c.subject }) : t("sc_c_activities", { n });
      case "TIME":
        return c.subject ? t("sc_c_time_in", { n, s: c.subject }) : t("sc_c_time", { n });
      case "CONNECTIONS":
        return t("sc_c_connections", { n });
      case "ENTITIES":
        return t("sc_c_entities");
      case "IDLE":
        return t("sc_c_idle", { n });
      default:
        return c.kind;
    }
  };

  const comparison = data?.comparison;
  const comparisonText = (() => {
    if (!comparison) return null;
    if (comparison.coldStart) {
      if (comparison.daysTracked <= 1) return t("sc_coldFirst");
      const base = comparison.firstScore || 0.01;
      const pct = Math.round(((comparison.currentScore - base) / base) * 100);
      return t("sc_cold", {
        a: comparison.firstScore.toFixed(1),
        b: comparison.currentScore.toFixed(1),
        p: `${pct >= 0 ? "+" : ""}${pct}`,
      });
    }
    const p = comparison.percentVsAverage30;
    if (Math.abs(p) < 1) return t("sc_cmp_flat");
    return p > 0
      ? t("sc_cmp_above", { p: Math.abs(p).toFixed(0) })
      : t("sc_cmp_below", { p: Math.abs(p).toFixed(0) });
  })();

  const bestWeekText =
    comparison && !comparison.coldStart && comparison.bestWeekStart
      ? t("sc_cmp_bestWeek", {
          d: fmtDate(comparison.bestWeekStart),
          v: comparison.bestWeekAverage.toFixed(1),
        })
      : null;

  const milestoneBadges = useMemo(() => {
    const list = Array.isArray(data?.milestones) ? data!.milestones : [];
    const out: string[] = [];
    for (const m of list) {
      if (m.kind === "RECORD_HIGH" && m.achievedToday) out.push(t("sc_m_record", { v: m.value.toFixed(1) }));
      if (m.kind === "LONGEST_STREAK" && m.achievedToday && m.value >= 3)
        out.push(t("sc_m_streak", { n: m.value }));
      if (m.kind === "CURRENT_STREAK" && m.value >= 2 && m.value < 3)
        out.push(t("sc_m_currentStreak", { n: m.value }));
      if (m.kind === "THRESHOLD" && m.achievedToday) out.push(t("sc_m_threshold", { v: m.value.toFixed(0) }));
    }
    return out.slice(0, 3);
  }, [data, t]);

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as Point & { label: string };
    return (
      <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-[11px] shadow-xl backdrop-blur-md">
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
          {fmtDate(p.date)} · {p.score.toFixed(2)}
          {p.delta !== 0 && (
            <span className={cn("ml-1", p.delta > 0 ? "text-emerald-400" : "text-red-400")}>
              {p.delta > 0 ? "+" : ""}
              {p.delta.toFixed(2)}
            </span>
          )}
        </p>
        <div className="space-y-0.5">
          {COMPONENT_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4 text-white/70">
              <span>{t(`sc_bd_${k}`)}</span>
              <span className="font-mono tabular-nums text-white">
                {(p.components?.[k] ?? 0).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card variant="faint" className="lg:col-span-12 flex flex-col justify-between">
      <CardContent className="p-4 sm:p-6 flex flex-col justify-between h-full">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="mt-1 font-serif text-2xl text-white">{t("sc_title")}</h2>
              <p className="mt-1 text-xs text-white/50">{t("sc_subtitle")}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-mono">{t("sc_current")}</p>
                <p className="font-mono text-2xl text-white tabular-nums leading-none mt-1">{current.toFixed(2)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-auto p-0 bg-transparent hover:bg-transparent normal-case text-xs text-white/50 hover:text-white hidden sm:flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
              </Button>
              {onOpenInsights && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onOpenInsights}
                  className="h-auto p-0 bg-transparent hover:bg-transparent normal-case text-xs text-white/50 hover:text-white hidden sm:flex items-center gap-1 transition-colors"
                >
                  {t("db_insightsArrow")}
                </Button>
              )}
            </div>
          </div>

          {/* COMPARISON + MILESTONES */}
          {hasData && (comparisonText || milestoneBadges.length > 0) && (
            <div className="flex flex-col gap-2">
              {comparisonText && (
                <p className="text-xs text-white/60">
                  {comparisonText}
                  {bestWeekText && <span className="text-white/35"> · {bestWeekText}</span>}
                </p>
              )}
              {milestoneBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {milestoneBadges.map((label) => (
                    <span
                      key={label}
                      className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-white/70"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RANGE SELECTOR */}
          <div className="flex items-center -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none gap-1 border-y sm:border border-white/5 sm:rounded-sm bg-white/[0.01] p-1">
            {(Object.keys(rangeDaysMap) as TimeRange[]).map((range) => {
              const labels: Record<TimeRange, string> = {
                "14d": t("db_range14d"),
                "1mo": t("db_range1mo"),
                "3mo": t("db_range3mo"),
                "6mo": t("db_range6mo"),
                "1y": t("db_range1y"),
                total: t("db_rangeTotal"),
              };
              return (
                <Button
                  key={range}
                  type="button"
                  variant="ghost"
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "h-auto normal-case text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors shrink-0",
                    timeRange === range
                      ? "bg-white/[0.06] text-white hover:bg-white/[0.06] hover:text-white"
                      : "bg-transparent text-white/40 hover:bg-transparent hover:text-white/70"
                  )}
                >
                  {labels[range]}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="h-[200px] sm:h-[250px] w-full -mx-2 relative">
          {isLoading && !hasData ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
              {t("sc_loading")}
            </div>
          ) : !hasData ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-4">
              <p className="text-xs text-white/40">{t("sc_empty")}</p>
              <p className="text-[11px] text-white/30">{t("sc_emptyHint")}</p>
            </div>
          ) : (
            <>
              {isError && (
                <div className="absolute right-2 top-1 z-10 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-400">
                  {t("sc_failed")}
                </div>
              )}
              <ChartContainer config={{}} className="h-full w-full">
                <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
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
                    content={renderTooltip}
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

        {/* WHY IT MOVED TODAY */}
        {hasData && (
          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-white/30">{t("sc_why")}</p>
            {data?.todayContributions?.length ? (
              <ul className="mt-2 space-y-1.5">
                {data.todayContributions.map((c, i) => (
                  <li key={`${c.kind}-${i}`} className="flex items-baseline gap-2 text-xs text-white/70">
                    <span
                      className={cn(
                        "font-mono tabular-nums shrink-0",
                        c.value >= 0 ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {c.value >= 0 ? "+" : ""}
                      {c.value.toFixed(1)}
                    </span>
                    <span className="min-w-0">{contributionText(c)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/40">{t("sc_whyEmpty")}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScoreEvolutionCard;
