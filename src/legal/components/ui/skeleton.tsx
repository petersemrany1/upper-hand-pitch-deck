// Ported from the Legal app (family-law-floater/src/components/ui/skeleton.tsx). Re-run the port script to refresh.
import { cn } from "@/legal/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />;
}

export { Skeleton };
