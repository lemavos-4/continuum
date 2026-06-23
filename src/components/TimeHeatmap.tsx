import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';
import { useTimeTracking, type TimeEntry } from '@/hooks/useTimeTracking';
import { useTimerGoal } from '@/hooks/useTimerGoal';

interface Props {
  /** Optional entityId filter; when omitted, aggregates across user. */
  entityId?: string;
  /** Number of weeks to show (default 52 — full year). */
  weeks?: number;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function intensity(seconds: number, goalSeconds: number): number {
  if (!seconds || goalSeconds <= 0) return 0;
  const ratio = seconds / goalSeconds;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  if (ratio > 0) return 1;
  return 0;
}

function fmtHM(s: number) {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const LEVEL_BG = [
  'bg-white/[0.05]',
  'bg-white/20',
  'bg-white/40',
  'bg-white/65',
  'bg-white/90',
];

interface HoverCell {
  key: string;
  seconds: number;
  count: number;
  x: number;
  y: number;
}

interface YearBlock {
  year: number;
  cols: { date: Date; key: string; seconds: number; count: number }[][];
}

export function TimeHeatmap({ entityId, weeks = 52 }: Props) {
  const qc = useQueryClient();
  const to = useMemo(() => new Date(), []);
  const minYear = to.getFullYear() - Math.ceil(weeks / 52);

  const { activeTimers, addTimeAsync, isAdding } = useTimeTracking();
  const [hover, setHover] = useState<HoverCell | null>(null);
  const hoverRef = useRef<HoverCell | null>(null);
  hoverRef.current = hover;

  const { goalMinutes, setGoal } = useTimerGoal(entityId);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string>(String(goalMinutes));

  const [adding, setAdding] = useState(false);
  const [entryMin, setEntryMin] = useState<string>('30');
  const [entryError, setEntryError] = useState<string | null>(null);

  const goalSeconds = goalMinutes * 60;

  // Fetch full range from earliest year to today
  const from = useMemo(() => new Date(minYear, 0, 1), [minYear]);

  const { data, isLoading } = useQuery({
    queryKey: ['timeTracking', 'heatmap', dateKey(from), dateKey(to), entityId || 'all'],
    queryFn: () =>
      timeTrackingApi
        .getAllInRange(dateKey(from), dateKey(to))
        .then((r) => r.data as TimeEntry[]),
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  const todayKey = dateKey(to);

  const liveTodaySeconds = useMemo(() => {
    if (!activeTimers || activeTimers.size === 0) return 0;
    if (entityId) return activeTimers.get(entityId)?.elapsedSeconds || 0;
    let total = 0;
    activeTimers.forEach((t) => (total += t.elapsedSeconds || 0));
    return total;
  }, [activeTimers, entityId]);

  const { byDay, countByDay } = useMemo(() => {
    const sec = new Map<string, number>();
    const cnt = new Map<string, number>();
    (data || []).forEach((e) => {
      if (entityId && e.entityId !== entityId) return;
      sec.set(e.date, (sec.get(e.date) || 0) + (e.durationSeconds || 0));
      cnt.set(e.date, (cnt.get(e.date) || 0) + 1);
    });
    if (liveTodaySeconds > 0) {
      sec.set(todayKey, (sec.get(todayKey) || 0) + liveTodaySeconds);
    }
    return { byDay: sec, countByDay: cnt };
  }, [data, entityId, liveTodaySeconds, todayKey]);

  // Build per-year column groups. Years shown: from earliestActivityYear..currentYear.
  // If no data, just show the current year.
  const yearBlocks: YearBlock[] = useMemo(() => {
    const years = new Set<number>([to.getFullYear()]);
    byDay.forEach((_, k) => years.add(parseInt(k.slice(0, 4), 10)));
    const sorted = [...years].sort((a, b) => b - a);

    return sorted.map((year) => {
      const start = new Date(year, 0, 1);
      start.setDate(start.getDate() - start.getDay()); // align to Sunday
      const end = new Date(year, 11, 31);
      const numWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 86400 * 1000)) + 1;
      const cols: YearBlock['cols'] = [];
      for (let w = 0; w < numWeeks; w++) {
        const col: YearBlock['cols'][number] = [];
        for (let d = 0; d < 7; d++) {
          const day = new Date(start);
          day.setDate(start.getDate() + w * 7 + d);
          const key = dateKey(day);
          col.push({
            date: day,
            key,
            seconds: byDay.get(key) || 0,
            count: countByDay.get(key) || 0,
          });
        }
        cols.push(col);
      }
      return { year, cols };
    });
  }, [byDay, countByDay, to]);

  const totalSeconds = useMemo(() => {
    let t = 0;
    byDay.forEach((v) => (t += v));
    return t;
  }, [byDay]);

  const activeDays = byDay.size;

  const commitGoal = () => {
    const n = parseInt(goalDraft, 10);
    if (Number.isFinite(n) && n > 0) setGoal(n);
    setEditingGoal(false);
  };

  const submitEntry = async () => {
    setEntryError(null);
    if (!entityId) return;
    const minutes = parseInt(entryMin, 10);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setEntryError('Enter a positive number of minutes');
      return;
    }
    try {
      await addTimeAsync({
        entityId,
        date: dateKey(new Date()),
        durationSeconds: minutes * 60,
      });
      await qc.invalidateQueries({ queryKey: ['timeTracking'] });
      setAdding(false);
      setEntryMin('30');
    } catch (err: any) {
      console.error('Failed to add entry:', err);
      setEntryError(err?.response?.data?.message || err?.message || 'Failed to add entry');
    }
  };

  // Dismiss tap-tooltip when tapping outside
  useEffect(() => {
    if (!hover) return;
    const close = (e: Event) => {
      const tgt = e.target as HTMLElement;
      if (!tgt.closest?.('[data-heatmap-cell]')) setHover(null);
    };
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('touchstart', close);
      document.removeEventListener('mousedown', close);
    };
  }, [hover]);

