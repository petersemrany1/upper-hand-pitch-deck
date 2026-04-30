import { useEffect, useState, useCallback } from "react";
import { PhoneIncoming, PhoneCall, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";
import { normalizeAUPhone } from "@/utils/phone";
import { toast } from "sonner";

// Lists recent inbound calls (logged by the voice-inbound function with
// direction='inbound'). Lets Peter call back any number with one click.

type InboundRow = {
  id: string;
  phone: string | null;
  status: string | null;
  duration: number | null;
  called_at: string;
  clinic_id: string | null;
  clinics: { clinic_name: string } | null;
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function isMissed(row: InboundRow): boolean {
  // Missed = no answer or zero duration. Anything in-progress / completed > 0
  // we treat as picked up.
  if (row.duration && row.duration > 0) return false;
  const s = (row.status || "").toLowerCase();
  return s !== "in-progress" && s !== "completed";
}

export function MissedCallsList() {
  const [rows, setRows] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { call, dialerStatus } = useTwilioDevice();

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from("call_records")
      .select("id, phone, status, duration, called_at, clinic_id, clinics(clinic_name)")
      .eq("direction", "inbound")
      .order("called_at", { ascending: false })
      .limit(8);
    if (!error && data) setRows(data as unknown as InboundRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRows();

    // Realtime: any new inbound call_records row should appear instantly.
    const channel = supabase
      .channel("missed-calls")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_records" },
        () => void fetchRows(),
      )
      .subscribe();

    // Also poll every 30s as a safety net.
    const id = window.setInterval(() => void fetchRows(), 30_000);

    return () => {
      window.clearInterval(id);
      void supabase.removeChannel(channel);
    };
  }, [fetchRows]);

  const handleCallback = async (row: InboundRow) => {
    if (!row.phone) {
      toast.error("No caller number recorded");
      return;
    }
    const normalised = normalizeAUPhone(row.phone) || row.phone;
    if (dialerStatus !== "ready") {
      toast.error("Dialler not ready yet");
      return;
    }
    try {
      await call(normalised, row.clinic_id ? { clinicId: row.clinic_id } : undefined);
      toast.success(`Calling ${row.clinics?.clinic_name || normalised}…`);
    } catch (e) {
      console.error("Callback failed", e);
      toast.error("Could not start callback");
    }
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PhoneIncoming className="h-4 w-4" style={{ color: "#f59e0b" }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#111111",
            }}
          >
            MISSED CALLS
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "#111111" }}>
          Inbound to your Twilio number
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#111111" }} />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-6 text-xs" style={{ color: "#111111" }}>
          No inbound calls yet.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => {
            const missed = isMissed(row);
            const label = row.clinics?.clinic_name || row.phone || "Unknown";
            return (
              <li
                key={row.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
                style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    background: missed ? "#3a1f1f" : "#1f3a25",
                    color: missed ? "#f87171" : "#34d399",
                  }}
                  title={missed ? "Missed" : "Answered"}
                >
                  <PhoneIncoming className="h-3 w-3" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-[#111111] truncate leading-tight">
                    {label}
                  </div>
                  <div className="text-[9px] leading-tight" style={{ color: "#6b7280" }}>
                    {relativeTime(row.called_at)}
                    {missed ? " · Missed" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCallback(row)}
                  disabled={!row.phone || dialerStatus !== "ready"}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white transition active:scale-95 disabled:opacity-40 flex-shrink-0"
                  style={{ background: "#f4522d", border: "1px solid #f4522d" }}
                  aria-label={`Call back ${label}`}
                  title={`Call back ${label}`}
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
