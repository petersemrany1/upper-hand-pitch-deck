import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Rep = { id: string; name: string; role: string; is_active: boolean };

type Routing = { enabled: boolean; mode: "single"; rep_id: string | null };

const DEFAULT_ROUTING: Routing = { enabled: false, mode: "single", rep_id: null };

export function LeadRoutingSection() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [routing, setRouting] = useState<Routing>(DEFAULT_ROUTING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unassigned, setUnassigned] = useState(0);
  const [assigning, setAssigning] = useState(false);

  const loadUnassigned = async () => {
    const { count } = await supabase
      .from("meta_leads")
      .select("id", { count: "exact", head: true })
      .is("rep_id", null)
      .neq("lead_class", "booked_active");
    setUnassigned(count ?? 0);
  };

  useEffect(() => {
    void (async () => {
      const [{ data: repRows }, { data: setting }] = await Promise.all([
        supabase.from("sales_reps").select("id, name, role, is_active").order("name"),
        supabase.from("app_settings").select("value").eq("key", "lead_routing").maybeSingle(),
      ]);
      setReps(((repRows ?? []) as Rep[]).filter((r) => r.is_active !== false));
      const raw = (setting?.value ?? null) as Partial<Routing> | null;
      setRouting({
        enabled: Boolean(raw?.enabled),
        mode: "single",
        rep_id: raw?.rep_id ?? null,
      });
      await loadUnassigned();
      setLoading(false);
    })();
  }, []);

  const save = async (next: Routing) => {
    setRouting(next);
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "lead_routing", value: next }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(
      next.enabled && next.rep_id
        ? `New leads will go to ${reps.find((r) => r.id === next.rep_id)?.name ?? "the selected rep"}`
        : "Auto-assign turned off — new leads stay unassigned",
    );
  };

  const assignBacklog = async () => {
    if (!routing.rep_id) { toast.error("Pick who new leads go to first"); return; }
    setAssigning(true);
    const { error } = await supabase
      .from("meta_leads")
      .update({ rep_id: routing.rep_id })
      .is("rep_id", null)
      .neq("lead_class", "booked_active");
    setAssigning(false);
    if (error) { toast.error(error.message); return; }
    await loadUnassigned();
    toast.success("Unassigned leads handed over");
  };

  const ownerName = reps.find((r) => r.id === routing.rep_id)?.name ?? null;

  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8 mt-8">
      <div className="flex items-center gap-3 mb-5">
        <UserCheck className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Lead routing</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically hand every new Meta enquiry to a rep the moment it arrives — day or night.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : (
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={routing.enabled}
              onChange={(e) => void save({ ...routing, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-foreground">Auto-assign new leads</span>
            {routing.enabled && ownerName && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Going to {ownerName}
              </span>
            )}
          </label>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">New leads go to</div>
            <select
              value={routing.rep_id ?? ""}
              onChange={(e) => void save({ ...routing, rep_id: e.target.value || null })}
              className="w-full max-w-xs px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
            >
              <option value="">— nobody (leave unassigned) —</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              Returning enquiries always stay with whoever already owns that patient.
            </p>
          </div>

          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-3">
            <span className="text-sm text-foreground">
              {unassigned} unassigned lead{unassigned === 1 ? "" : "s"} in the queue
            </span>
            <button
              onClick={() => void assignBacklog()}
              disabled={assigning || saving || unassigned === 0}
              className="px-4 py-2 rounded-md text-sm font-bold disabled:opacity-50"
              style={{ background: "#f4522d", color: "#fff" }}
            >
              {assigning ? "Assigning…" : `Assign all to ${ownerName ?? "…"}`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
