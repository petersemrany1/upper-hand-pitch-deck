import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
};

export function PhoneNumbersSection() {
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
