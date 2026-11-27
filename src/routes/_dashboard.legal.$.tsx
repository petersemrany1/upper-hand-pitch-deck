import { createFileRoute } from "@tanstack/react-router";
import { hasNativeLegalPage, LegalView } from "@/legal/LegalView";

// Legal-only screens (firms, dashboard, settings, cold calling…) while they are
// being moved in. They open only with ?legalData=portal and run on the copied
// Legal records; the Legal app stays the live one until switch-over.
export const Route = createFileRoute("/_dashboard/legal/$")({
  component: LegalOnlyPage,
});

function LegalOnlyPage() {
  const { _splat } = Route.useParams();
  const path = `/legal/${_splat ?? ""}`.replace(/\/$/, "");
  if (!hasNativeLegalPage(path))
    return (
      <div className="p-6 text-sm" style={{ color: "#6b6b68" }}>
        This Legal screen isn't in the portal yet. It still opens in the Legal app.
      </div>
    );
  return <LegalView key={path} path={path} />;
}
