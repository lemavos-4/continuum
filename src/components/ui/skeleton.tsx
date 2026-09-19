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

/**
 * Neutral full-page placeholder used as the Suspense fallback for lazy routes.
 * Deliberately generic (header + stacked rows) so it doesn't mimic any single
 * page layout while a route chunk loads.
 */
function SkeletonPage() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in px-4 py-8 sm:px-6 lg:px-12">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-1/2 max-w-sm" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-16 rounded-xl"
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    </div>
  );
}


export { Skeleton, SkeletonPage };
