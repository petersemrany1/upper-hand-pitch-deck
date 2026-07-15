import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO } from "@/lib/timezone";

const NAVY = "#1a3a6b";
const GREEN = "#1a7a4a";
const AMBER = "#d97706";

const RED = "#b83232";
const GREY_TEXT = "#6b7785";
const GREY_TEXT_DARK = "#4b5563";
const GREY_BORDER = "#d1d5db";
const GREY_BG = "#f7f9fc";
const GREY_TRACK = "#eef1f5";

const RADIUS_CARD = 14;
const RADIUS_BTN = 8;
const RADIUS_BAR = 999;

const SPACE_4 = 4;
const SPACE_6 = 6;
const SPACE_8 = 8;
const SPACE_12 = 12;
const SPACE_16 = 16;
const SPACE_20 = 20;
const SPACE_24 = 24;

type Pack = {
  id: string;
  clinic_id: string;
  pack_size: number;
  purchased_at: string;
  status: "active" | "completed";
  notes: string | null;
  created_at: string;
};

type Props = {
  clinicId: string;
  isAdmin: boolean;
};

export function ClinicPackBalanceCard({ clinicId, isAdmin }: Props) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [showedUp, setShowedUp] = useState(0);
  const [upcoming, setUpcoming] = useState(0);
  const [bookedSlots, setBookedSlots] = useState(0);

  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    let up = 0;
    let booked = 0;
    for (const a of appts) {
      const o = (a as { outcome: string | null }).outcome;
      const d = (a as { disqualified_at: string | null }).disqualified_at;
      const date = (a as { appointment_date: string }).appointment_date;
      if (d || o === "disqualified" || o === "noshow") continue;
      booked += 1;
      if (o === "show" || o === "proceeded") {
        showed += 1;
      } else if (!o && date >= todayStr) {
        up += 1;
      }
    }
    setShowedUp(showed);
    setUpcoming(up);
    setBookedSlots(booked);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { void load(); }, [load]);

  // FIFO allocation: fill oldest packs first
  const { activePack, deliveredInActive, sizeOfActive, totalRemaining, totalCapacity } = useMemo(() => {
    const sorted = [...packs].sort((a, b) => a.purchased_at.localeCompare(b.purchased_at));
    let remaining = showedUp;
    let active: Pack | null = null;
    let deliveredIn = 0;
    for (const p of sorted) {
      if (remaining >= p.pack_size) {
        remaining -= p.pack_size;
        continue;
      }
      active = p;
      deliveredIn = remaining;
      remaining = 0;
      break;
    }
    // If all packs are filled, mark the last one as active (fully consumed)
    if (!active && sorted.length > 0) {
      active = sorted[sorted.length - 1];
      deliveredIn = active.pack_size;
    }
    const totalCap = sorted.reduce((s, p) => s + p.pack_size, 0);
    const totalRem = Math.max(0, totalCap - bookedSlots);
    return {
      activePack: active,
      deliveredInActive: deliveredIn,
      sizeOfActive: active?.pack_size ?? 0,
      totalRemaining: totalRem,
      totalCapacity: totalCap,
    };
  }, [packs, showedUp, bookedSlots]);

  // Progress bar is based on TOTAL capacity across all packs so it doesn't
  // read as "100% full" while another pack still has open slots.
  const deliveredPct = totalCapacity > 0 ? Math.min(100, (showedUp / totalCapacity) * 100) : 0;
  const upcomingPct = totalCapacity > 0 ? Math.min(100 - deliveredPct, (upcoming / totalCapacity) * 100) : 0;
  const remainingInActive = Math.max(0, sizeOfActive - deliveredInActive - Math.min(upcoming, sizeOfActive - deliveredInActive));

  const noPacks = packs.length === 0;
  const exhausted = !noPacks && totalRemaining === 0;
  const packFull = !noPacks && remainingInActive === 0;

  return (
    <div style={{
      background: "#fff",
      borderRadius: RADIUS_CARD,
      border: `1px solid ${GREY_BORDER}`,
      padding: SPACE_24,
      margin: "16px 24px 0",
      boxShadow: "0 4px 16px rgba(26,58,107,0.07)",
    }}>
      {/* Row: title info on left, admin buttons on right */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: SPACE_16, gap: SPACE_12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: SPACE_4 }}>
            Pack Balance
          </div>
          {!noPacks && (
            <div style={{ fontSize: 13, color: GREY_TEXT }}>
              <strong style={{ color: NAVY }}>{deliveredInActive} / {sizeOfActive}</strong> delivered in current pack
            </div>
          )}
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: SPACE_8, flexShrink: 0 }}>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: SPACE_6,
                background: NAVY, color: "#fff", border: "none",
                padding: "10px 16px", borderRadius: RADIUS_BTN, fontSize: 13, fontWeight: 600, cursor: "pointer",
                lineHeight: 1,
              }}
            >
              <Plus size={14} /> Add pack
            </button>
            {packs.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: SPACE_6,
                  background: "#fff", color: NAVY, border: `1px solid ${NAVY}`,
                  padding: "10px 16px", borderRadius: RADIUS_BTN, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                History {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ height: 42, background: GREY_BG, borderRadius: 6 }} />
      ) : noPacks ? (
        <div style={{
          padding: "16px 14px", background: "#fef9e7", borderRadius: 8,
          border: "1px solid #f4d97a", fontSize: 13, color: "#7a5a00",
        }}>
          No pack has been loaded for this clinic yet. {isAdmin ? "Click 'Add pack' to load one." : "Please contact your account manager."}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", marginBottom: SPACE_12 }}>
            <div style={{ fontSize: 12, color: GREY_TEXT }}>
              {totalRemaining} slot{totalRemaining !== 1 ? "s" : ""} open{packFull && totalRemaining > 0 ? " in next pack" : ""}
            </div>
          </div>

          {/* Two-tone progress bar */}
          <div style={{ height: 16, background: GREY_TRACK, borderRadius: RADIUS_BAR, overflow: "hidden", display: "flex" }}>
            <div style={{
              width: `${deliveredPct}%`, height: "100%",
              background: GREEN,
              transition: "width 0.4s ease",
            }} />
            <div style={{
              width: `${upcomingPct}%`, height: "100%",
              background: AMBER,
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Legend — totals across all packs */}
          <div style={{ display: "flex", gap: 16, marginTop: SPACE_12, flexWrap: "wrap" }}>
            <LegendItem color={GREEN} label={`${showedUp} delivered`} />
            <LegendItem color={AMBER} label={`${upcoming} upcoming booked`} />
            <LegendItem color={GREY_TRACK} label={`${totalRemaining} open`} />
          </div>

          {exhausted && (
            <div style={{
              marginTop: SPACE_16, padding: "12px 14px",
              background: "#fdf0f0", border: "1px solid #f0b8b8",
              borderRadius: 8, fontSize: 13, color: RED,
            }}>
              This pack is complete. {isAdmin ? "Load a new pack to keep sending patients." : "Please contact your account manager to reload."}
            </div>
          )}

          {packFull && !exhausted && totalRemaining === 0 && (
            <div style={{
              marginTop: SPACE_16, padding: "12px 14px",
              background: "#fef9e7", border: "1px solid #f4d97a",
              borderRadius: 8, fontSize: 13, color: "#7a5a00",
            }}>
              This pack is fully booked. {isAdmin ? "Add another pack so new bookings don't stack up." : "Please contact your account manager to add capacity."}
            </div>
          )}

          {showHistory && isAdmin && (
            <PackHistoryList packs={packs} showedUp={showedUp} onChange={load} />
          )}
        </>
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

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE_6 }}>
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: GREY_TEXT, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function PackHistoryList({ packs, showedUp, onChange }: {
  packs: Pack[]; showedUp: number; onChange: () => void;
}) {
  // Allocate delivered per pack (FIFO)
  const sorted = [...packs].sort((a, b) => a.purchased_at.localeCompare(b.purchased_at));
  let remaining = showedUp;
  const rows = sorted.map((p) => {
    const delivered = Math.min(p.pack_size, remaining);
    remaining -= delivered;
    return { p, delivered };
  });

  const del = async (id: string) => {
    if (!confirm("Delete this pack? This affects the balance calculation.")) return;
    const { error } = await supabase.from("clinic_packs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pack deleted");
    onChange();
  };

  return (
    <div style={{ marginTop: SPACE_24, borderTop: `1px solid ${GREY_TRACK}`, paddingTop: SPACE_16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: GREY_TEXT, marginBottom: SPACE_12, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Pack history
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE_8 }}>
        {rows.map(({ p, delivered }) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", background: GREY_BG, borderRadius: 8, fontSize: 13,
          }}>
            <div>
              <strong style={{ color: NAVY }}>{delivered} / {p.pack_size}</strong> delivered
              <span style={{ color: GREY_TEXT, marginLeft: 10 }}>
                purchased {new Date(p.purchased_at).toLocaleDateString()}
              </span>
              {p.notes && <span style={{ color: GREY_TEXT, marginLeft: 10, fontStyle: "italic" }}>· {p.notes}</span>}
            </div>
            <button
              onClick={() => del(p.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: RED, padding: SPACE_4 }}
              title="Delete pack"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
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
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div onMouseDown={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: RADIUS_CARD, padding: SPACE_24, width: "90%", maxWidth: 420,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>Add patient pack</h3>
        <p style={{ fontSize: 13, color: GREY_TEXT, margin: "0 0 20px" }}>
          The clinic will see this balance in their portal. A credit is consumed each time a patient shows up.
        </p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: SPACE_8 }}>
          Pack size (number of patients)
        </label>
        <div style={{ display: "flex", gap: SPACE_8, marginBottom: SPACE_12, flexWrap: "wrap" }}>
          {[10, 20, 30, 50].map((n) => (
            <button
              key={n}
              onClick={() => setSizeStr(String(n))}
              style={{
                padding: "8px 16px", borderRadius: RADIUS_BTN, fontSize: 14, fontWeight: 600, cursor: "pointer",
                background: size === n ? NAVY : "#fff",
                color: size === n ? "#fff" : NAVY,
                border: `1px solid ${NAVY}`,
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
          style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS_BTN, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: SPACE_16 }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: SPACE_8 }}>
          Date of purchase
        </label>
        <input
          type="date"
          value={purchasedAt}
          onChange={(e) => setPurchasedAt(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS_BTN, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: SPACE_16 }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: SPACE_8 }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Invoice #123, $X per patient"
          rows={2}
          style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS_BTN, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: SPACE_20, fontFamily: "inherit", resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: SPACE_8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: "10px 16px", borderRadius: RADIUS_BTN, border: `1px solid ${GREY_BORDER}`,
            background: "#fff", color: GREY_TEXT_DARK, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding: "10px 16px", borderRadius: RADIUS_BTN, border: "none",
            background: NAVY, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving…" : "Add pack"}</button>
        </div>
      </div>
    </div>
  );
}
