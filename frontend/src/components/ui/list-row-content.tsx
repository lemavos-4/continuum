import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FitText } from "@/components/ui/fit-text";

interface ListRowContentProps {
  icon: ReactNode;
  title: string;
  /** Secondary line, e.g. "Journal · 1 hour ago". */
  meta?: ReactNode;
  /** Right-hand slot (status badge, actions). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Shared list row body: leading icon tile, title with auto-fitting font size,
 * a single meta line and an optional trailing slot.
 * Purely presentational — no data logic.
 */
export function ListRowContent({ icon, title, meta, trailing, className }: ListRowContentProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-3", className)}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <FitText
          as="h3"
          max={19}
          min={13}
          className="font-serif leading-snug text-foreground transition-colors"
        >
          {title}
        </FitText>
        {meta && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{meta}</p>
        )}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
    </div>
  );
}
