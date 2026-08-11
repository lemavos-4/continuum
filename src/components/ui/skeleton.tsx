import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  );
}

/** Multi-line text placeholder with a shorter trailing line. */
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? "62%" : `${88 - i * 6}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <SkeletonText lines={lines} className="mt-4" />
    </div>
  );
}

function SkeletonList({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 px-3 py-3"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3" style={{ width: `${70 - (i % 3) * 12}%` }} />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid({ items = 6, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}

/** Full-page placeholder used as the Suspense fallback for lazy routes. */
function SkeletonPage() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in px-4 py-8 sm:px-6 lg:px-12">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-10 w-2/3 max-w-md" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-[340px] rounded-xl lg:col-span-8" />
        <Skeleton className="h-[340px] rounded-xl lg:col-span-4" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonList, SkeletonGrid, SkeletonPage };
