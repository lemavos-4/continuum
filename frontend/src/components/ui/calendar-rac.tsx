"use client";

import { cn } from "@/lib/utils";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ComponentProps } from "react";
import {
  Button,
  CalendarCell as CalendarCellRac,
  CalendarGridBody as CalendarGridBodyRac,
  CalendarGridHeader as CalendarGridHeaderRac,
  CalendarGrid as CalendarGridRac,
  CalendarHeaderCell as CalendarHeaderCellRac,
  Calendar as CalendarRac,
  Heading as HeadingRac,
  RangeCalendar as RangeCalendarRac,
  composeRenderProps,
} from "react-aria-components";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";

interface BaseCalendarProps {
  className?: string;
}

type CalendarProps = ComponentProps<typeof CalendarRac> & BaseCalendarProps;
type RangeCalendarProps = ComponentProps<typeof RangeCalendarRac> & BaseCalendarProps;

const CalendarHeader = () => (
  <header className="flex w-full items-center gap-1 pb-2">
    <Button
      slot="previous"
      className="flex size-8 items-center justify-center rounded-sm text-white/40 outline-none transition-colors hover:bg-white/5 hover:text-white data-[focus-visible]:ring-1 data-[focus-visible]:ring-white/40"
    >
      <ChevronLeftIcon className="h-4 w-4" />
    </Button>
    <HeadingRac className="grow text-center font-mono text-[11px] uppercase tracking-[0.28em] text-white/70" />
    <Button
      slot="next"
      className="flex size-8 items-center justify-center rounded-sm text-white/40 outline-none transition-colors hover:bg-white/5 hover:text-white data-[focus-visible]:ring-1 data-[focus-visible]:ring-white/40"
    >
      <ChevronRightIcon className="h-4 w-4" />
    </Button>
  </header>
);

const CalendarGridComponent = ({ isRange = false }: { isRange?: boolean }) => {
  const now = today(getLocalTimeZone());

  return (
    <CalendarGridRac>
      <CalendarGridHeaderRac>
        {(day) => (
          <CalendarHeaderCellRac className="size-9 rounded-sm p-0 font-mono text-[10px] uppercase tracking-widest text-white/30">
            {day}
          </CalendarHeaderCellRac>
        )}
      </CalendarGridHeaderRac>
      <CalendarGridBodyRac className="[&_td]:px-0">
        {(date) => (
          <CalendarCellRac
            date={date}
            className={cn(
              "relative flex size-9 items-center justify-center whitespace-nowrap rounded-sm border border-transparent p-0 text-xs font-normal text-white/70 outline-none duration-150 [transition-property:color,background-color,border-radius,box-shadow] data-[disabled]:pointer-events-none data-[unavailable]:pointer-events-none data-[focus-visible]:z-10 data-[hovered]:bg-white/5 data-[selected]:bg-white data-[hovered]:text-white data-[selected]:text-black data-[unavailable]:line-through data-[disabled]:opacity-30 data-[unavailable]:opacity-30 data-[focus-visible]:ring-1 data-[focus-visible]:ring-white/40",
              isRange &&
                "data-[selected]:rounded-none data-[selection-end]:rounded-e-sm data-[selection-start]:rounded-s-sm data-[selected]:bg-white/10 data-[selected]:text-white data-[selection-end]:[&:not([data-hover])]:bg-white data-[selection-start]:[&:not([data-hover])]:bg-white data-[selection-end]:[&:not([data-hover])]:text-black data-[selection-start]:[&:not([data-hover])]:text-black",
              date.compare(now) === 0 &&
                cn(
                  "after:pointer-events-none after:absolute after:bottom-1 after:start-1/2 after:z-10 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-white",
                  isRange
                    ? "data-[selection-end]:[&:not([data-hover])]:after:bg-black data-[selection-start]:[&:not([data-hover])]:after:bg-black"
                    : "data-[selected]:after:bg-black",
                ),
            )}
          />
        )}
      </CalendarGridBodyRac>
    </CalendarGridRac>
  );
};

const Calendar = ({ className, ...props }: CalendarProps) => {
  return (
    <CalendarRac
      {...props}
      className={composeRenderProps(className, (className) => cn("w-fit", className))}
    >
      <CalendarHeader />
      <CalendarGridComponent />
    </CalendarRac>
  );
};

const RangeCalendar = ({ className, ...props }: RangeCalendarProps) => {
  return (
    <RangeCalendarRac
      {...props}
      className={composeRenderProps(className, (className) => cn("w-fit", className))}
    >
      <CalendarHeader />
      <CalendarGridComponent isRange />
    </RangeCalendarRac>
  );
};

export { Calendar, RangeCalendar };
export type { CalendarProps, RangeCalendarProps };
