import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Settings as SettingsIcon,
  Users,
  Plus,
  X,
  Pencil,
  Trash2,
  Mail,
  DollarSign,
  User as UserIcon,
  Bell,
  FileText,
  ChevronRight,
  Phone,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { inviteRep, listReps, updateRep, updateRepRole, deleteRep } from "@/utils/sales-call.functions";
import { provisionNumber, listPhoneNumbers, retireNumber } from "@/utils/phone-pool.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// NOTE: These exports are consumed by the protected pitch deck route
// (src/routes/_dashboard.pitch-deck.tsx). They are NOT surfaced in the
// settings UI — they're kept here purely so the pitch deck import keeps
// resolving. Do not remove.
const PITCH_DECK_STORAGE_KEY = "pitch-deck-settings";

export type DeckSettings = {
  caseValue: number;
  pricePerShow: number;
  convertRate: string;
};

export const DEFAULT_SETTINGS: DeckSettings = {
  caseValue: 12000,
  pricePerShow: 800,
  convertRate: "1 in 4",
};

const CONVERT_RATES: Record<string, number> = {
  "1 in 1": 1, "3 in 4": 0.75, "1 in 2": 0.5, "1 in 3": 0.333,
  "1 in 4": 0.25, "1 in 5": 0.2, "1 in 6": 0.167, "1 in 7": 0.143,
  "1 in 8": 0.125, "1 in 9": 0.111, "1 in 10": 0.1,
};

export function loadDeckSettings(): DeckSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(PITCH_DECK_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      caseValue: Number(parsed.caseValue) || DEFAULT_SETTINGS.caseValue,
      pricePerShow: Number(parsed.pricePerShow) || DEFAULT_SETTINGS.pricePerShow,
      convertRate:
        typeof parsed.convertRate === "string" && parsed.convertRate in CONVERT_RATES
          ? parsed.convertRate
          : DEFAULT_SETTINGS.convertRate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings" }],
  }),
});

