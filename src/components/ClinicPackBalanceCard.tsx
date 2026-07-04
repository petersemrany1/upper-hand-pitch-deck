import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const NAVY = "#1a3a6b";

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
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: packRows }, { data: apptRows }] = await Promise.all([
      supabase
        .from("clinic_packs")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("purchased_at", { ascending: true }),
      supabase
        .from("clinic_appointments")
        .select("appointment_date, outcome")
        .eq("clinic_id", clinicId)
        .not("patient_name", "ilike", "%test%"),
    ]);
    setPacks((packRows ?? []) as Pack[]);
    const appts = apptRows ?? [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let showed = 0;
    let up = 0;
    for (const a of appts) {
      const o = (a as { outcome: string | null }).outcome;
      const d = (a as { appointment_date: string }).appointment_date;
      if (o === "show" || o === "proceeded") showed += 1;
      else if (!o && d >= todayStr) up += 1;
    }
    setShowedUp(showed);
    setUpcoming(up);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { void load(); }, [load]);

  // FIFO allocation: fill oldest packs first
  const { activePack, deliveredInActive, sizeOfActive, remainingSlots, totalRemaining, totalCapacity } = useMemo(() => {
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
    const totalRem = Math.max(0, totalCap - showedUp);
    const slotsAvail = Math.max(0, totalRem - upcoming);
    return {
      activePack: active,
      deliveredInActive: deliveredIn,
      sizeOfActive: active?.pack_size ?? 0,
      remainingSlots: slotsAvail,
      totalRemaining: totalRem,
      totalCapacity: totalCap,
    };
  }, [packs, showedUp, upcoming]);

  const pct = sizeOfActive > 0 ? Math.min(100, (deliveredInActive / sizeOfActive) * 100) : 0;
  const remainingInActive = Math.max(0, sizeOfActive - deliveredInActive);
  const barColor = remainingInActive === 0 ? "#b83232"
    : remainingInActive / Math.max(1, sizeOfActive) < 0.1 ? "#b83232"
    : remainingInActive / Math.max(1, sizeOfActive) < 0.3 ? "#d97706"
    : "#1a7a4a";

  const noPacks = packs.length === 0;
  const exhausted = !noPacks && totalRemaining === 0;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: "1px solid #e2e6ec",
      padding: 20,
      margin: "16px 24px 0",
      boxShadow: "0 1px 3px rgba(26,58,107,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: NAVY, color: "#fff", border: "none",
                padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Plus size={14} /> Add pack
            </button>
            {packs.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#fff", color: NAVY, border: `1px solid ${NAVY}`,
                  padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                History {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ height: 42, background: "#f7f9fc", borderRadius: 6 }} />
      ) : noPacks ? (
        <div style={{
          padding: "16px 14px", background: "#fef9e7", borderRadius: 8,
          border: "1px solid #f4d97a", fontSize: 13, color: "#7a5a00",
        }}>
          No pack has been loaded for this clinic yet. {isAdmin ? "Click 'Add pack' to load one." : "Please contact your account manager."}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ fontSize: 13, color: "#4b5563" }}>
              Current pack: <strong style={{ color: NAVY }}>{deliveredInActive} / {sizeOfActive}</strong> delivered
            </div>
            <div style={{ fontSize: 12, color: "#6b7785" }}>
              {remainingInActive} remaining in this pack
            </div>
          </div>
          <div style={{ height: 12, background: "#eef1f5", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: barColor,
              transition: "width 0.4s ease",
            }} />
          </div>

          {exhausted && (
            <div style={{
              marginTop: 14, padding: "10px 12px",
              background: "#fdf0f0", border: "1px solid #f0b8b8",
              borderRadius: 6, fontSize: 12, color: "#b83232",
            }}>
              This pack is complete. {isAdmin ? "Load a new pack to keep sending patients." : "Please contact your account manager to reload."}
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

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b7785", marginTop: 3 }}>{label}</div>
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
    <div style={{ marginTop: 16, borderTop: "1px solid #eef1f5", paddingTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7785", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Pack history
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(({ p, delivered }) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", background: "#f7f9fc", borderRadius: 6, fontSize: 12,
          }}>
            <div>
              <strong style={{ color: NAVY }}>{delivered} / {p.pack_size}</strong> delivered
              <span style={{ color: "#6b7785", marginLeft: 10 }}>
                purchased {new Date(p.purchased_at).toLocaleDateString()}
              </span>
              {p.notes && <span style={{ color: "#6b7785", marginLeft: 10, fontStyle: "italic" }}>· {p.notes}</span>}
            </div>
            <button
              onClick={() => del(p.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#b83232", padding: 4 }}
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
  const [size, setSize] = useState<number>(10);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (size <= 0) { toast.error("Pack size must be greater than 0"); return; }
    setSaving(true);
    const { error } = await supabase.from("clinic_packs").insert({
      clinic_id: clinicId,
      pack_size: size,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${size}-patient pack`);
    onSaved();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 24, width: "90%", maxWidth: 420,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>Add patient pack</h3>
        <p style={{ fontSize: 12, color: "#6b7785", margin: "0 0 16px" }}>
          The clinic will see this balance in their portal. A credit is consumed each time a patient shows up.
        </p>

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 6 }}>
          Pack size (number of patients)
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {[10, 20, 30, 50].map((n) => (
            <button
              key={n}
              onClick={() => setSize(n)}
              style={{
                padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
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
          value={size}
          onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 0))}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d4d4d8", fontSize: 13, marginBottom: 14 }}
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 6 }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Invoice #123, $X per patient"
          rows={2}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d4d4d8", fontSize: 13, marginBottom: 16, fontFamily: "inherit", resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: "8px 14px", borderRadius: 6, border: "1px solid #d4d4d8",
            background: "#fff", color: "#4b5563", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding: "8px 14px", borderRadius: 6, border: "none",
            background: NAVY, color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>{saving ? "Saving…" : "Add pack"}</button>
        </div>
      </div>
    </div>
  );
}