  const openCell = (
    el: HTMLElement,
    cell: { key: string; seconds: number; count: number; date: Date },
  ) => {
    if (cell.date > to) return;
    const rect = el.getBoundingClientRect();
    setHover({
      key: cell.key,
      seconds: cell.seconds,
      count: cell.count,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 relative">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-mono">
          Activity Heatmap
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-white/40 font-mono">
            {activeDays} active days · {fmtHM(totalSeconds)}
          </span>
          {editingGoal ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={commitGoal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitGoal();
                  if (e.key === 'Escape') {
                    setGoalDraft(String(goalMinutes));
                    setEditingGoal(false);
                  }
                }}
                autoFocus
                className="w-14 px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.04] border border-white/15 rounded text-white text-right focus:outline-none focus:border-white/30"
              />
              <span className="text-[10px] text-white/40 font-mono">min/day</span>
            </span>
          ) : (
            <button
              onClick={() => {
                setGoalDraft(String(goalMinutes));
                setEditingGoal(true);
              }}
              className="text-[10px] font-mono text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded px-1.5 py-0.5 transition"
              title="Set daily goal"
            >
              goal · {fmtHM(goalSeconds)}
            </button>
          )}
          {entityId && (
            <button
              onClick={() => {
                setEntryError(null);
                setAdding((v) => !v);
              }}
              className="text-[10px] font-mono text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded px-1.5 py-0.5 transition"
              title="Add a manual entry"
            >
              {adding ? '× cancel' : '+ entry'}
            </button>
          )}
        </div>
      </div>

      {adding && entityId && (
        <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 text-[11px] font-mono text-white/60 border border-white/10 rounded">
              today · {dateKey(new Date())}
            </span>
            <input
              type="number"
              min={1}
              value={entryMin}
              onChange={(e) => setEntryMin(e.target.value)}
              placeholder="minutes"
              className="w-20 px-2 py-1 text-[11px] font-mono bg-white/[0.04] border border-white/15 rounded text-white text-right focus:outline-none focus:border-white/30"
            />
            <span className="text-[10px] font-mono text-white/40">min</span>
            <button
              onClick={submitEntry}
              disabled={isAdding}
              className="ml-auto px-2.5 py-1 text-[11px] font-mono bg-white text-black rounded hover:bg-white/90 transition disabled:opacity-50"
            >
              {isAdding ? '...' : 'Add'}
            </button>
          </div>
          {entryError && (
            <p className="mt-2 text-[10px] font-mono text-red-400">{entryError}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="h-32" />
      ) : (
        <div className="relative space-y-5">
          {yearBlocks.map((block) => (
            <div key={block.year}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  {block.year}
                </span>
                <span className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="flex gap-[4px] min-w-fit">
                  {block.cols.map((col, i) => (
                    <div key={i} className="flex flex-col gap-[4px]">
                      {col.map((cell) => {
                        const isFuture = cell.date > to;
                        const inYear = cell.date.getFullYear() === block.year;
                        const lvl = intensity(cell.seconds, goalSeconds);
                        const isToday = cell.key === todayKey;
                        if (!inYear) {
                          return <div key={cell.key} className="w-[14px] h-[14px]" />;
                        }
                        return (
                          <button
                            type="button"
                            key={cell.key}
                            data-heatmap-cell
                            onMouseEnter={(e) => openCell(e.currentTarget, cell)}
                            onMouseLeave={() => setHover(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openCell(e.currentTarget, cell);
                            }}
                            disabled={isFuture}
                            className={`w-[14px] h-[14px] sm:w-[13px] sm:h-[13px] rounded-[3px] ${
                              isFuture ? 'bg-transparent' : LEVEL_BG[lvl]
                            } border ${
                              isToday ? 'border-white/60' : 'border-white/[0.04]'
                            } ${isFuture ? '' : 'hover:ring-1 hover:ring-white/40 active:scale-110'} transition-transform`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {hover && (() => {
            const W = 180;
            const margin = 8;
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
            const left = Math.max(margin + W / 2, Math.min(vw - margin - W / 2, hover.x));
            return (
              <div
                className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-white/15 bg-black/95 px-2.5 py-1.5 shadow-xl backdrop-blur"
                style={{ left, top: hover.y - 6, width: W }}
              >
                <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  {hover.key}
                  {hover.key === todayKey && ' · today'}
                </p>
                <p className="text-xs font-mono text-white mt-0.5">
                  {fmtHM(hover.seconds)} · {hover.count} {hover.count === 1 ? 'entry' : 'entries'}
                </p>
                {goalSeconds > 0 && (
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">
                    {Math.min(999, Math.round((hover.seconds / goalSeconds) * 100))}% of goal
                  </p>
                )}
              </div>
            );
          })()}

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
            <span>less</span>
            {LEVEL_BG.map((c, i) => (
              <span key={i} className={`w-[10px] h-[10px] rounded-[2px] ${c}`} />
            ))}
            <span>more</span>
          </div>
        </div>
      )}
    </div>
  );
}
