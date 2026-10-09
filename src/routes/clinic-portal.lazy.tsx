import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClinicPortalView } from "@/components/ClinicPortalView";
import { clinicPortalTarget } from "@/lib/partner-view";
import { getPartnerViewClinic } from "@/lib/partner-view.functions";
import { isCalendarApprovalHost } from "@/lib/calendar-release";

export const Route = createLazyFileRoute("/clinic-portal")({
  component: ClinicPortalPage,
});

const NAVY = "#1a3a6b";

function ClinicPortalPage() {
  const navigate = useNavigate();
  const { ready, session, userType, clinicId, signOut } = useAuth();
  const { viewClinic } = Route.useSearch();
  const userId = session?.user.id;
  const target = clinicPortalTarget(userType, clinicId, viewClinic);
  const portalId = target?.clinicId;
  const partnerView = target?.partnerView ?? false;
  const requestKey = `${userId ?? ""}:${partnerView}:${portalId ?? ""}`;
  const [clinic, setClinic] = useState<{ key: string; name: string } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Partners always use their assigned clinic. Admin partner views are also
  // checked on the server before any clinic content is mounted.
  useEffect(() => {
    if (!ready) return;
    if (!session) { navigate({ to: "/login", replace: true }); return; }
    if (userType === "unknown") return; // wait
    if (!portalId) {
      navigate({ to: "/", replace: true });
    }
  }, [ready, session, userType, portalId, navigate]);

  useEffect(() => {
    if (!ready || !userId || !portalId) return;
    let cancelled = false;
    setClinic(null); setFailure(null);
    const load = async () => {
      if (partnerView) return getPartnerViewClinic({ data: { clinicId: portalId } });
      const { data, error } = await supabase.from("partner_clinics").select("clinic_name").eq("id", portalId).maybeSingle();
      if (error || !data) throw new Error("Could not load your clinic. Please try again.");
      return data;
    };
    void load().then(data => { if (!cancelled) setClinic({ key: requestKey, name: data.clinic_name }); })
      .catch(error => { if (!cancelled) setFailure({ key: requestKey, message: error instanceof Error ? error.message : "Could not load this portal. Please try again." }); });
    return () => { cancelled = true; };
  }, [ready, userId, portalId, partnerView, requestKey, attempt]);

  if (!ready || !session || !portalId) {
    return <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: 24 }} role="status">Loading partner portal…</div>;
  }
  const clinicName = clinic?.key === requestKey ? clinic.name : "";

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {partnerView && <div className="partner-view-banner">
        <div><strong>Partner view{clinicName ? ` · ${clinicName}` : ""}</strong><p>{isCalendarApprovalHost() ? "Availability changes stay in this preview. Other changes are real." : "You are viewing the partner portal. Changes here are real."}</p></div>
        <Link to="/settings" hash="partner-view">Back to Settings</Link>
      </div>}
      <header className="clinic-portal-header" style={{ height: 60, background: NAVY, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <div className="clinic-header-group" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flexShrink: 0, width: 34, height: 34, background: "#fff", color: NAVY, borderRadius: 6, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>HT</div>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>Hair Transplant Group</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Clinic Partner Portal</div>
          </div>
        </div>
        <div className="clinic-header-group" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {clinicName && (
            <div style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 500 }}>{clinicName}</div>
          )}
          <button onClick={() => { if (partnerView) { void navigate({ to: "/settings", hash: "partner-view" }); } else { void signOut().then(() => navigate({ to: "/login", replace: true })); } }}
            style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
            {partnerView ? "Exit partner view" : "Sign out"}
          </button>
        </div>
      </header>
      {failure?.key === requestKey ? <div role="alert" style={{ padding: 24 }}><p>{failure.message}</p><button onClick={() => setAttempt(n => n + 1)} style={{ marginTop: 12, color: NAVY, textDecoration: "underline" }}>Retry</button></div>
        : clinic?.key !== requestKey ? <p role="status" style={{ padding: 24 }}>Loading partner portal…</p>
        : <ClinicPortalView clinicId={portalId} clinicName={clinicName} isAdmin={false} />}
    </div>
  );
}