type Rep = {
  id: string;
  name: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function SettingsPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  return (
    <div className="min-h-full md:h-full md:overflow-y-auto bg-[#f7f7f5] px-6 py-10 md:px-10 md:py-12" style={{ fontFamily: "DM Sans, sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1
              className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin ? "Manage your team and portal configuration." : "Your account."}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {isAdmin && <TeamSection />}
          {isAdmin && <PhoneNumbersSection />}
          <AccountSection user={user} />
          <NotificationsSection defaultEmail={user?.email ?? null} />
          {isAdmin && <BookingPricesSection />}
          {isAdmin && <BackfillSection />}
          <LogsSection />
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="bg-white"
      style={{ borderRadius: 14, border: "0.5px solid #e8e8e6", padding: 28 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="text-primary">{icon}</div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function AccountSection({ user }: { user: ReturnType<typeof useAuth>["user"] }) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const initialFirst =
    (meta.first_name as string | undefined) ||
    ((meta.full_name as string | undefined)?.split(" ")[0] ?? "") ||
    "";
  const initialLast =
    (meta.last_name as string | undefined) ||
    ((meta.full_name as string | undefined)?.split(" ").slice(1).join(" ") ?? "") ||
    "";

  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [savedTag, setSavedTag] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [repId, setRepId] = useState<string | null>(null);
  const baselineRef = (typeof window !== "undefined") ? null : null;

  // On mount, look up sales_reps row by email and prefill any missing fields.
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("id, first_name, last_name")
        .eq("email", user.email!)
        .maybeSingle();
      if (cancelled || !data) return;
      setRepId(data.id);
      setFirstName((cur) => cur || data.first_name || "");
      setLastName((cur) => cur || data.last_name || "");
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  const saveName = async (nextFirst: string, nextLast: string) => {
    if (!user) return;
    const full = `${nextFirst} ${nextLast}`.trim();
    const { error } = await supabase.auth.updateUser({
      data: { first_name: nextFirst, last_name: nextLast, full_name: full },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (repId) {
      await supabase
        .from("sales_reps")
        .update({ first_name: nextFirst, last_name: nextLast, name: full || nextFirst || nextLast })
        .eq("id", repId);
    } else if (user.email) {
      // Try matching by email if we didn't load a row yet
      await supabase
        .from("sales_reps")
        .update({ first_name: nextFirst, last_name: nextLast, name: full || nextFirst || nextLast })
        .eq("email", user.email);
    }
    setSavedTag(true);
    setTimeout(() => setSavedTag(false), 1500);
  };

  const onChangePassword = async () => {
    if (!user?.email) {
      toast.error("No email on file");
      return;
    }
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSendingReset(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  void baselineRef;

  return (
    <SectionShell
      icon={<UserIcon className="w-5 h-5" />}
      title="Account"
      subtitle="Your personal details."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            value={firstName}
            onChange={setFirstName}
            onBlur={() => void saveName(firstName, lastName)}
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={setLastName}
            onBlur={() => void saveName(firstName, lastName)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Email
          </label>
          <div className="px-3 py-2 rounded-md bg-muted/40 text-sm text-muted-foreground border border-border">
            {user?.email ?? "—"}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Password
          </label>
          <div className="px-3 py-2 rounded-md bg-muted/40 text-sm text-muted-foreground border border-border tracking-widest">
            ••••••••
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: "0.5px solid #f0f0ee" }}>
        <div className="text-xs text-muted-foreground">
          {savedTag ? <span className="text-emerald-600 font-medium">Saved</span> : "Changes save on blur."}
        </div>
        <button
          onClick={() => void onChangePassword()}
          disabled={sendingReset}
          className="px-4 py-2 rounded-md text-sm font-bold transition-opacity disabled:opacity-60"
          style={{ background: "#f4522d", color: "#fff" }}
        >
          {sendingReset ? "Sending…" : "Change password"}
        </button>
      </div>
    </SectionShell>
  );
}
function NotificationsSection({ defaultEmail }: { defaultEmail?: string | null }) {
  const [handoverEmail, setHandoverEmail] = useState("");
  const [alertsOn, setAlertsOn] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("fallback_handover_email");
    setHandoverEmail(stored && stored.length > 0 ? stored : (defaultEmail ?? ""));
    setAlertsOn(localStorage.getItem("new_lead_alerts_enabled") === "true");
  }, [defaultEmail]);

  const flashSaved = (key: string) => {
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
  };

  // Debounced save for the email input
  useEffect(() => {
    const initial = localStorage.getItem("fallback_handover_email") ?? "";
    if (handoverEmail === initial) return;
    const t = setTimeout(() => {
      localStorage.setItem("fallback_handover_email", handoverEmail);
      flashSaved("handover");
    }, 400);
    return () => clearTimeout(t);
  }, [handoverEmail]);

  const onToggleAlerts = (next: boolean) => {
    setAlertsOn(next);
    localStorage.setItem("new_lead_alerts_enabled", String(next));
    flashSaved("alerts");
  };

  return (
    <SectionShell
      icon={<Bell className="w-5 h-5" />}
      title="Notifications"
      subtitle="Where alerts go and what triggers them."
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Handover email fallback
            </label>
            {savedKey === "handover" && (
              <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
            )}
          </div>
          <input
            type="email"
            value={handoverEmail}
            onChange={(e) => setHandoverEmail(e.target.value)}
            placeholder="ops@yourcompany.com"
            className="w-full px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            If a clinic has no email saved, booking handovers go here instead.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 pt-5" style={{ borderTop: "0.5px solid #f0f0ee" }}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">New lead email alerts</span>
              {savedKey === "alerts" && (
                <span className="text-[11px] text-emerald-600 font-medium">Saved</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get an email when a new Meta lead comes in.
            </p>
          </div>
          <Toggle checked={alertsOn} onChange={onToggleAlerts} />
        </div>
      </div>
    </SectionShell>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
      style={{ background: checked ? "#f4522d" : "#e5e5e3" }}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function LogsSection() {
  return (
    <SectionShell
      icon={<FileText className="w-5 h-5" />}
      title="Logs"
      subtitle="System activity and diagnostics."
    >
      <Link
        to="/logs"
        className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:border-primary transition-colors"
      >
        <span className="text-sm font-medium text-foreground">View system logs</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </SectionShell>
  );
}

function TeamSection() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<Rep | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const r = await listReps();
    if (r.success) {
      const filtered = (r.reps as Rep[]).filter(
        (rep) => rep.email && rep.email.trim().length > 0,
      );
      setReps(filtered);
    } else setLoadError(r.error || "Failed to load reps");
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const onDelete = async (rep: Rep) => {
    if (!confirm(`Remove ${rep.name}? This will also delete their login.`)) return;
    const r = await deleteRep({ data: { id: rep.id } });
    if (r.success) { toast.success("Rep removed"); void load(); }
    else toast.error(r.error);
  };

  const onRoleChange = async (rep: Rep, nextRole: "admin" | "rep" | "caller") => {
    const prev = reps;
    setReps((rs) => rs.map((x) => x.id === rep.id ? { ...x, role: nextRole } : x));
    const r = await updateRepRole({ data: { id: rep.id, role: nextRole } });
    if (!r.success) {
      setReps(prev);
      toast.error(r.error);
    } else {
      const label = nextRole === "caller" ? "Clinic Appointment Setter" : nextRole;
      toast.success(`${rep.name} is now ${label}`);
    }
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Team</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sales reps with access to the portal.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors"
          style={{ background: "#f4522d", color: "#fff" }}
        >
          <Plus className="h-4 w-4" /> Invite Rep
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : loadError ? (
        <div className="text-sm py-6 text-center border border-dashed border-destructive/40 rounded-lg text-destructive">
          {loadError}
        </div>
      ) : reps.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No reps yet. Click <strong>Invite Rep</strong> to send the first invite.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-2.5 font-semibold">First Name</th>
                <th className="text-left px-4 py-2.5 font-semibold">Last Name</th>
                <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold">Role</th>
                <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.first_name || "—"}</td>
                  <td className="px-4 py-3 font-medium">{r.last_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={r.role === "admin" ? "admin" : r.role === "caller" ? "caller" : "rep"}
                      onChange={(e) => void onRoleChange(r, e.target.value as "admin" | "rep" | "caller")}
                      className="px-2 py-1 rounded-md text-xs border border-border bg-background focus:outline-none focus:border-primary"
                    >
                      <option value="rep">rep</option>
                      <option value="admin">admin</option>
                      <option value="caller">clinic setter</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing(r)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => void onDelete(r)}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <InviteRepDialog
          onClose={() => setShowInvite(false)}
          onDone={() => { setShowInvite(false); void load(); }}
        />
      )}
      {editing && (
        <EditRepDialog
          rep={editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); void load(); }}
        />
      )}
    </section>
  );
}

function InviteRepDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"rep" | "admin" | "caller">("rep");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("All fields required");
      return;
    }
    setLoading(true);
    try {
      const r = await inviteRep({ data: { firstName, lastName, email, role: inviteRole } });
      if (r.success) {
        toast.success(`Invite sent to ${email}`);
        onDone();
      } else {
        toast.error(r.error || "Failed to send invite");
      }
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h3 className="text-base font-bold">Invite a new rep</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          We'll send them an email invite. They click the link, set their own password,
          and they're added to the team automatically.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
            <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
          </div>
          <Field label="Email" value={email} onChange={setEmail} placeholder="rep@company.com" type="email" />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-bold transition-opacity disabled:opacity-60"
            style={{ background: "#f4522d", color: "#fff" }}
          >
            {loading ? "Sending…" : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRepDialog({ rep, onClose, onDone }: { rep: Rep; onClose: () => void; onDone: () => void }) {
  const [firstName, setFirstName] = useState(rep.first_name ?? "");
  const [lastName, setLastName] = useState(rep.last_name ?? "");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Both names required");
      return;
    }
    setLoading(true);
    const r = await updateRep({ data: { id: rep.id, firstName, lastName } });
    setLoading(false);
    if (r.success) { toast.success("Rep updated"); onDone(); }
    else toast.error(r.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold">Edit rep</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
            <div className="px-3 py-2 rounded-md bg-muted/40 text-sm text-muted-foreground">{rep.email || "—"}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => void submit()}
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-bold transition-opacity disabled:opacity-60"
            style={{ background: "#f4522d", color: "#fff" }}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, onBlur, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}

type ClinicPrice = {
  id: string;
  clinic_name: string;
  price_per_booking: number | null;
};

function BookingPricesSection() {
  const [clinics, setClinics] = useState<ClinicPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_clinics")
      .select("id, clinic_name, price_per_booking")
      .order("clinic_name");
    setClinics((data ?? []) as ClinicPrice[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const saveClinic = async (id: string) => {
    const raw = edits[id];
    const n = Number(raw);
    if (!n || n <= 0) { toast.error("Enter a valid price"); return; }
    setSavingId(id);
    const { error } = await supabase
      .from("partner_clinics")
      .update({ price_per_booking: n })
      .eq("id", id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setClinics((cs) => cs.map((c) => c.id === id ? { ...c, price_per_booking: n } : c));
    setEdits((e) => { const next = { ...e }; delete next[id]; return next; });
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8 mt-8">
      <div className="flex items-center gap-3 mb-5">
        <DollarSign className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Booking Prices</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Revenue per booking, per clinic. New partner clinics appear here automatically.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : clinics.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No partner clinics yet. Add one in Partner Clinics to set its price.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Clinic</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground w-48">Price per booking</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => {
                const editing = edits[c.id] !== undefined;
                const value = editing ? edits[c.id] : String(c.price_per_booking ?? "");
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium text-foreground">{c.clinic_name}</td>
                    <td className="px-4 py-2">
                      <div className="relative max-w-[10rem]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          className="w-full pl-7 pr-2 py-1.5 rounded-md text-sm bg-background border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editing && (
                        <button
                          onClick={() => void saveClinic(c.id)}
                          disabled={savingId === c.id}
                          className="px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                          style={{ background: "#f4522d", color: "#fff" }}
                        >
                          {savingId === c.id ? "Saving…" : "Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BackfillSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    let totalProcessed = 0;
    let totalFailed = 0;
    let totalCandidates = 0;
    let lastError = "";
    try {
      for (let chunk = 0; chunk < 80; chunk++) {
        setResult(`Working… processed ${totalProcessed}, failed ${totalFailed} so far.`);
        const { data, error } = await supabase.functions.invoke("backfill-patient-analysis", {
          body: { max: 3, force: true },
        });
        if (error) throw error;
        const r = data as {
          processed?: number;
          failed?: number;
          total_remaining_before?: number;
          total_remaining_after?: number;
          done?: boolean;
          errors?: Array<{ id: string; error: string }>;
        };
        if (chunk === 0) totalCandidates = r.total_remaining_before ?? 0;
        totalProcessed += r.processed ?? 0;
        totalFailed += r.failed ?? 0;
        if (r.errors?.[0]?.error) lastError = r.errors[0].error;
        console.log("[backfill] chunk result", r);
        if (r.done || (r.processed ?? 0) + (r.failed ?? 0) === 0) break;
        await sleep(12000);
      }
      const skipped = Math.max(0, totalCandidates - totalProcessed - totalFailed);
      const tail = lastError ? ` Last error: ${lastError}` : "";
      setResult(
        `Done. Candidates: ${totalCandidates}. Processed: ${totalProcessed}. Failed: ${totalFailed}. Skipped: ${skipped}.${tail}`,
      );
      toast.success("Backfill complete");
    } catch (e) {
      const msg = (e as Error).message;
      setResult(`Failed after processing ${totalProcessed}: ${msg}`);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8 mt-8">
      <div className="flex items-center gap-3 mb-3">
        <FileText className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Patient Call Analysis Backfill</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Re-runs the two-pass Claude analysis on every existing patient call transcript.
          </p>
        </div>
      </div>
      <button
        onClick={() => void run()}
        disabled={running}
        className="px-4 py-2 rounded-md text-sm font-bold disabled:opacity-50"
        style={{ background: "#f4522d", color: "#fff" }}
      >
        {running ? "Running…" : "Backfill patient call analysis"}
      </button>
      {result && (
        <div className="mt-3 text-sm text-muted-foreground">{result}</div>
      )}
    </section>
  );
}

type PhoneNumberRow = {
  id: string;
  number: string;
  friendly_name: string | null;
  status: string;
  last_used_at: string | null;
  call_count: number;
  twilio_sid: string | null;
  created_at: string;
};

function PhoneNumbersSection() {
  const provisionNumberFn = useServerFn(provisionNumber);
  const listPhoneNumbersFn = useServerFn(listPhoneNumbers);
  const retireNumberFn = useServerFn(retireNumber);
  const [numbers, setNumbers] = useState<PhoneNumberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);
  const [retiring, setRetiring] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await listPhoneNumbersFn();
    if (r.success) setNumbers(r.numbers as PhoneNumberRow[]);
    else toast.error(r.error || "Failed to load numbers");
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const onAdd = async () => {
    setAdding(true);
    setAddResult(null);
    try {
      const r = await provisionNumberFn();
      if (r.success) {
        setAddResult(`Added ${r.number}`);
        toast.success("Number added successfully");
        await load();
      } else {
        setAddResult(r.error || "Failed to add number");
        toast.error(r.error || "Failed to add number");
      }
    } catch (e) {
      const message = (e as Error)?.message || "Failed to add number";
      setAddResult(message);
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  const onRetire = async (id: string) => {
    if (!confirm("Retire this number?\n\nIt stays in your Twilio account (still billed) but stops being used for outbound calls.")) return;
    setRetiring(id);
    const r = await retireNumberFn({ data: { id, release: false } });
    setRetiring(null);
    if (r.success) { toast.success("Number retired"); await load(); }
    else toast.error(r.error || "Failed to retire");
  };

  const onRelease = async (id: string, number: string) => {
    if (!confirm(`Release ${number} from Twilio?\n\nThis PERMANENTLY deletes the number from your Twilio account and stops billing. You cannot get this exact number back.`)) return;
    if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
    setRetiring(id);
    const r = await retireNumberFn({ data: { id, release: true } });
    setRetiring(null);
    if (r.success) { toast.success("Number released from Twilio"); await load(); }
    else toast.error(r.error || "Failed to release");
  };

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString() : "Never";

  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Phone Numbers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Twilio number pool for outbound call rotation.
            </p>
          </div>
        </div>
        <button
          onClick={() => void onAdd()}
          disabled={adding}
          className="px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: "#f4522d", color: "#fff" }}
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {adding ? "Adding…" : "Add Number"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Calls rotate across active numbers automatically. Add more numbers to reduce spam flagging.
      </p>
      {addResult && (
        <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {addResult}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : numbers.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No numbers yet. Click <strong>Add Number</strong> to provision your first Twilio number.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-2.5 font-semibold">Number</th>
                <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Last Used</th>
                <th className="text-left px-4 py-2.5 font-semibold">Calls</th>
                <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((n) => (
                <tr key={n.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium font-mono">{n.number}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide " +
                        (n.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(n.last_used_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.call_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {n.status === "active" && (
                        <button
                          onClick={() => void onRetire(n.id)}
                          disabled={retiring === n.id}
                          className="px-3 py-1 rounded-md text-xs font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-60"
                        >
                          {retiring === n.id ? "Working…" : "Retire"}
                        </button>
                      )}
                      <button
                        onClick={() => void onRelease(n.id, n.number)}
                        disabled={retiring === n.id}
                        className="px-3 py-1 rounded-md text-xs font-semibold border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
                      >
                        Release
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
