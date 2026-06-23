import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trash2, Plus } from "@/lib/heroicons";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Entity } from '@/types';

/**
 * Detail view for a single time-tracked entity
 */
export function TimeTrackingDetail() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const [isAddingTimeOpen, setIsAddingTimeOpen] = useState(false);
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualDuration, setManualDuration] = useState('01:00:00');

  const { getTotalTime, getDailyBreakdown, addTime, deleteEntry, formatSeconds } = useTimeTracking();

  // Get entity details
  const { data: entity, isLoading: entityLoading } = useQuery({
    queryKey: ['entities', entityId],
    queryFn: async () => {
      if (!entityId) return null;
      const response = await entitiesApi.get(entityId);
      return response.data as Entity;
    },
    enabled: !!entityId,
  });

  // Get total time summary
  const { data: totalTimeSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['timeTracking', 'total', entityId],
    queryFn: () => {
      if (!entityId) return null;
      return getTotalTime(entityId).data;
    },
    enabled: !!entityId,
  });

  // Get daily breakdown
  const { data: dailyBreakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['timeTracking', 'daily', entityId],
    queryFn: () => {
      if (!entityId) return null;
      return getDailyBreakdown(entityId).data;
    },
    enabled: !!entityId,
  });

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    if (!dailyBreakdown) return { current: 0, previous: 0 };

    const today = new Date();
    const currentWeekStart = startOfWeek(today);
    const currentWeekEnd = endOfWeek(today);

    const currentWeekTotal = Object.values(dailyBreakdown as Record<string, any>)
      .filter((entry: any) => {
        const date = new Date(entry.date);
        return date >= currentWeekStart && date <= currentWeekEnd;
      })
      .reduce((sum: number, entry: any) => sum + entry.durationSeconds, 0);

    return {
      current: currentWeekTotal,
      previous: (totalTimeSummary?.totalSeconds || 0) - currentWeekTotal,
    };
  }, [dailyBreakdown, totalTimeSummary]);

  // Parse duration string (HH:MM:SS)
  const parseDurationString = (str: string): number => {
    const parts = str.split(':').map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  };

  const handleAddTime = () => {
    if (!entityId) return;
    const durationSeconds = parseDurationString(manualDuration);
    if (durationSeconds <= 0) {
      alert('Duration must be greater than 0');
      return;
    }

    addTime({
      entityId,
      date: manualDate,
      durationSeconds,
    });

    setIsAddingTimeOpen(false);
    setManualDuration('01:00:00');
  };

  // Sort entries by date descending
  const sortedEntries = useMemo(() => {
    if (!dailyBreakdown) return [];
    return Object.entries(dailyBreakdown as Record<string, any>)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .slice(0, 30); // Last 30 days
  }, [dailyBreakdown]);

  if (entityLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-500">Entity not found</p>
        <Button variant="outline" onClick={() => navigate('/activities')} className="mt-4">
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/activities')}
          className="h-10 w-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-semibold text-white">
            {entity.title}
          </h1>
          <p className="text-sm text-zinc-500">
            {entity.type === 'PROJECT' ? '📁 Project' : '🔥 Activity'} • {entity.description}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-zinc-400 mb-2">Total Time</p>
            <p className="text-3xl font-mono font-bold text-zinc-400">
              {totalTimeSummary?.formattedTotal || '00:00:00'}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              {totalTimeSummary?.totalHours?.toFixed(1) || '0.0'} hours
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-zinc-400 mb-2">This Week</p>
            <p className="text-3xl font-mono font-bold text-zinc-400">
              {formatSeconds(weeklyStats.current)}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              {(weeklyStats.current / 3600).toFixed(1)} hours
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-zinc-400 mb-2">Total Sessions</p>
            <p className="text-3xl font-mono font-bold text-zinc-400">
              {totalTimeSummary?.entriesCount || 0}
            </p>
            <p className="text-xs text-zinc-500 mt-2">days tracked</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => setIsAddingTimeOpen(true)}
          variant="outline"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Manual Time
        </Button>
      </div>

      {/* Add Time Dialog */}
      <Dialog open={isAddingTimeOpen} onOpenChange={setIsAddingTimeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Manually</DialogTitle>
            <DialogDescription>
              Record time you spent on {entity.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-2">Date</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 block mb-2">Duration (HH:MM:SS)</label>
              <input
                type="text"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                placeholder="01:30:00"
                className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-white font-mono"
              />
              <p className="text-xs text-zinc-500 mt-1">Format: hours:minutes:seconds</p>
            </div>

            <Button onClick={handleAddTime} className="w-full">
              Add Time
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-white mb-4">History</h2>
        
        {breakdownLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">
            No time entries yet. Start tracking!
          </p>
        ) : (
          <div className="space-y-2">
            {sortedEntries.map(([date, entry]: [string, any]) => (
              <div
                key={date}
                className="flex justify-between items-center p-3 bg-zinc-950/50 rounded-lg hover:bg-zinc-950/75 transition-colors group"
              >
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {format(new Date(date), 'EEEE, MMM d')}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {entry.source === 'TIMER' && '⏱️ From timer'}
                    {entry.source === 'MANUAL' && '✍️ Manual entry'}
                    {entry.source === 'RECOVERED' && '🔄 Recovered'}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="font-mono font-bold text-zinc-400">
                    {entry.formattedDuration}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
