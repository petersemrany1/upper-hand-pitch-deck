import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Phone, Plus, Loader2 } from "lucide-react";
import { provisionNumber, listPhoneNumbers, retireNumber } from "@/utils/phone-pool.functions";

type PhoneNumberRow = {
  id: string;
  number: string;
  friendly_name: string | null;
  status: string;
  last_used_at: string | null;
  call_count: number;
  twilio_sid: string | null;
  created_at: string;
  mms_enabled: boolean;
  retired_at: string | null; release_due_at: string | null; released_at: string | null; release_error: string | null;
};
type ReplacementStatus = {
  release_enabled: boolean; retention_days: number;
  enabled: boolean; target_active: number; active_numbers: number;
  max_additional_numbers: number; used_numbers: number;
  max_monthly_cents: number; committed_cents: number; currency: string;
  checked_at: string | null; last_result: string | null; last_error: string | null;
};

// Keep the committed RPC contract typed while the managed migration is pending.
type ReplacementDatabase = Database & {
  public: {
    Functions: {
      voice_pool_status: { Args: Record<string, never>; Returns: ReplacementStatus };
    };
  };
};
const replacementClient = supabase as unknown as SupabaseClient<ReplacementDatabase>;

export function PhoneNumbersSection() {
  const provisionNumberFn = useServerFn(provisionNumber);
  const listPhoneNumbersFn = useServerFn(listPhoneNumbers);
  const retireNumberFn = useServerFn(retireNumber);
  const [numbers, setNumbers] = useState<PhoneNumberRow[]>([]);
  const [health, setHealth] = useState<(Database["public"]["Tables"]["voice_number_health"]["Row"] & { connected_10s_7d?: number })[]>([]);
  const [healthError, setHealthError] = useState(false);
  const [replacement, setReplacement] = useState<ReplacementStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);
  const [retiring, setRetiring] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await listPhoneNumbersFn();
    if (r.success) setNumbers(r.numbers as unknown as PhoneNumberRow[]);
    else toast.error(r.error || "Failed to load numbers");
    setLoading(false);
  };
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [result, pool, lifecycle] = await Promise.all([
          supabase.from("voice_number_health").select("*").order("number"),
          listPhoneNumbersFn(),
          replacementClient.rpc("voice_pool_status"),
        ]);
        if (active) {
          setHealth(result.data || []); setHealthError(Boolean(result.error));
          if (pool.success) setNumbers(pool.numbers as unknown as PhoneNumberRow[]);
          setReplacement(lifecycle.error ? null : lifecycle.data as unknown as ReplacementStatus);
        }
      } catch { if (active) setHealthError(true); }
      finally { if (active) setLoading(false); }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, []);

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
    if (!confirm("Retire this number?\n\nIt stops outbound calls immediately, stays available for callbacks for 60 days (still billed), then is automatically released from Twilio.")) return;
    setRetiring(id);
    const r = await retireNumberFn({ data: { id, release: false } });
    setRetiring(null);
    if (r.success) { toast.success("Number retired"); await load(); }
    else toast.error(r.error || "Failed to retire");
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
              Business numbers for calls and callbacks.
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
        Calls use the active number pool automatically. Retired numbers retain callbacks and incoming texts for 60 days, then are released. A familiar caller ID is preserved until it retires or reaches its daily limit.
      </p>
      <div className="mb-5 rounded-lg border border-border p-4 text-xs">
        <h3 className="font-semibold text-sm mb-2">Automatic number rotation</h3>
        <p className="text-muted-foreground mb-3">Checks run hourly, even with the portal closed. Each number allows up to 80 outbound attempts per rolling 24 hours, then traffic moves to another eligible number. Clear, recent caller-ID spam reports trigger automatic outbound retirement. Numbers below 25% pickup over the past 7 days, with at least 30 calls, retire one at a time when the approved allowance can fund a replacement.</p>
        <div className="mb-3 rounded-md bg-muted/40 p-3">
          <h4 className="font-semibold">Automatic replacements</h4>
          {replacement ? <>
            <p>{replacement.enabled ? `Enabled · maintains ${replacement.target_active} active numbers` : "Disabled"} · {replacement.active_numbers} active now</p>
            <p>{replacement.used_numbers} of {replacement.max_additional_numbers} approved replacements committed · US${(replacement.committed_cents / 100).toFixed(2)} of US${(replacement.max_monthly_cents / 100).toFixed(2)}/month rental allowance</p>
            {replacement.used_numbers >= replacement.max_additional_numbers && <p className="text-amber-700">Approved replacement allowance used. Further performance retirements pause; scheduled 60-day releases continue.</p>}
            {replacement.checked_at && <p className="text-muted-foreground">Checked {fmtDate(replacement.checked_at)}</p>}
            {replacement.last_error && <p className="text-amber-700">Replacement needs attention: {replacement.last_error}</p>}
          </> : <p className="text-muted-foreground">Replacement status is currently unavailable.</p>}
        </div>
        <div className="mb-3 rounded-md bg-muted/40 p-3">
          <h4 className="font-semibold">60-day retirement rule</h4>
          <p>{replacement?.release_enabled ? "Enabled" : "Awaiting activation"} · retired numbers keep callbacks for 60 days, then the hourly check releases them from Twilio.</p>
          <p className="text-muted-foreground">Rental continues during those 60 days. After release, calls and texts to that number stop. Saved history remains.</p>
        </div>
        {healthError || health.length === 0 ? (
          <p className="text-amber-700">Health checks are unavailable or have not run yet.</p>
        ) : (
          <div className="space-y-2">
            {health.filter(h => numbers.some(n => n.number === h.number && n.status === "active")).map(h => (
              <div key={h.number} className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2">
                <span className="font-mono font-semibold">{h.number}</span>
                <span>{h.attempts_7d} attempts · {h.attempts_7d ? Math.round((h.connected_10s_7d ?? 0) / h.attempts_7d * 100) : 0}% pickup (10s+) · past 7 days</span>
                <span className={h.alert ? "text-amber-700" : "text-muted-foreground"}>{h.alert || "No new performance alert"}</span>
                {h.transcript_signals > 0 && <span className="text-amber-700">{h.transcript_signals} transcript signal(s) to review</span>}
                <span className={Date.now() - new Date(h.checked_at).getTime() > 2 * 3600_000 ? "text-red-700" : "text-muted-foreground"}>Checked {fmtDate(h.checked_at)}{Date.now() - new Date(h.checked_at).getTime() > 2 * 3600_000 ? " — overdue" : ""}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-muted-foreground mt-3">Pickup counts calls lasting at least 10 seconds and can include voicemail. Transcript signals may refer to calls or texts; neither measure proves a carrier spam label. Retired numbers remain billed during their 60-day callback period. Replacement purchases stop at the approved allowance, which does not reset monthly. Release runs automatically after the 60-day period. Alerts appear in the error log.</p>
      </div>
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
                <th className="text-left px-4 py-2.5 font-semibold">Last Call</th>
                <th className="text-left px-4 py-2.5 font-semibold">Call Attempts</th>
                <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {numbers.map((n) => (
                <tr key={n.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium font-mono">
                    <div className="flex items-center gap-2">
                      <span>{n.number}</span>
                      <span
                        className={
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide " +
                          (n.mms_enabled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        {n.mms_enabled ? "MMS" : "SMS only"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide " +
                        (n.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {n.released_at ? "released" : n.status}
                    </span>
                    {n.status === "retired" && <p className="mt-1 text-xs text-muted-foreground">{n.released_at ? `Released ${fmtDate(n.released_at)}` : `Release due ${fmtDate(n.release_due_at)}`}</p>}
                    {n.release_error && <p className="mt-1 text-xs text-amber-700">Release needs attention: {n.release_error}</p>}
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
