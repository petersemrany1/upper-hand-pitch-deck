import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO } from "@/lib/timezone";
import { freeTrialCutoff, isFreeTrialBooking } from "@/lib/clinic-free-trial";
import { allocatePacks, packOrder, packStatus, type PackAllocation } from "@/lib/pack-allocation";

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
  pack_name: string | null;
  amount_paid_ex_gst: number | null;
  date_paid: string | null;
  pack_type: "paid" | "free_trial" | "guarantee_credit" | "goodwill";
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
  const [editingPack, setEditingPack] = useState<Pack | null>(null);

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
        .select("appointment_date, outcome, disqualified_at, booked_at")
        .eq("clinic_id", clinicId)
        .not("patient_name", "ilike", "%test%"),
    ]);
    const allPacks = (packRows ?? []) as Pack[];
    setPacks(allPacks);
    const appts = apptRows ?? [];
    const cutoff = freeTrialCutoff(allPacks, todayStr);

    let showed = 0;
    let up = 0;
    for (const a of appts) {
      const o = (a as { outcome: string | null }).outcome;
      const d = (a as { disqualified_at: string | null }).disqualified_at;
      const date = (a as { appointment_date: string }).appointment_date;
      const bookedAt = (a as { booked_at: string | null }).booked_at;
      if (d || o === "disqualified" || o === "noshow") continue;
      // Free-trial bookings cost nothing and don't touch the paid pack.
      if (isFreeTrialBooking(bookedAt, cutoff)) continue;
      if (o === "show" || o === "proceeded") {
        showed += 1;
      } else if (!o && date < todayStr) {
        // Sent through and the date has passed: it counts as a delivered show
        // even if the clinic never marked an outcome. Only an explicit
        // no-show hands the slot back.
        showed += 1;
      } else if (!o) {
        up += 1;
      }
    }
    setShowedUp(showed);
    setUpcoming(up);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { void load(); }, [load]);

  // Packs fill oldest first; the box shows the one the clinic is working
  // through now. Everything else lives one line down and in History.
  const alloc = useMemo(() => allocatePacks(packs, showedUp, upcoming), [packs, showedUp, upcoming]);
  const status = packStatus(alloc);
  const cur = alloc.current;
  const noPacks = !cur;
  const box = status.key === "complete"
    ? { background: "#fdf0f0", border: "1px solid #f0b8b8", color: RED }
    : status.key === "fullyBooked"
      ? { background: "#fef9e7", border: "1px solid #f4d97a", color: "#7a5a00" }
      : null;
  const nextLine = alloc.next
    ? `Next: ${alloc.next.pack.pack_size}-show pack ready${alloc.next.booked > 0 ? ` (${alloc.next.booked} already booked into it)` : ""}.`
    : status.key === "complete" || status.key === "fullyBooked"
      ? isAdmin ? "Add a pack to keep receiving patients." : "Please contact your account manager to load the next pack."
      : null;

  return (
    <div style={{
      background: "#fff",
      borderRadius: RADIUS_CARD,
      border: `1px solid ${GREY_BORDER}`,
      padding: SPACE_24,
      margin: "16px 24px 0",
      boxShadow: "0 4px 16px rgba(26,58,107,0.07)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: SPACE_16, gap: SPACE_12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREY_TEXT, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: SPACE_6 }}>
            Current pack
          </div>
          {cur ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, color: NAVY, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {cur.delivered} <span style={{ fontSize: 16, fontWeight: 500, color: GREY_TEXT_DARK }}>of {cur.pack.pack_size} delivered</span>
              </div>
              <div style={{ fontSize: 13, color: GREY_TEXT, marginTop: SPACE_6 }}>
                Pack {cur.number} of {alloc.fills.length} · {cur.pack.pack_size} show{cur.pack.pack_size === 1 ? "" : "s"} · {packTypeLabel(cur.pack.pack_type)} · started {packDate(cur.pack)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Pack balance</div>
          )}
        </div>

        <div style={{ display: "flex", gap: SPACE_8, flexShrink: 0 }}>
          {isAdmin && (
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
          )}
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
              All packs {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ height: 42, background: GREY_BG, borderRadius: 6 }} />
      ) : noPacks ? (
        <div style={{
          padding: "16px 14px", background: "#fef9e7", borderRadius: 8,
          border: "1px solid #f4d97a", fontSize: 13, color: "#7a5a00",
        }}>
          No pack has been loaded for this clinic yet. {isAdmin ? "Click 'Add pack' to load one." : "Please contact your account manager."}
          {alloc.overflowBooked > 0 && ` ${alloc.overflowBooked} consult${alloc.overflowBooked === 1 ? " is" : "s are"} already booked.`}
        </div>
      ) : (
        <>
          <Slots size={cur.pack.pack_size} delivered={cur.delivered} booked={cur.booked} />

          <div style={{ display: "flex", gap: 16, marginTop: SPACE_12, flexWrap: "wrap", alignItems: "center" }}>
            <LegendItem color={GREEN} label={`${cur.delivered} delivered`} />
            <LegendItem color={AMBER} label={`${cur.booked} booked`} />
            <LegendItem color={GREY_TRACK} label={`${cur.open} open`} />
            {alloc.overflowBooked > 0 && (
              <span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>
                +{alloc.overflowBooked} booked beyond your packs
              </span>
            )}
            {alloc.overflowBooked === 0 && alloc.next && alloc.next.booked > 0 && (
              <span style={{ fontSize: 12, color: GREY_TEXT_DARK, fontWeight: 500 }}>
                +{alloc.next.booked} booked into the next pack
              </span>
            )}
          </div>

          {box ? (
            <div style={{ marginTop: SPACE_16, padding: "12px 14px", borderRadius: 8, fontSize: 13, ...box }}>
              <strong>{status.line}</strong>{nextLine ? ` ${nextLine}` : ""}
            </div>
          ) : (
            nextLine && <div style={{ marginTop: SPACE_12, fontSize: 13, color: GREY_TEXT_DARK }}>{nextLine}</div>
          )}

          <div style={{ marginTop: SPACE_16, paddingTop: SPACE_12, borderTop: `1px solid ${GREY_TRACK}`, fontSize: 12.5, color: GREY_TEXT, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: GREY_TEXT_DARK }}>All packs:</span>
            <span>{alloc.totals.bought} shows{alloc.totals.free > 0 ? ` (${alloc.totals.free} of them free)` : ""}</span>
            <span>·</span><span>{alloc.totals.delivered} delivered</span>
            <span>·</span><span>{alloc.totals.booked} booked</span>
            <span>·</span><span>{alloc.totals.open} open</span>
            {alloc.totals.trial > 0 && <><span>·</span><span>plus a {alloc.totals.trial}-consult free trial</span></>}
          </div>

          {showHistory && (
            <PackHistoryList packs={packs} alloc={alloc} isAdmin={isAdmin} onChange={load} onEdit={(p) => setEditingPack(p)} />
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

      {editingPack && isAdmin && (
        <AddPackModal
          clinicId={clinicId}
          pack={editingPack}
          onClose={() => setEditingPack(null)}
          onSaved={() => { setEditingPack(null); void load(); }}
        />
      )}
    </div>
  );
}

const packTypeLabel = (t: string) => (t === "paid" ? "Paid" : t === "free_trial" ? "Free trial" : t === "guarantee_credit" ? "Guarantee credit" : t === "goodwill" ? "Goodwill" : t.replace(/_/g, " "));
const packDate = (p: { date_paid: string | null; purchased_at: string }) =>
  new Date(`${p.date_paid ?? p.purchased_at.slice(0, 10)}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

/**
 * One segment per show in the pack: green delivered, amber booked, grey open,
 * with a small gap after every tenth so "27 of 40" can be counted by eye.
 * Past 40 shows a smooth bar with ticks reads better than hairline segments.
 */
function Slots({ size, delivered, booked }: { size: number; delivered: number; booked: number }) {
  if (size > 40) {
    const d = Math.min(100, (delivered / size) * 100), b = Math.min(100 - d, (booked / size) * 100);
    return (
      <div style={{ position: "relative", height: 18, background: GREY_TRACK, borderRadius: 6, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${d}%`, background: GREEN }} />
        <div style={{ width: `${b}%`, background: AMBER }} />
        {Array.from({ length: Math.floor((size - 1) / 10) }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: `${((i + 1) * 10 / size) * 100}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.7)" }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 3 }} aria-label={`${delivered} of ${size} delivered, ${booked} booked`}>
      {Array.from({ length: size }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: 18, borderRadius: 4,
            background: i < delivered ? GREEN : i < delivered + booked ? AMBER : GREY_TRACK,
            marginLeft: i > 0 && i % 10 === 0 ? 8 : 0,
            transition: "background 0.3s ease",
          }}
        />
      ))}
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

const STATE_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  complete: { bg: "#e8f5ef", fg: GREEN, label: "Complete" },
  current: { bg: "#fef3e2", fg: AMBER, label: "Current" },
  queued: { bg: GREY_BG, fg: GREY_TEXT_DARK, label: "Queued" },
  trial: { bg: "#eef2ff", fg: NAVY, label: "Free trial" },
};

function PackHistoryList({ packs, alloc, isAdmin, onChange, onEdit }: {
  packs: Pack[]; alloc: PackAllocation<Pack>; isAdmin: boolean; onChange: () => void; onEdit: (p: Pack) => void;
}) {
  const fillById = new Map(alloc.fills.map((f) => [f.pack.id, f]));
  const rows = [...packs].sort(packOrder);

  const del = async (id: string) => {
    if (!confirm("Delete this pack? This affects the balance calculation.")) return;
    const { error } = await supabase.from("clinic_packs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pack deleted");
    onChange();
  };

  return (
    <div style={{ marginTop: SPACE_16, borderTop: `1px solid ${GREY_TRACK}`, paddingTop: SPACE_16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: GREY_TEXT, marginBottom: SPACE_12, textTransform: "uppercase", letterSpacing: 0.5 }}>
        All packs, oldest first
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE_8 }}>
        {rows.map((p) => {
          const f = fillById.get(p.id) ?? null;
          const pill = STATE_PILL[f ? f.state : "trial"];
          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: SPACE_12,
              padding: "10px 14px", background: GREY_BG, borderRadius: 8, fontSize: 13, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE_12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: pill.bg, color: pill.fg, letterSpacing: 0.3 }}>{pill.label}</span>
                <strong style={{ color: NAVY }}>{f ? `Pack ${f.number}` : "Trial"} · {p.pack_size} show{p.pack_size === 1 ? "" : "s"} · {packTypeLabel(p.pack_type)}</strong>
                <span style={{ color: GREY_TEXT }}>{packDate(p)}</span>
                {f
                  ? <span style={{ color: GREY_TEXT_DARK }}>{f.delivered} delivered · {f.booked} booked · {f.open} open</span>
                  : <span style={{ color: GREY_TEXT_DARK }}>consults given free, outside the balance</span>}
                {p.pack_name && <span style={{ color: GREY_TEXT }}>· {p.pack_name}</span>}
                {isAdmin && (
                  <span style={{ color: p.amount_paid_ex_gst == null && p.pack_type === "paid" ? AMBER : GREY_TEXT }}>
                    · {p.amount_paid_ex_gst == null ? (p.pack_type === "paid" ? "amount missing" : "no charge") : `$${p.amount_paid_ex_gst.toLocaleString()} ex GST`}
                  </span>
                )}
                {isAdmin && p.notes && <span style={{ color: GREY_TEXT, fontStyle: "italic" }}>· {p.notes}</span>}
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: SPACE_4 }}>
                  <button onClick={() => onEdit(p)} style={{ background: "transparent", border: "none", cursor: "pointer", color: GREY_TEXT_DARK, padding: SPACE_4 }} title="Edit pack">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => del(p.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: RED, padding: SPACE_4 }} title="Delete pack">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddPackModal({ clinicId, pack, onClose, onSaved }: {
  clinicId: string; pack?: Pack; onClose: () => void; onSaved: () => void;
}) {
  const [sizeStr, setSizeStr] = useState<string>(pack ? String(pack.pack_size) : "10");
  const [purchasedAt, setPurchasedAt] = useState<string>(pack ? pack.purchased_at.slice(0, 10) : sydneyTodayISO());
  const [packName, setPackName] = useState(pack?.pack_name ?? "");
  const [amountStr, setAmountStr] = useState<string>(pack?.amount_paid_ex_gst != null ? String(pack.amount_paid_ex_gst) : "");
  const [datePaid, setDatePaid] = useState<string>(pack?.date_paid ?? sydneyTodayISO());
  const [packType, setPackType] = useState<Pack["pack_type"]>(pack?.pack_type ?? "paid");
  const [notes, setNotes] = useState(pack?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const size = parseInt(sizeStr, 10);
  const amount = amountStr === "" ? null : Number(amountStr);

  const save = async () => {
    if (!Number.isFinite(size) || size <= 0) { toast.error("Pack size must be greater than 0"); return; }
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) { toast.error("Amount paid must be 0 or more"); return; }
    if (packType === "paid" && amount == null) {
      if (!confirm("No amount paid entered — revenue and value-owed figures will show '—' for this pack. Save anyway?")) return;
    }
    setSaving(true);
    const row = {
      clinic_id: clinicId,
      pack_size: size,
      purchased_at: purchasedAt,
      pack_name: packName.trim() || null,
      amount_paid_ex_gst: amount,
      date_paid: datePaid || null,
      pack_type: packType,
      notes: notes.trim() || null,
    };
    const { error } = pack
      ? await supabase.from("clinic_packs").update(row).eq("id", pack.id)
      : await supabase.from("clinic_packs").insert(row);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(pack ? "Pack updated" : `Added ${size}-patient pack`);
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
        <h3 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 4px" }}>{pack ? "Edit pack" : "Add patient pack"}</h3>
        <p style={{ fontSize: 13, color: GREY_TEXT, margin: "0 0 20px" }}>
          Enter the amount paid so the Numbers page can work out revenue and value owed. A credit is consumed each time a patient shows up.
        </p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: SPACE_8 }}>
          Pack name (optional)
        </label>
        <input
          type="text"
          value={packName}
          onChange={(e) => setPackName(e.target.value)}
          placeholder="e.g. 10-show pack"
          style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS_BTN, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: SPACE_16 }}
        />

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
          Amount paid (ex GST)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="e.g. 8000"
          style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS_BTN, border: `1px solid ${amountStr === "" && packType === "paid" ? AMBER : GREY_BORDER}`, fontSize: 14, marginBottom: SPACE_8 }}
        />
        <div style={{ fontSize: 12, color: amountStr === "" && packType === "paid" ? AMBER : GREY_TEXT, marginBottom: SPACE_16 }}>
          {amountStr === "" && packType === "paid"
            ? "Needed so revenue, rate per show and value owed keep working."
            : size > 0 && amount != null && amount > 0
              ? `That's $${(amount / size).toFixed(2)} per show.`
              : "Leave blank only for free or credited packs."}
        </div>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: SPACE_8 }}>
          Date paid
        </label>
        <input
          type="date"
          value={datePaid}
          onChange={(e) => setDatePaid(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS_BTN, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: SPACE_16 }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: GREY_TEXT_DARK, marginBottom: SPACE_8 }}>
          Pack type
        </label>
        <select
          value={packType}
          onChange={(e) => setPackType(e.target.value as Pack["pack_type"])}
          style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS_BTN, border: `1px solid ${GREY_BORDER}`, fontSize: 14, marginBottom: SPACE_16, background: "#fff" }}
        >
          <option value="paid">Paid</option>
          <option value="free_trial">Free trial</option>
          <option value="guarantee_credit">Guarantee credit</option>
          <option value="goodwill">Goodwill</option>
        </select>

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
          }}>{saving ? "Saving…" : pack ? "Save pack" : "Add pack"}</button>
        </div>
      </div>
    </div>
  );
}
