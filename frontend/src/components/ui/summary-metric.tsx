import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SummaryMetricProps {
  label: string;
  value: string;
  delta?: number;
  comparison?: string;
}

/** Big serif metric used on the Dashboard/Insights summary strips. */
export function SummaryMetric({ label, value, delta = 0, comparison }: SummaryMetricProps) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  const arrow = isDown ? "↓" : isUp ? "↑" : "–";
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="truncate font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="truncate font-serif text-4xl leading-none tabular-nums text-foreground sm:text-5xl">{value}</p>
      {comparison && (
        <div className="inline-flex items-center gap-1.5 self-start rounded-sm border border-border bg-accent/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
          <span className={cn(isDown && "text-red-300/80", isUp && "text-emerald-300/80")}>
            {arrow} {Math.abs(delta)}
          </span>
          <span className="opacity-70">{comparison}</span>
        </div>
      )}
    </div>
  );
}

/** Three-up strip wrapper shared by Dashboard and Insights. */
export function SummaryMetricRow({
  eyebrow,
  children,
  className,
}: {
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-sm bg-accent/20 p-5 sm:p-8", className)}>
      {eyebrow && (
        <p className="mb-6 hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
          {eyebrow}
        </p>
      )}
      <div className="grid grid-cols-3 gap-4 sm:gap-8">{children}</div>
    </section>
  );
}
