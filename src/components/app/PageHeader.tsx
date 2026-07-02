import type { ReactNode } from "react";

/**
 * Standard screen header: title, optional description, optional actions on
 * the right. Keeps every dashboard page's opening block identical.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="type-h1">{title}</h1>
        {description ? <p className="type-small mt-1">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
