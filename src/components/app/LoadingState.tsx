import { Skeleton } from "@/components/ui/skeleton";

/**
 * List-shaped skeleton: use while a screen's primary query is pending.
 * Rows roughly match the uh-card list rhythm so content doesn't jump.
 */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="anim-fade-in space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="uh-card flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Grid of KPI-tile skeletons for dashboard headers. */
export function StatRowSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div
      className="anim-fade-in grid gap-3"
      style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))` }}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="uh-card space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}
