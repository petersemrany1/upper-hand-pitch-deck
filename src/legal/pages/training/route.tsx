// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/route.tsx). Re-run the port script to refresh.
import { Outlet } from "@/legal/runtime/router";

// The parent guard checks the saved Training grant before any module renders.
// Training does not mount the dialler, ringtones or SMS toasts.
// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { TrainingLayout as LegalPage };
export const Route = legalRoute({ component: TrainingLayout });

function TrainingLayout() {
  return (
    <div
      className="flex-1 overflow-y-auto bg-muted/30"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      <Outlet />
    </div>
  );
}
