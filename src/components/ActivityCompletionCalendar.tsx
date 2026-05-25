import { useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { Check } from "@/lib/heroicons";
import { Button } from '@/components/ui/button';
import { entitiesApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface ActivityCompletionCalendarProps {
  entityId: string;
  trackingDates?: string[];
  onMarkComplete?: () => void;
}

/**
 * Mini completion calendar for activities/activities
 * Shows a 4-week view of completions
 */
export function ActivityCompletionCalendar({
  entityId,
  trackingDates = [],
  onMarkComplete
}: ActivityCompletionCalendarProps) {
  const queryClient = useQueryClient();
  
  // Build tracking dates set for quick lookup
  const completionDates = useMemo(() => {
    const dates = new Set<string>();
    trackingDates.forEach(date => {
      const dateStr = date.split('T')[0]; // Get YYYY-MM-DD
      dates.add(dateStr);
    });
    return dates;
  }, [trackingDates]);

  // Get last 4 weeks from today
  const fourWeeksAgo = useMemo(() => {
    const today = new Date();
    return new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000);
  }, []);

  const lastFourWeeks = useMemo(() => {
    const start = startOfWeek(fourWeeksAgo);
    const end = new Date();
    return eachDayOfInterval({ start, end });
  }, [fourWeeksAgo]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isTrackedToday = completionDates.has(todayStr);

  const handleMarkComplete = async () => {
    try {
      await entitiesApi.track(entityId);
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      onMarkComplete?.();
    } catch (error) {
      console.error('Failed to mark activity as complete:', error);
    }
  };

  return (
    <div className="w-full max-w-[240px] mx-auto rounded-2xl border border-white/10 bg-zinc-950/50 p-3">
      <div className="grid grid-cols-7 gap-0.5 text-[10px]">
        {['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'].map(day => (
          <div key={day} className="text-center font-medium text-zinc-500">
            {day}
          </div>
        ))}

        {lastFourWeeks.map((date, index) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCompleted = completionDates.has(dateStr);
          const isToday = isSameDay(date, new Date());

          return (
            <div
              key={index}
              className={
                `aspect-square rounded-sm overflow-hidden relative transition-all border ${
                isCompleted
                  ? 'border-zinc-500/50 text-zinc-400'
                  : isToday
                  ? 'bg-zinc-500/10 border-zinc-500/50 text-zinc-400'
                  : 'bg-zinc-900/50 border-zinc-700 text-zinc-600'
              }`
              }
              title={format(date, 'MMM d')}
            >
              {isCompleted ? (
                <div className="absolute inset-0 bg-zinc-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-zinc-400" />
                </div>
              ) : isToday ? (
                <span className="block text-center leading-[1.1rem]">•</span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-400">{trackingDates.length}</span> sequence
        </div>
        <Button
          size="sm"
          variant={isTrackedToday ? 'default' : 'outline'}
          className="gap-2 h-7 px-3 text-[11px]"
          onClick={handleMarkComplete}
          disabled={isTrackedToday}
        >
          <Check className="w-3 h-3" />
          {isTrackedToday ? 'Done Today' : 'Complete'}
        </Button>
      </div>
    </div>
  );
}
