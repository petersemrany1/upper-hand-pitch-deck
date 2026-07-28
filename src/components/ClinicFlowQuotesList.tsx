import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO, APP_TIMEZONE } from "@/lib/timezone";
import { FileText } from "lucide-react";

const NAVY = "#1a3a6b";
const GREY = "#6b7785";
const LINE = "#e2e6ec";
const GREEN = "#15803d";
const GREEN_BG = "#dcfce7";
const RED_BG = "#fee2e2";
const RED_FG = "#991b1b";
const AMBER_BG = "#fff7ed";
const AMBER_FG = "#9a3412";

type Row = {
  id: string;
  patient_name: string;
  price: number;
  status: string;
  valid_until: string;
  booked_date: string | null;
  created_at: string;
};

export function ClinicFlowQuotesList({ clinicId }: { clinicId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => sydneyTodayISO(), []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("clinicflow_quotes")
        .select("id, patient_name, price, status, valid_until, booked_date, created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });
      if (!error) setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [clinicId]);

  const openQuote = (id: string) => window.open(`/clinic-quote/${id}`, "_blank");

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Quotes</h1>
      <p style={{ fontSize: 13, color: GREY, marginTop: 6, marginBottom: 20 }}>All quotes issued from ClinicFlow.</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: GREY }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ background: "#fff", border: `1px dashed ${LINE}`, borderRadius: 12, padding: 40, textAlign: "center", color: GREY }}>
          No quotes yet.
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
          {rows.map((r) => {
            const expired = r.status !== "booked" && r.status !== "deposit_recorded" && r.valid_until < today;
            const chip = expired
              ? { text: "Expired", bg: RED_BG, fg: RED_FG }
              : r.status === "deposit_recorded" ? { text: "Deposit ✓", bg: GREEN_BG, fg: GREEN }
              : r.status === "booked" ? { text: "Booked", bg: GREEN_BG, fg: GREEN }
              : { text: "Quoted", bg: AMBER_BG, fg: AMBER_FG };
            return (
              <div key={r.id} onClick={() => openQuote(r.id)}
                style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${LINE}`, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <FileText size={16} color={GREY} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis" }}>{r.patient_name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>${Math.round(r.price).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: expired ? RED_FG : GREY }}>
                  Valid until {new Date(r.valid_until + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: APP_TIMEZONE })}
                </div>
                <span style={{ background: chip.bg, color: chip.fg, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{chip.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
