import { useMemo, useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Check } from "@/lib/heroicons";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityAnalyticsCalendarProps {
  trackingDates?: string[];
  historyDays?: number;
}

/**
 * Activity completion calendar component
 * Shows monthly view of completion dates with intensity colors
 * Similar to TimeAnalyticsCalendar but for activity tracking
 */
export function ActivityAnalyticsCalendar({
  trackingDates = [],
  historyDays = 30,
}: ActivityAnalyticsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Build completion dates set for quick lookup
  const completionDates = useMemo(() => {
    const dates = new Set<string>();
    trackingDates.forEach(date => {
      const dateStr = date.split('T')[0]; // Get YYYY-MM-DD
      dates.add(dateStr);
    });
    return dates;
  }, [trackingDates]);

  // Generate full calendar grid (including days from prev/next month for proper alignment)
  const fullCalendarGrid = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    let activeDays = 0;
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    for (let i = 0; i <= monthEnd.getDate() - 1; i++) {
      const date = new Date(monthStart);
      date.setDate(monthStart.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      if (completionDates.has(dateStr)) {
        activeDays++;
      }
    }

    return {
      totalCompletions: trackingDates.length,
      activeDays,
      currentMonth: format(currentDate, 'MMMM yyyy'),
    };
  }, [currentDate, completionDates, trackingDates.length]);

  const getIntensityClass = (isCompleted: boolean): string => {
    if (!isCompleted) return 'bg-zinc-50 dark:bg-zinc-900';
    return 'bg-zinc-100 dark:bg-zinc-900/30 border-zinc-500/50';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Monthly Stats */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Check className="w-5 h-5 text-zinc-500" />
            Completion Summary
          </h3>
          <Badge variant="secondary">
            {format(currentDate, 'MMM yyyy')}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-500">
              {monthlyStats.totalCompletions}
            </div>
            <div className="text-sm text-zinc-500">Total Completions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-500">
              {monthlyStats.activeDays}
            </div>
            <div className="text-sm text-zinc-500">Days Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-500">
              {trackingDates.length > 0 ? ((monthlyStats.activeDays / new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-zinc-500">This Month</div>
          </div>
        </div>
      </Card>

      {/* Calendar */}
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-zinc-500" />
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-zinc-500">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {fullCalendarGrid.map((date, index) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, new Date());
            const isCompleted = completionDates.has(dateStr);

            return (
              <div
                key={index}
                className={`
                  min-h-[80px] p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg
                  transition-all hover:shadow-md cursor-default
                  ${isCurrentMonth ? 'bg-white dark:bg-zinc-800' : 'bg-zinc-50 dark:bg-zinc-900 opacity-50'}
                  ${isToday ? 'ring-2 ring-zinc-500' : ''}
                  ${isCompleted ? 'bg-zinc-500/10 dark:bg-zinc-900/20' : ''}
                `}
              >
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  {format(date, 'd')}
                </div>

                {isCompleted ? (
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-zinc-500/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 text-center">-</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>Completion Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-900 border border-zinc-700"></div>
              <span>Not completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-500/30 border border-zinc-500/50"></div>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
