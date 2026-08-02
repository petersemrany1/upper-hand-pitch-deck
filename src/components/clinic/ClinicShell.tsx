import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, Bell, FileText, CalendarDays, CalendarClock, BookOpen, Settings, Menu, X, ArrowLeft,
} from "lucide-react";
import { getClinicflowSettings, clinicflowSignLogoUrl } from "@/utils/clinicflow.functions";
import { useAuth } from "@/hooks/useAuth";
import { ClinicPackBalance } from "@/components/clinic/ClinicPackBalance";

const NAVY = "#1a3a6b";
const PALE_BLUE = "#B5D4F4";
const DIVIDER = "rgba(255,255,255,0.2)";
const SIDEBAR_W = 230;

export const CLINIC_SECTIONS = [
  "patients", "followups", "quotes",
  "appointments", "availability",
  "training", "setup",
] as const;

export type ClinicSection = (typeof CLINIC_SECTIONS)[number];

type NavEntry = { key: ClinicSection; label: string; icon: typeof Users } | { divider: true };

const NAV: NavEntry[] = [
  { key: "patients", label: "Patients", icon: Users },
  { key: "followups", label: "Follow-ups", icon: Bell },
  { key: "quotes", label: "Quotes", icon: FileText },
  { divider: true },
  { key: "appointments", label: "Appointments", icon: CalendarDays },
  { key: "availability", label: "Availability", icon: CalendarClock },
  { divider: true },
  { key: "training", label: "Training", icon: BookOpen },
  { key: "setup", label: "Setup", icon: Settings },
];

function initialsOf(name: string) {
  return (name || "C")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function ClinicShell({
  clinicId,
  clinicName,
  isAdmin,
  showClinicFlow = true,
  active,
  onNavigate,
  followupsDue,
  children,
}: {
  clinicId: string;
  clinicName: string;
  isAdmin: boolean;
  showClinicFlow?: boolean;
  active: ClinicSection;
  onNavigate: (s: ClinicSection) => void;
  followupsDue: number;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const getSettings = useServerFn(getClinicflowSettings);
  const signLogo = useServerFn(clinicflowSignLogoUrl);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [narrow, setNarrow] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: NavEntry[] = showClinicFlow
    ? NAV
    : [
        { key: "appointments", label: "Appointments", icon: CalendarDays },
        { key: "availability", label: "Availability", icon: CalendarClock },
      ];


  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { settings } = await getSettings({ data: { clinicId } });
        if (cancelled || !settings) return;
        const s = settings as { logo_url: string | null; doctor_name: string | null };
        setDoctorName(s.doctor_name ?? "");
        if (s.logo_url) {
          const { url } = await signLogo({ data: { clinicId, path: s.logo_url } });
          if (!cancelled) setLogoUrl(url ?? null);
        }
      } catch {
        /* logo/doctor name are decorative — ignore failures */
      }
    })();
    return () => { cancelled = true; };
  }, [clinicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: ClinicSection) => { onNavigate(s); setDrawerOpen(false); };

  const sidebar = (
    <aside
      style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        background: NAVY,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: narrow ? "fixed" : "sticky",
        top: 0,
        left: 0,
        zIndex: narrow ? 120 : 1,
      }}
    >
      {/* Clinic identity */}
      <div style={{ padding: "18px 14px 14px", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {logoUrl ? (
          <img src={logoUrl} alt={`${clinicName} logo`} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", background: "#fff", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#fff", color: NAVY, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {initialsOf(clinicName)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {clinicName || "Clinic"}
          </div>
          <div style={{ fontSize: 11, color: PALE_BLUE }}>Clinic Partner Portal</div>
        </div>
        {narrow && (
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: "4px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {NAV.map((entry, i) => {
          if ("divider" in entry) {
            return <div key={`d${i}`} style={{ height: 1, background: DIVIDER, margin: "8px 6px" }} />;
          }
          const Icon = entry.icon;
          const isActive = active === entry.key;
          return (
            <button
              key={entry.key}
              onClick={() => go(entry.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 8, border: "none",
                background: isActive ? "rgba(255,255,255,0.16)" : "transparent",
                color: isActive ? "#fff" : PALE_BLUE,
                fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
              }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{entry.label}</span>
              {entry.key === "followups" && followupsDue > 0 && (
                <span style={{ background: "#fff7ed", color: "#9a3412", borderRadius: 999, fontSize: 10.5, fontWeight: 700, padding: "2px 7px" }}>
                  {followupsDue}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", paddingBottom: 12 }}>
        <ClinicPackBalance clinicId={clinicId} isAdmin={isAdmin} />

        <div style={{ height: 1, background: DIVIDER, margin: "12px 12px 10px" }} />

        <div style={{ padding: "0 14px", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {initialsOf(doctorName || clinicName)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {doctorName || clinicName || "Clinic"}
            </div>
            <button
              onClick={() => { void signOut().then(() => navigate({ to: "/login", replace: true })); }}
              style={{ background: "transparent", border: "none", padding: 0, color: PALE_BLUE, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}
            >
              Sign out
            </button>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate({ to: "/partner-clinics" })}
            style={{
              margin: "10px 14px 0", display: "inline-flex", alignItems: "center", gap: 6,
              background: "transparent", border: "none", padding: 0,
              color: PALE_BLUE, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={12} /> Back to admin
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f7fb", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {!narrow && sidebar}

      {narrow && drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 110 }}
          />
          {sidebar}
        </>
      )}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {narrow && (
          <div style={{ height: 52, background: NAVY, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", position: "sticky", top: 0, zIndex: 60 }}>
            <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}>
              <Menu size={20} />
            </button>
            {logoUrl ? (
              <img src={logoUrl} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover", background: "#fff" }} />
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#fff", color: NAVY, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {initialsOf(clinicName)}
              </div>
            )}
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {clinicName || "Clinic"}
            </div>
          </div>
        )}

        <main style={{ flex: 1, padding: narrow ? 14 : 24, minWidth: 0 }}>
          {active === "patients" && followupsDue > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button
                onClick={() => go("followups")}
                style={{
                  background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa",
                  borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {followupsDue} follow-up{followupsDue !== 1 ? "s" : ""} due today
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
