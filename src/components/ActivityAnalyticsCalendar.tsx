import { useMemo } from "react";
import { Calendar as Cal, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading, Button as RACButton } from "react-aria-components";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface ActivityAnalyticsCalendarProps {
  trackingDates?: string[];
  historyDays?: number;
}

export function ActivityAnalyticsCalendar({ trackingDates = [] }: ActivityAnalyticsCalendarProps) {
  const { t } = useLanguage();
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
      <div className="border border-border/5 bg-foreground/[0.01] rounded-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono">{t("tm_completion")}</p>
            <h3 className="mt-1 font-serif text-xl text-foreground">{t("tm_summary")}</h3>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {now.toDate(getLocalTimeZone()).toLocaleString(undefined, { month: "short", year: "numeric" })}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-foreground/5">
          <SummaryStat label={t("tm_total")} value={stats.total} />
          <SummaryStat label={t("tm_this_month")} value={stats.monthActive} />
          <SummaryStat label={t("tm_month_rate")} value={`${stats.monthPct}%`} />
        </div>
      </div>


      {/* Calendar */}
      <div className="border border-border/5 bg-foreground/[0.01] rounded-sm p-3 sm:p-4 md:p-5">
        <Cal aria-label={t("tm_activity_calendar_label")} className="w-full">
          <header className="flex items-center gap-1 pb-3 sm:pb-4">
            <RACButton
              slot="previous"
              className="flex size-8 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </RACButton>
            <Heading className="grow text-center font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground" />
            <RACButton
              slot="next"
              className="flex size-8 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </RACButton>
          </header>

          <CalendarGrid className="w-full [&_table]:w-full [&_table]:border-collapse">
            <CalendarGridHeader>
              {(day) => (
                <CalendarHeaderCell className="pb-2 sm:pb-2 md:pb-3 font-mono text-[8px] sm:text-[9px] md:text-[9px] uppercase tracking-widest text-muted-foreground">
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
                      "relative mx-auto flex aspect-square w-full max-w-9 sm:max-w-10 md:max-w-11 items-center justify-center rounded-sm border text-xs outline-none transition-colors",
                      "data-[outside-month]:opacity-30 data-[focus-visible]:ring-1 data-[focus-visible]:ring-ring",
                      isCompleted
                        ? "border-border/30 bg-foreground/15 text-foreground"
                        : "border-border/5 bg-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                      isToday && !isCompleted && "border-border/40 text-foreground",
                    )}
                  />
                );
              }}
            </CalendarGridBody>
          </CalendarGrid>
        </Cal>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 mt-5 pt-4 border-t border-border/5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="block size-3 rounded-sm border border-border/5 bg-transparent" />
            <span>{t("tm_empty")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="block size-3 rounded-sm border border-border/40" />
            <span>{t("tm_today_cap")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="block size-3 rounded-sm border border-border/30 bg-foreground/20" />
            <span>{t("tm_done")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="bg-background/40 p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl text-foreground tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-xs text-muted-foreground font-sans">{suffix}</span> : null}
      </p>
    </div>
  );
}
