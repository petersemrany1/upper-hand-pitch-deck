import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClinicPortalView } from "@/components/ClinicPortalView";

export const Route = createFileRoute("/clinic-portal")({
  component: ClinicPortalPage,
  head: () => ({ meta: [{ title: "Clinic Partner Portal" }] }),
});

const NAVY = "#1a3a6b";

function ClinicPortalPage() {
  const navigate = useNavigate();
  const { ready, session, userType, clinicId, signOut } = useAuth();
  const [clinicName, setClinicName] = useState<string>("");

  // Auth gate: only clinic users; everyone else gets bounced.
  useEffect(() => {
    if (!ready) return;
    if (!session) { navigate({ to: "/login", replace: true }); return; }
    if (userType === "unknown") return; // wait
    if (userType === "admin" || userType === "rep") {
      navigate({ to: "/", replace: true });
    }
  }, [ready, session, userType, navigate]);

  useEffect(() => {
    if (!clinicId) return;
    void supabase.from("partner_clinics").select("clinic_name").eq("id", clinicId).maybeSingle()
      .then(({ data }) => setClinicName(data?.clinic_name ?? ""));
  }, [clinicId]);

  if (!ready || !session || userType !== "clinic" || !clinicId) {
    return <div style={{ minHeight: "100vh", background: "#f0f2f5" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <header style={{ height: 60, background: NAVY, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "#fff", color: NAVY, borderRadius: 6, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>HT</div>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>Hair Transplant Group</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Clinic Partner Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {clinicName && (
            <div style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 500 }}>{clinicName}</div>
          )}
          <button onClick={() => { void signOut().then(() => navigate({ to: "/login", replace: true })); }}
            style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </header>
      <ClinicPortalView clinicId={clinicId} clinicName={clinicName} isAdmin={false} />
    </div>
  );
}
