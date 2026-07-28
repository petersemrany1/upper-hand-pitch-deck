import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Circle, Upload, Loader2, Building2, CreditCard, Settings2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getClinicflowSettings,
  updateClinicflowSettings,
  clinicflowConnectOnboard,
  clinicflowConnectStatus,
  clinicflowSignLogoUrl,
} from "@/utils/clinicflow.functions";
import { ClinicFlowPhotos } from "@/components/ClinicFlowPhotos";

const NAVY = "#1a3a6b";
const NAVY_PALE = "#edf2f9";
const GREEN = "#15803d";
const GREEN_BG = "#dcfce7";
const GREY = "#6b7785";
const LINE = "#e2e6ec";

type Settings = {
  clinic_id: string;
  stripe_account_id: string | null;
  stripe_details_submitted: boolean;
  stripe_charges_enabled: boolean;
  logo_url: string | null;
  whatsapp_number: string | null;
  default_deposit_amount: number;
  quote_validity_days: number;
  kiosk_pin: string;
  follicle_model_url: string | null;
};


export function ClinicFlowSetup({ clinicId }: { clinicId: string }) {
  const getFn = useServerFn(getClinicflowSettings);
  const updateFn = useServerFn(updateClinicflowSettings);
  const onboardFn = useServerFn(clinicflowConnectOnboard);
  const statusFn = useServerFn(clinicflowConnectStatus);
  const signFn = useServerFn(clinicflowSignLogoUrl);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoDisplayUrl, setLogoDisplayUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [whatsapp, setWhatsapp] = useState("");
  const [deposit, setDeposit] = useState<string>("1000");
  const [validity, setValidity] = useState<string>("14");
  const [kioskPin, setKioskPin] = useState<string>("0000");
  const [follicleModelUrl, setFollicleModelUrl] = useState<string>("");


  const load = async () => {
    try {
      const { settings: row } = await getFn({ data: { clinicId } });
      const s = row as Settings;
      setSettings(s);
      setWhatsapp(s.whatsapp_number ?? "");
      setDeposit(String(s.default_deposit_amount ?? 1000));
      setValidity(String(s.quote_validity_days ?? 14));
      setKioskPin(String(s.kiosk_pin ?? "0000"));
      setFollicleModelUrl(String(s.follicle_model_url ?? ""));

      if (s.logo_url) {
        try {
          const { url } = await signFn({ data: { clinicId, path: s.logo_url } });
          setLogoDisplayUrl(url);
        } catch {
          setLogoDisplayUrl(null);
        }
      } else {
        setLogoDisplayUrl(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load ClinicFlow settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  // If we came back from Stripe onboarding, auto-refresh status.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("clinicflow") === "stripe-return") {
      void refreshStripeStatus(true);
      // Clean the URL so a refresh doesn't re-trigger.
      params.delete("clinicflow");
      const search = params.toString();
      const url = window.location.pathname + (search ? `?${search}` : "");
      window.history.replaceState({}, "", url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshStripeStatus = async (showToast = false) => {
    setRefreshingStatus(true);
    try {
      const res = await statusFn({ data: { clinicId } });
      if (res.success) {
        await load();
        if (showToast) {
          toast.success(res.chargesEnabled ? "Stripe connected — ready to take deposits" : "Stripe status updated");
        }
      } else if (showToast) {
        toast.error(res.error);
      }
    } catch (e) {
      if (showToast) toast.error(e instanceof Error ? e.message : "Failed to refresh Stripe status");
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      // Path must start with clinicId so RLS on storage.objects allows write.
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${clinicId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("clinicflow-logos").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/png",
      });
      if (error) throw error;
      await updateFn({ data: { clinicId, logoUrl: path } });
      toast.success("Logo uploaded");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const saveWhatsapp = async () => {
    try {
      await updateFn({ data: { clinicId, whatsappNumber: whatsapp.trim() || null } });
      await load();
      toast.success("Saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("saveWhatsapp failed", e);
      toast.error(`Save failed: ${msg}`);
    }
  };

  const saveKioskPin = async () => {
    const pin = kioskPin.trim();
    if (!/^\d{4,8}$/.test(pin)) return toast.error("Kiosk PIN must be 4-8 digits");
    try {
      await updateFn({ data: { clinicId, kioskPin: pin } });
      await load();
      toast.success("Kiosk PIN saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Save failed: ${msg}`);
    }
  };


  const saveDefaults = async () => {
    const d = Number(deposit);
    const v = Number(validity);
    if (!Number.isFinite(d) || d < 0) return toast.error("Enter a valid deposit amount");
    if (!Number.isFinite(v) || v < 1) return toast.error("Enter a valid validity period");
    try {
      await updateFn({ data: { clinicId, defaultDepositAmount: d, quoteValidityDays: v } });
      await load();
      toast.success("Saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("saveDefaults failed", e);
      toast.error(`Save failed: ${msg}`);
    }
  };

  const startOnboarding = async () => {
    setConnecting(true);
    try {
      const res = await onboardFn({ data: { clinicId } });
      if (!res.success) {
        console.error("clinicflowConnectOnboard returned error:", res.error);
        toast.error(res.error || "Stripe onboarding failed");
        return;
      }
      // Same-tab navigation — popups are blocked on iPad Safari.
      window.location.href = res.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("startOnboarding threw:", e);
      toast.error(`Stripe onboarding failed: ${msg}`);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: GREY }}>
        <Loader2 size={20} className="animate-spin" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} /> Loading…
      </div>
    );
  }
  if (!settings) return null;

  const step1Done = !!(settings.logo_url && settings.whatsapp_number);
  const step2Done = settings.stripe_charges_enabled;
  // Step 3 has defaults from DB, so it's "done" once user has confirmed (deposit>0 & validity>0 already true by default). We just mark done if the row has been saved with non-null values — the migration seeded defaults, so it's effectively always ready. Treat step 3 as always done to avoid a misleading amber state.
  const step3Done = settings.default_deposit_amount > 0 && settings.quote_validity_days > 0;

  return (
    <div style={{ padding: 24, maxWidth: 780, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Header + Ready badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>ClinicFlow setup</h1>
          <p style={{ fontSize: 13, color: GREY, marginTop: 6, maxWidth: 520 }}>
            Complete these steps to start taking patient consult deposits directly into your bank.
          </p>
        </div>
        {step2Done ? (
          <span style={{ background: GREEN_BG, color: GREEN, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={16} /> Ready to take deposits
          </span>
        ) : (
          <span style={{ background: "#fff7ed", color: "#9a3412", padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
            Setup in progress
          </span>
        )}
      </div>

      {/* Step 1 */}
      <StepCard
        n={1}
        done={step1Done}
        icon={<Building2 size={18} />}
        title="Your clinic details"
        subtitle="Logo and contact number patients will see."
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={labelStyle}>Clinic logo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
              <div style={{ width: 80, height: 80, borderRadius: 12, background: NAVY_PALE, border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {logoDisplayUrl ? (
                  <img src={logoDisplayUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <Building2 size={26} color={NAVY} />
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={primaryBtn(uploading)}
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {settings.logo_url ? "Replace logo" : "Upload logo"}
                </button>
                <div style={{ fontSize: 11, color: GREY, marginTop: 6 }}>PNG or JPG, up to 2MB.</div>
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>WhatsApp number</label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+61 4XX XXX XXX"
                style={inputStyle}
              />
              <button onClick={() => void saveWhatsapp()} style={primaryBtn(false)}>Save</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Kiosk PIN</label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={kioskPin}
                onChange={(e) => setKioskPin(e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                style={{ ...inputStyle, letterSpacing: 6, fontFamily: "monospace", maxWidth: 180 }}
              />
              <button onClick={() => void saveKioskPin()} style={primaryBtn(false)}>Save PIN</button>
            </div>
            <div style={{ fontSize: 11, color: GREY, marginTop: 6 }}>
              4-8 digits. Staff enter this to exit the patient check-in kiosk on the iPad.
            </div>
          </div>

        </div>
      </StepCard>

      {/* Step 2 */}
      <StepCard
        n={2}
        done={step2Done}
        icon={<CreditCard size={18} />}
        title="Connect your bank"
        subtitle="Stripe handles the payment. Deposits go straight into your clinic's bank account."
      >
        {settings.stripe_charges_enabled ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: GREEN, fontSize: 14, fontWeight: 600 }}>
            <CheckCircle2 size={18} /> Connected — you're ready to accept deposits.
          </div>
        ) : (
          <div>
            <button onClick={() => void startOnboarding()} disabled={connecting} style={primaryBtn(connecting)}>
              {connecting ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              {settings.stripe_account_id ? "Continue Stripe setup" : "Connect Stripe"}
            </button>
            {settings.stripe_account_id && (
              <button
                onClick={() => void refreshStripeStatus(true)}
                disabled={refreshingStatus}
                style={{ ...secondaryBtn, marginLeft: 8 }}
              >
                {refreshingStatus ? <Loader2 size={14} className="animate-spin" /> : null} Refresh status
              </button>
            )}
            <div style={{ fontSize: 12, color: GREY, marginTop: 10, lineHeight: 1.5 }}>
              You'll be sent to Stripe to enter your business details and bank account. Once approved you'll be sent back here automatically.
            </div>
          </div>
        )}
      </StepCard>

      {/* Step 3 */}
      <StepCard
        n={3}
        done={step3Done}
        icon={<Settings2 size={18} />}
        title="Defaults"
        subtitle="Used as the starting values on every new patient quote."
      >
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={labelStyle}>Default deposit (AUD)</label>
            <input
              type="number"
              min={0}
              step={50}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Quote validity (days)</label>
            <input
              type="number"
              min={1}
              step={1}
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button onClick={() => void saveDefaults()} style={primaryBtn(false)}>Save defaults</button>
        </div>
      </StepCard>
    </div>
  );
}

function StepCard({
  n, done, icon, title, subtitle, children,
}: {
  n: number;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: "0 1px 3px rgba(26,58,107,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: done ? GREEN_BG : NAVY_PALE, color: done ? GREEN : NAVY,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GREY }}>Step {n}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: NAVY }}>{icon}</span>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: 0 }}>{title}</h2>
          </div>
          <div style={{ fontSize: 12.5, color: GREY, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.4,
};
const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 8,
  fontSize: 14, fontFamily: "inherit", background: "#fff", color: "#111",
};
const secondaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#fff", color: NAVY, border: `1px solid ${LINE}`,
  padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit",
};
function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: NAVY, color: "#fff", border: "none",
    padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
    fontFamily: "inherit",
  };
}
