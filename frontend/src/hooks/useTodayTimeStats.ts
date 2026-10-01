import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';
import type { TimeEntry } from './useTimeTracking';

/**
 * Aggregated stats for the current day (and recent window).
 * - If entityId is provided, filters to that entity.
 * - Otherwise, aggregates across all entities for the user.
 */
export function useTodayTimeStats(entityId?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['timeTracking', 'today'],
    queryFn: () => timeTrackingApi.getToday().then((r) => r.data as TimeEntry[]),
    staleTime: 15_000,
  });

  const stats = useMemo(() => {
    const entries = (data || []).filter((e) => (entityId ? e.entityId === entityId : true));
    const todaySeconds = entries.reduce((acc, e) => acc + (e.durationSeconds || 0), 0);
    const todayEntriesCount = entries.length;
    const avgEntrySeconds = todayEntriesCount > 0 ? Math.round(todaySeconds / todayEntriesCount) : 0;
    const lastEntry = entries.length
      ? [...entries].sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        )[0]
      : null;
    return { todaySeconds, todayEntriesCount, avgEntrySeconds, lastEntry, entries };
  }, [data, entityId]);

  return { ...stats, isLoading, refetch };
}
