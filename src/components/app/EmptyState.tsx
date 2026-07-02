import type { ComponentType, ReactNode } from "react";
import { Inbox } from "lucide-react";

/**
 * Designed empty state: icon, one-line headline, supporting copy, optional
 * call to action. Use whenever a list/table legitimately has no rows.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="anim-fade-in flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="type-h3">{title}</h3>
      {description ? <p className="type-small mt-1 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
