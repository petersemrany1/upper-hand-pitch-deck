import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * KPI tile: label on top, big value, optional hint/delta below.
 */
export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("uh-card", className)}>
      <div className="type-label">{label}</div>
      <div className="type-display mt-1 tabular-nums">{value}</div>
      {hint ? <div className="type-caption mt-1">{hint}</div> : null}
    </div>
  );
}
