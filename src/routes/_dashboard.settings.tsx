import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Info, Users, Plus, X, Pencil, Trash2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { inviteRep, listReps, updateRep, deleteRep } from "@/utils/sales-call.functions";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings" }],
  }),
});

const STORAGE_KEY = "pitch-deck-settings";

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

type Rep = {
  id: string;
  name: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] px-6 py-10 md:px-10 md:py-12">
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
              Manage your team and portal configuration.
            </p>
          </div>
        </div>

        <TeamSection />

        <section className="bg-card border border-border rounded-2xl p-6 md:p-8 mt-8">
          <h2 className="text-lg font-bold text-foreground mb-3">Payment Links</h2>
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 text-sm text-foreground">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <div>
              <p className="font-medium mb-1">Stripe links are now fully dynamic.</p>
              <p className="text-muted-foreground leading-relaxed">
                When you press <strong>Send Payment Link</strong>, a fresh Stripe Checkout
                Session is created for the exact amount of the selected pack — including
                custom prices.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TeamSection() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<Rep | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await listReps();
    if (r.success) setReps(r.reps as Rep[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const onDelete = async (rep: Rep) => {
    if (!confirm(`Remove ${rep.name}? This won't delete their auth account.`)) return;
    const r = await deleteRep({ data: { id: rep.id } });
    if (r.success) { toast.success("Rep removed"); void load(); }
    else toast.error(r.error);
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
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("All fields required");
      return;
    }
    setLoading(true);
    const r = await inviteRep({ data: { firstName, lastName, email } });
    setLoading(false);
    if (r.success) {
      toast.success(`Invite sent to ${email}`);
      onDone();
    } else {
      toast.error(r.error);
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
            <Field label="First name" value={firstName} onChange={setFirstName} placeholder="Peter" />
            <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Semrany" />
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
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md text-sm bg-background border border-border focus:outline-none focus:border-primary transition-colors"
      />
    </div>
  );
}
