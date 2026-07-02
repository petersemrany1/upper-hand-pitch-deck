import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Actionable error state: says what failed and always offers a retry.
 * Pass the React Query `refetch` (or any retry fn) as onRetry.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="anim-fade-in flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="type-h3">{title}</h3>
      {description ? <p className="type-small mt-1 max-w-sm">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
