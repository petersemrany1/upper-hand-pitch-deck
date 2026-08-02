import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO } from "@/lib/timezone";

const NAVY = "#1a3a6b";
const GREY_TEXT = "#6b7785";
const GREY_TEXT_DARK = "#4b5563";
const GREY_BORDER = "#d1d5db";

type Pack = {
  id: string;
  clinic_id: string;
  pack_size: number;
  purchased_at: string;
  status: "active" | "completed";
  notes: string | null;
  created_at: string;
};

/**
 * Compact pack-balance card for the clinic sidebar.
 * Data logic is the same as the original portal card: shows counted from
 * clinic_appointments (excluding disqualified / no-shows / test rows),
 * capacity from clinic_packs.
 */
export function ClinicPackBalance({ clinicId, isAdmin }: { clinicId: string; isAdmin: boolean }) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [showedUp, setShowedUp] = useState(0);
  const [bookedSlots, setBookedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const todayStr = sydneyTodayISO();
    const [{ data: packRows }, { data: apptRows }] = await Promise.all([
      supabase
        .from("clinic_packs")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("purchased_at", { ascending: true }),
      supabase
        .from("clinic_appointments")
        .select("appointment_date, outcome, disqualified_at")
        .eq("clinic_id", clinicId)
        .not("patient_name", "ilike", "%test%"),
    ]);
    setPacks((packRows ?? []) as Pack[]);
    const appts = apptRows ?? [];
    let showed = 0;
    let booked = 0;
    for (const a of appts) {
      const o = (a as { outcome: string | null }).outcome;
      const d = (a as { disqualified_at: string | null }).disqualified_at;
      const date = (a as { appointment_date: string }).appointment_date;
      if (d || o === "disqualified" || o === "noshow") continue;
      booked += 1;
      if (o === "show" || o === "proceeded") showed += 1;
      else if (!o && date >= todayStr) { /* upcoming — counts toward booked only */ }
    }
    setShowedUp(showed);
    setBookedSlots(booked);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { void load(); }, [load]);

  const { totalCapacity, totalRemaining } = useMemo(() => {
    const cap = packs.reduce((s, p) => s + p.pack_size, 0);
    return { totalCapacity: cap, totalRemaining: Math.max(0, cap - bookedSlots) };
  }, [packs, bookedSlots]);

  const showsLeft = Math.max(0, totalCapacity - showedUp);
  const pct = totalCapacity > 0 ? Math.min(100, (showedUp / totalCapacity) * 100) : 0;
  const noPacks = packs.length === 0;

  return (
    <div style={{
      background: "rgba(255,255,255,0.10)",
      borderRadius: 12,
      padding: 12,
      margin: "0 12px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#B5D4F4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        Pack balance
      </div>

      {loading ? (
        <div style={{ height: 30, background: "rgba(255,255,255,0.12)", borderRadius: 6 }} />
      ) : noPacks ? (
        <div style={{ fontSize: 12, color: "#B5D4F4", lineHeight: 1.45 }}>
          No pack loaded yet.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
            {showsLeft} of {totalCapacity} shows left
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#7fd6a5", transition: "width .4s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "#B5D4F4", marginTop: 6 }}>
            {totalRemaining} slot{totalRemaining !== 1 ? "s" : ""} open
          </div>
        </>
      )}

      {isAdmin && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: 10, width: "100%",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)",
            padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Plus size={13} /> Add pack
        </button>
      )}

      {showAdd && isAdmin && (
        <AddPackModal
          clinicId={clinicId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); void load(); }}
        />
      )}
    </div>
  );
}

function AddPackModal({ clinicId, onClose, onSaved }: {
  clinicId: string; onClose: () => void; onSaved: () => void;
}) {
  const [sizeStr, setSizeStr] = useState<string>("10");
  const [purchasedAt, setPurchasedAt] = useState<string>(sydneyTodayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const size = parseInt(sizeStr, 10);

  const save = async () => {
    if (!Number.isFinite(size) || size <= 0) { toast.error("Pack size must be greater than 0"); return; }
    setSaving(true);
    const { error } = await supabase.from("clinic_packs").insert({
      clinic_id: clinicId,
      pack_size: size,
      purchased_at: purchasedAt,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${size}-patient pack`);
    onSaved();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div onMouseDown={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 24, width: "90%", maxWidth: 420,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>Add patient pack</h3>
        <p style={{ fontSize: 13, color: GREY_TEXT, margin: "0 0 20px" }}>
          A credit is consumed each time a patient shows up.
        </p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: 8 }}>
          Pack size (number of patients)
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {[10, 20, 30, 50].map((n) => (
            <button
              key={n}
              onClick={() => setSizeStr(String(n))}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                background: size === n ? NAVY : "#fff",
                color: size === n ? "#fff" : NAVY,
                border: `1px solid ${NAVY}`, fontFamily: "inherit",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          value={sizeStr}
          onChange={(e) => setSizeStr(e.target.value.replace(/[^0-9]/g, ""))}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: 16, fontFamily: "inherit" }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: 8 }}>
          Date of purchase
        </label>
        <input
          type="date"
          value={purchasedAt}
          onChange={(e) => setPurchasedAt(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: 16, fontFamily: "inherit" }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: 8 }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Invoice #123, $X per patient"
          rows={2}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: 20, fontFamily: "inherit", resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: "10px 16px", borderRadius: 8, border: `1px solid ${GREY_BORDER}`,
            background: "#fff", color: GREY_TEXT_DARK, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding: "10px 16px", borderRadius: 8, border: "none",
            background: NAVY, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1, fontFamily: "inherit",
          }}>{saving ? "Saving…" : "Add pack"}</button>
        </div>
      </div>
    </div>
  );
}
