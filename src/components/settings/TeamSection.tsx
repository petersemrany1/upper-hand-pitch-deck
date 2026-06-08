import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Plus, X, Pencil, Trash2, Mail } from "lucide-react";
import {
  inviteRep,
  listReps,
  updateRep,
  updateRepRole,
  updateRepEmail,
  deleteRep,
  setRepPassword,
  setRepActive,
} from "@/utils/sales-call.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  TAB_GROUPS,
  TAB_LABELS,
  defaultTabsForRole,
  ALL_TAB_KEYS,
  type TabKey,
} from "@/lib/tab-access";

export type Rep = {
  id: string;
  name: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active?: boolean;
  allowed_tabs?: string[] | null;
  created_at: string;
};

function TabAccessPicker({
  value,
  onChange,
}: {
  value: TabKey[];
  onChange: (next: TabKey[]) => void;
}) {
  const toggle = (tab: TabKey) => {
    const set = new Set(value);
    if (set.has(tab)) set.delete(tab); else set.add(tab);
    onChange(ALL_TAB_KEYS.filter((t) => set.has(t)));
  };
  return (
    <div className="space-y-3">
      {TAB_GROUPS.map((group) => (
        <div key={group.title}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{group.title}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {group.tabs.map((tab) => {
              const checked = value.includes(tab);
              return (
                <label
                  key={tab}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer text-sm transition-colors"
                  style={{
                    borderColor: checked ? "#f4522d" : "#e5e5e3",
                    background: checked ? "#fff1ee" : "#fff",
                    color: checked ? "#f4522d" : "#111",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(tab)}
                    className="h-3.5 w-3.5 accent-[#f4522d]"
                  />
                  <span className="text-xs font-medium">{TAB_LABELS[tab]}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
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

export function TeamSection() {
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

  const onToggleActive = async (rep: Rep, nextActive: boolean) => {
    if (!nextActive && !confirm(`Deactivate ${rep.name}? They will be signed out and unable to log in.`)) return;
    const prev = reps;
    setReps((rs) => rs.map((x) => x.id === rep.id ? { ...x, is_active: nextActive } : x));
    const r = await setRepActive({ data: { id: rep.id, active: nextActive } });
    if (!r.success) {
      setReps(prev);
      toast.error(r.error);
    } else {
      toast.success(nextActive ? `${rep.name} reactivated` : `${rep.name} deactivated`);
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
                <th className="text-left px-4 py-2.5 font-semibold">Active</th>
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
                      value={r.role === "admin" ? "admin" : ["caller", "clinic_setter"].includes(r.role) ? "caller" : "rep"}
                      onChange={(e) => void onRoleChange(r, e.target.value as "admin" | "rep" | "caller")}
                      className="px-2 py-1 rounded-md text-xs border border-border bg-background focus:outline-none focus:border-primary"
                    >
                      <option value="rep">rep</option>
                      <option value="admin">admin</option>
                      <option value="caller">clinic setter</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={r.is_active !== false}
                        onChange={(e) => void onToggleActive(r, e.target.checked)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                      <span className={`text-xs font-medium ${r.is_active === false ? "text-destructive" : "text-muted-foreground"}`}>
                        {r.is_active === false ? "Disabled" : "Active"}
                      </span>
                    </label>
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
  const [mode, setMode] = useState<"invite" | "password">("invite");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<TabKey[]>(() => defaultTabsForRole("rep"));
  const [tabsTouched, setTabsTouched] = useState(false);

  const handleRoleChange = (next: "rep" | "admin" | "caller") => {
    setInviteRole(next);
    if (!tabsTouched) setTabs(defaultTabsForRole(next));
  };

  const submit = async () => {
    setFormError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      const message = "All fields required";
      setFormError(message);
      toast.error(message);
      return;
    }
    const trimmedPassword = password.trim();
    if (mode === "password" && trimmedPassword.length < 8) {
      const message = "Password must be at least 8 characters";
      setFormError(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    try {
      const r = await inviteRep({ data: { firstName, lastName, email, role: inviteRole, password: mode === "password" ? trimmedPassword : undefined, allowedTabs: inviteRole === "admin" ? null : tabs } });
      if (r.success) {
        toast.success(mode === "password" ? `${email} created — share their password securely` : `Invite sent to ${email}`);
        onDone();
      } else {
        const message = r.error || "Failed to create user";
        setFormError(message);
        toast.error(message);
      }
    } catch (err) {
      const message = (err as Error)?.message || "Failed to create user";
      setFormError(message);
      toast.error(message);
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
            <h3 className="text-base font-bold">Add a new user</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
            <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
          </div>
          <Field
            label={mode === "password" ? "Username or email" : "Email"}
            value={email}
            onChange={setEmail}
            placeholder={mode === "password" ? "e.g. john or john@company.com" : "user@company.com"}
            type="text"
          />

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Access level</label>
            <div className="grid grid-cols-3 gap-2">
              {(["rep", "admin", "caller"] as const).map((opt) => {
                const active = inviteRole === opt;
                const label = opt === "caller" ? "Clinic Setter" : opt === "admin" ? "Admin" : "Sales Rep";
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleRoleChange(opt)}
                    className="px-3 py-2 rounded-md text-xs font-medium border transition-colors"
                    style={{
                      borderColor: active ? "#f4522d" : "#e5e5e3",
                      background: active ? "#fff1ee" : "#fff",
                      color: active ? "#f4522d" : "#111",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {inviteRole === "caller"
                ? "Locked to the Clinics page + SMS inbox. Cold-calls clinics with your Twilio numbers."
                : inviteRole === "admin"
                ? "Full access to everything including team and pricing settings."
                : "Standard sales rep — Sales Portal, Appointments, Leaderboard."}
            </p>
          </div>

          {inviteRole !== "admin" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tab access</label>
              <TabAccessPicker value={tabs} onChange={(next) => { setTabs(next); setTabsTouched(true); }} />
              <p className="text-[11px] text-muted-foreground mt-2">Tick the sidebar tabs this user should see.</p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">How they'll log in</label>
            <div className="grid grid-cols-2 gap-2">
              {(["invite", "password"] as const).map((opt) => {
                const active = mode === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMode(opt)}
                    className="px-3 py-2 rounded-md text-xs font-medium border transition-colors"
                    style={{
                      borderColor: active ? "#f4522d" : "#e5e5e3",
                      background: active ? "#fff1ee" : "#fff",
                      color: active ? "#f4522d" : "#111",
                    }}
                  >
                    {opt === "invite" ? "Email invite link" : "I'll set a password"}
                  </button>
                );
              })}
            </div>
            {mode === "password" ? (
              <div className="mt-3">
                <Field label="Password (min 8 chars)" value={password} onChange={setPassword} placeholder="Type a password to give them" type="text" />
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Account is created instantly. Share the email + password with them — they can change it later from the login page.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                We'll email them a link to set their own password.
              </p>
            )}
          </div>

          {formError && (
            <div className="rounded-md border px-3 py-2 text-sm font-medium" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }} role="alert">
              {formError}
            </div>
          )}
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
            {loading ? "Saving…" : mode === "password" ? "Create User" : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRepDialog({ rep, onClose, onDone }: { rep: Rep; onClose: () => void; onDone: () => void }) {
  const [firstName, setFirstName] = useState(rep.first_name ?? "");
  const [lastName, setLastName] = useState(rep.last_name ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [email, setEmail] = useState(rep.email ?? "");
  const [emailLoading, setEmailLoading] = useState(false);
  const repRoleKey: "admin" | "rep" | "caller" = rep.role === "admin" ? "admin" : ["caller", "clinic_setter"].includes(rep.role) ? "caller" : "rep";
  const initialTabs: TabKey[] = (rep.allowed_tabs && rep.allowed_tabs.length > 0)
    ? ALL_TAB_KEYS.filter((t) => rep.allowed_tabs!.includes(t))
    : defaultTabsForRole(repRoleKey);
  const [tabs, setTabs] = useState<TabKey[]>(initialTabs);

  const submitEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || trimmed === (rep.email ?? "").toLowerCase()) return;
    setEmailLoading(true);
    const r = await updateRepEmail({ data: { id: rep.id, email: trimmed } });
    setEmailLoading(false);
    if (r.success) { toast.success("Email updated"); onDone(); }
    else toast.error(r.error);
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Both names required");
      return;
    }
    setLoading(true);
    const r = await updateRep({ data: { id: rep.id, firstName, lastName, allowedTabs: repRoleKey === "admin" ? null : tabs } });
    setLoading(false);
    if (r.success) { toast.success("Rep updated"); onDone(); }
    else toast.error(r.error);
  };

  const submitPassword = async () => {
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setPwLoading(true);
    const r = await setRepPassword({ data: { id: rep.id, password } });
    setPwLoading(false);
    if (r.success) { toast.success("Password updated"); setPassword(""); }
    else toast.error(r.error);
  };

  const [resetLoading, setResetLoading] = useState(false);
  const sendResetEmail = async () => {
    const target = (rep.email ?? "").trim();
    if (!target) { toast.error("No email on file"); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) toast.error(error.message);
    else toast.success(`Password reset email sent to ${target}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => void submitEmail()}
                disabled={emailLoading || email.trim().toLowerCase() === (rep.email ?? "").toLowerCase() || !email.trim()}
                className="px-3 py-2 rounded-md text-sm font-bold transition-opacity disabled:opacity-60"
                style={{ background: "#111", color: "#fff" }}
              >
                {emailLoading ? "Saving…" : "Update email"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Changes the login email immediately. The rep must use the new email next time they sign in.</p>
          </div>
          {repRoleKey !== "admin" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tab access</label>
              <TabAccessPicker value={tabs} onChange={setTabs} />
            </div>
          )}
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

        <div className="mt-6 pt-5 border-t border-border">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Set / reset password</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="flex-1 px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={() => void submitPassword()}
              disabled={pwLoading || password.length < 6}
              className="px-3 py-2 rounded-md text-sm font-bold transition-opacity disabled:opacity-60"
              style={{ background: "#111", color: "#fff" }}
            >
              {pwLoading ? "Setting…" : "Set password"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">The rep can sign in immediately with this password.</p>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Send the rep an email link to set their own password.</p>
            <button
              onClick={() => void sendResetEmail()}
              disabled={resetLoading}
              className="px-3 py-1.5 rounded-md text-xs font-bold transition-opacity disabled:opacity-60 whitespace-nowrap"
              style={{ background: "#f4522d", color: "#fff" }}
            >
              {resetLoading ? "Sending…" : "Send invite email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
