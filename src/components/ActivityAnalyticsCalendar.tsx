import { useMemo } from "react";
import { Calendar as Cal, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading, Button as RACButton } from "react-aria-components";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface ActivityAnalyticsCalendarProps {
  trackingDates?: string[];
  historyDays?: number;
}

export function ActivityAnalyticsCalendar({ trackingDates = [] }: ActivityAnalyticsCalendarProps) {
  const completionSet = useMemo(() => {
    const s = new Set<string>();
    trackingDates.forEach((d) => s.add(d.split("T")[0]));
    return s;
  }, [trackingDates]);

  const now = today(getLocalTimeZone());

  const stats = useMemo(() => {
    const ymCurrent = `${now.year}-${String(now.month).padStart(2, "0")}`;
    let monthActive = 0;
    completionSet.forEach((d) => {
      if (d.startsWith(ymCurrent)) monthActive += 1;
    });
    const daysInMonth = now.calendar.getDaysInMonth(now);
    return {
      total: trackingDates.length,
      monthActive,
      monthPct: daysInMonth ? Math.round((monthActive / daysInMonth) * 100) : 0,
    };
  }, [completionSet, trackingDates.length, now]);

  return (
    <div className="space-y-6">
      {/* Completion Summary — minimal, app-aligned */}
      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/30 font-mono">Completion</p>
            <h3 className="mt-1 font-serif text-xl text-white">Summary</h3>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {now.toDate(getLocalTimeZone()).toLocaleString(undefined, { month: "short", year: "numeric" })}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-white/5">
          <SummaryStat label="Total" value={stats.total} />
          <SummaryStat label="This month" value={stats.monthActive} />
          <SummaryStat label="Month rate" value={`${stats.monthPct}%`} />
        </div>
      </div>


      {/* Calendar */}
      <div className="border border-white/5 bg-white/[0.01] rounded-sm p-5">
        <Cal aria-label="Activity calendar" className="w-full">
          <header className="flex items-center gap-1 pb-4">
            <RACButton
              slot="previous"
              className="flex size-8 items-center justify-center rounded-sm text-white/40 outline-none transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </RACButton>
            <Heading className="grow text-center font-mono text-[11px] uppercase tracking-[0.28em] text-white/70" />
            <RACButton
              slot="next"
              className="flex size-8 items-center justify-center rounded-sm text-white/40 outline-none transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </RACButton>
          </header>

          <CalendarGrid className="w-full">
            <CalendarGridHeader>
              {(day) => (
                <CalendarHeaderCell className="pb-2 font-mono text-[9px] uppercase tracking-widest text-white/30">
                  {day}
                </CalendarHeaderCell>
              )}
            </CalendarGridHeader>
            <CalendarGridBody className="[&_td]:p-0.5">
              {(date) => {
                const dateStr = date.toString();
                const isCompleted = completionSet.has(dateStr);
                const isToday = date.compare(now) === 0;
                return (
                  <CalendarCell
                    date={date}
                    className={cn(
                      "relative mx-auto flex aspect-square size-9 items-center justify-center rounded-sm border text-xs outline-none transition-colors",
                      "data-[outside-month]:opacity-30 data-[focus-visible]:ring-1 data-[focus-visible]:ring-white/40",
                      isCompleted
                        ? "border-white/30 bg-white/15 text-white"
                        : "border-white/5 bg-transparent text-white/60 hover:bg-white/5 hover:text-white",
                      isToday && !isCompleted && "border-white/40 text-white",
                    )}
                  />
                );
              }}
            </CalendarGridBody>
          </CalendarGrid>
        </Cal>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 mt-5 pt-4 border-t border-white/5 font-mono text-[10px] uppercase tracking-widest text-white/40">
          <div className="flex items-center gap-2">
            <span className="block size-3 rounded-sm border border-white/5 bg-transparent" />
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="block size-3 rounded-sm border border-white/40" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="block size-3 rounded-sm border border-white/30 bg-white/20" />
            <span>Done</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="bg-black/40 p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">{label}</p>
      <p className="mt-2 font-serif text-2xl text-white tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-xs text-white/40 font-sans">{suffix}</span> : null}
      </p>
    </div>
  );
}
