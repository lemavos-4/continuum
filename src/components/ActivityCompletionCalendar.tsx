import { useMemo } from "react";
import {
  Calendar as Cal,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  Button as RACButton,
} from "react-aria-components";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { ArrowRight } from "@/lib/heroicons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActivityCompletionCalendarProps {
  entityId: string;
  trackingDates?: string[];
  onMarkComplete?: () => void;
  onOpenDetail?: () => void;
}

/**
 * Inline preview calendar for activities — visually aligned with
 * ActivityAnalyticsCalendar (RAC + monospace headers) but compact.
 */
export function ActivityCompletionCalendar({
  entityId,
  trackingDates = [],
  onMarkComplete,
  onOpenDetail,
}: ActivityCompletionCalendarProps) {
  void entityId;
  void onMarkComplete;

  const completionSet = useMemo(() => {
    const s = new Set<string>();
    trackingDates.forEach((d) => s.add(d.split("T")[0]));
    return s;
  }, [trackingDates]);

  const now = today(getLocalTimeZone());

  return (
    <div className="w-full border border-white/5 bg-white/[0.01] rounded-sm p-3 sm:p-4 md:p-5">
      <Cal aria-label="Activity calendar" className="w-full">
        <header className="flex items-center gap-1 pb-2 sm:pb-3">
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

        <CalendarGrid className="w-full [&_table]:w-full [&_table]:border-collapse">
          <CalendarGridHeader>
            {(day) => (
              <CalendarHeaderCell className="pb-1.5 font-mono text-[9px] sm:text-[9px] md:text-[10px] uppercase tracking-widest text-white/30">
                {day}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody className="[&_td]:p-0.5 [&_tr:not(:last-child)]:mb-1">
            {(date) => {
              const dateStr = date.toString();
              const isCompleted = completionSet.has(dateStr);
              const isToday = date.compare(now) === 0;
              return (
                <CalendarCell
                  date={date}
                  className={cn(
                    "relative mx-auto flex aspect-square w-full max-w-9 sm:max-w-10 md:max-w-11 items-center justify-center rounded-sm border text-[11px] outline-none transition-colors",
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

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">
          <span className="text-white/70">{trackingDates.length}</span> tracked
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-7 px-3 text-[11px]"
          onClick={onOpenDetail}
        >
          Open detail
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
