import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClinicPortalView } from "@/components/ClinicPortalView";
import { getClinicflowSettings, clinicflowSignLogoUrl } from "@/utils/clinicflow.functions";

export const Route = createLazyFileRoute("/clinic-portal")({
  component: ClinicPortalPage,
});

const NAVY = "#1a3a6b";

function ClinicPortalPage() {
  const navigate = useNavigate();
  const { ready, session, userType, clinicId, signOut } = useAuth();
  const [clinicName, setClinicName] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const getSettings = useServerFn(getClinicflowSettings);
  const signLogo = useServerFn(clinicflowSignLogoUrl);

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

  useEffect(() => {
    if (!clinicId) return;
    let cancelled = false;
    (async () => {
      try {
        const { settings } = await getSettings({ data: { clinicId } });
        if (cancelled || !settings) return;
        const s = settings as { logo_url: string | null };
        if (s.logo_url) {
          const { url } = await signLogo({ data: { clinicId, path: s.logo_url } });
          if (!cancelled) setLogoUrl(url ?? null);
        }
      } catch {
        /* logo is decorative — ignore failures */
      }
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  if (!ready || !session || userType !== "clinic" || !clinicId) {
    return <div className="clinic-portal-page" style={{ minHeight: "100vh", background: "#f0f2f5" }} />;
  }

  return (
    <div className="clinic-portal-page" style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "#f0f2f5", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <header style={{ height: 60, flexShrink: 0, background: NAVY, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>ClinicFlow Test Clinic</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Clinic Partner Portal</div>
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
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ClinicPortalView clinicId={clinicId} clinicName={clinicName} isAdmin={false} />
      </div>
    </div>
  );
}
