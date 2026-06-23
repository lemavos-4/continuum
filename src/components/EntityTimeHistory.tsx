import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';
import { useTimeTracking, type TimeEntry } from '@/hooks/useTimeTracking';
import { X, Loader2 } from '@/lib/heroicons';

interface Props {
  entityId: string;
}

/** Compact human-friendly duration: 2h 15m, 45m, 30s. */
function fmtCompact(s: number) {
  s = Math.max(0, Math.floor(s));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtClock(s: number) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Per-entity history of time entries with simple stats.
 */
export function EntityTimeHistory({ entityId }: Props) {
  const { deleteEntry } = useTimeTracking();
  const [page, setPage] = useState(1);
  const PAGE = 8;

  const { data, isLoading } = useQuery({
    queryKey: ['timeTracking', 'entries', entityId],
    queryFn: () => {
      const from = new Date();
      from.setDate(from.getDate() - 365);
      return timeTrackingApi
        .getTimeInRange(
          entityId,
          from.toISOString().slice(0, 10),
          new Date().toISOString().slice(0, 10),
        )
        .then((r) => r.data as TimeEntry[]);
    },
  });

  const entries = useMemo(
    () =>
      [...(data || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [data],
  );

  const stats = useMemo(() => {
    const total = entries.reduce((a, e) => a + (e.durationSeconds || 0), 0);
    const avg = entries.length ? Math.round(total / entries.length) : 0;
    const longest = entries.reduce((m, e) => Math.max(m, e.durationSeconds || 0), 0);
    return { total, avg, longest, count: entries.length };
  }, [entries]);

  const pageEntries = entries.slice(0, page * PAGE);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-mono">Time History</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Stat label="Total" value={fmtCompact(stats.total)} />
        <Stat label="Avg" value={fmtCompact(stats.avg)} />
        <Stat label="Longest" value={fmtCompact(stats.longest)} />
        <Stat label="Entries" value={String(stats.count)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-4 h-4 animate-spin text-white/40" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-6">No entries yet.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {pageEntries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2">
              <span className="text-xs text-white/40 font-mono w-24 shrink-0">{e.date}</span>
              <span className="text-sm font-mono text-white/90 w-24 shrink-0">
                {fmtClock(e.durationSeconds || 0)}
              </span>
              <span className="text-xs text-white/50 truncate flex-1">{e.note || '—'}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/30">{e.source}</span>
              <button
                onClick={() => deleteEntry(e.id)}
                className="text-white/30 hover:text-red-400 transition"
                title="Delete entry"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pageEntries.length < entries.length && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-3 text-xs text-white/50 hover:text-white transition"
        >
          Show more ({entries.length - pageEntries.length})
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2.5 text-center min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 font-mono text-[13px] sm:text-sm text-white/90 truncate" title={value}>{value}</p>
    </div>
  );
}
