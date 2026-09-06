import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { APP_TIMEZONE } from "@/lib/timezone";
import {
  getRepHours,
  saveRepRate,
  splitRepRate,
  deleteRepRate,
  saveHourOverride,
  clearHourOverride,
  type RepDayRow,
  type RepRateRow,
} from "@/lib/rep-labour.functions";

export const Route = createFileRoute("/_dashboard/rep-hours")({
  head: () => ({
    meta: [
      { title: "Rep Hours & Rates | Hair Transplant Group" },
      {
        name: "description",
        content:
          "Admin view of calling hours per rep per day, hourly rates, booking bonuses and manual hour corrections.",
      },
      { property: "og:title", content: "Rep Hours & Rates" },
      {
        property: "og:description",
        content: "Calling hours, pay rates and booking bonuses behind the labour cost numbers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RepHoursPage,
});

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const CARD: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid #e8e8e6",
  borderRadius: 14,
  padding: 18,
};
const th: React.CSSProperties = {
  textAlign: "right",
  padding: "8px 10px",
  fontSize: 11,
  color: "#6b6b6b",
  fontWeight: 500,
  borderBottom: "0.5px solid #e8e8e6",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  textAlign: "right",
  padding: "8px 10px",
  fontSize: 13,
  whiteSpace: "nowrap",
};

function todaySydney(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}
function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-AU")}`;
const clock = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-AU", {
        timeZone: APP_TIMEZONE,
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

type Rep = { id: string; name: string; is_active: boolean };

function RepHoursPage() {
  const { session, role, ready: authReady } = useAuth();
  const isAdmin = role === "admin";

  const fetchReport = useServerFn(getRepHours);
  const saveRate = useServerFn(saveRepRate);
  const splitRate = useServerFn(splitRepRate);
  const removeRate = useServerFn(deleteRepRate);
  const saveOverride = useServerFn(saveHourOverride);
  const removeOverride = useServerFn(clearHourOverride);

  const today = todaySydney();
  const [from, setFrom] = useState(shift(today, -29));
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<RepDayRow[]>([]);
  const [rates, setRates] = useState<RepRateRow[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [repFilter, setRepFilter] = useState("");
  const [rateForm, setRateForm] = useState<Partial<RepRateRow> | null>(null);
  const [hourEdit, setHourEdit] = useState<{ row: RepDayRow; hours: string; note: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReport({ data: { from, to } });
      setDays(res.days);
      setRates(res.rates);
      setReps(res.reps);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchReport, from, to]);

  useEffect(() => {
    if (authReady && session && isAdmin) void load();
  }, [authReady, session, isAdmin, load]);

  const visible = useMemo(
    () => (repFilter ? days.filter((d) => d.rep_id === repFilter) : days),
    [days, repFilter],
  );

  const totals = useMemo(
    () =>
      visible.reduce(
        (a, d) => ({
          hours: a.hours + d.effective_hours,
          calls: a.calls + d.calls,
          bookings: a.bookings + d.bookings,
          hourly: a.hourly + (d.hourly_cost ?? 0),
          bonus: a.bonus + (d.bonus_cost ?? 0),
          noRate: a.noRate + (d.has_rate ? 0 : d.effective_hours),
        }),
        { hours: 0, calls: 0, bookings: 0, hourly: 0, bonus: 0, noRate: 0 },
      ),
    [visible],
  );

  if (authReady && session && !isAdmin) {
    return (
      <div style={{ fontFamily: FONT, padding: 40 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Not available</h1>
        <p style={{ fontSize: 14, color: "#6b6b6b" }}>This page is for admins only.</p>
      </div>
    );
  }

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? "(unknown rep)";

  return (
    <div style={{ fontFamily: FONT, background: "#faf9f7", minHeight: "100vh", padding: "28px 24px 60px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            to="/numbers"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 999,
              border: "0.5px solid #d8d8d5",
              background: "#fff",
              color: "#111",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowLeft className="h-3 w-3" /> Numbers
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", margin: 0 }}>Rep hours &amp; rates</h1>
        </div>

        <div style={{ ...CARD, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "#6b6b6b" }}>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ fontSize: 13, padding: "6px 8px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
          />
          <label style={{ fontSize: 12, color: "#6b6b6b" }}>To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ fontSize: 13, padding: "6px 8px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
          />
          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            style={{ fontSize: 13, padding: "6px 8px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
          >
            <option value="">All reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#6b6b6b" }}>
            {loading ? "Loading…" : `${visible.length} rep-days`}
          </div>
        </div>

        {/* Rates */}
        <div style={{ ...CARD, padding: 0 }}>
          <div style={{ padding: "16px 18px 6px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Pay rates</div>
            <button
              onClick={() => setRateForm({ effective_from: today })}
              style={{
                marginLeft: "auto",
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 999,
                border: "0.5px solid #d8d8d5",
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus className="h-3 w-3" /> Add rate
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Rep</th>
                <th style={th}>Hourly rate</th>
                <th style={th}>Booking bonus</th>
                <th style={{ ...th, textAlign: "left" }}>From</th>
                <th style={{ ...th, textAlign: "left" }}>To</th>
                <th style={{ ...th, textAlign: "left" }}>Note</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} style={{ borderBottom: "0.5px solid #f0f0ee" }}>
                  <td style={{ ...td, textAlign: "left" }}>{r.rep_name ?? repName(r.rep_id)}</td>
                  <td style={td}>{r.hourly_rate === null ? "—" : money(r.hourly_rate)}</td>
                  <td style={td}>{r.booking_bonus === null ? "—" : money(r.booking_bonus)}</td>
                  <td style={{ ...td, textAlign: "left" }}>{r.effective_from}</td>
                  <td style={{ ...td, textAlign: "left" }}>{r.effective_to ?? "ongoing"}</td>
                  <td style={{ ...td, textAlign: "left", color: "#6b6b6b" }}>{r.note ?? ""}</td>
                  <td style={td}>
                    <button
                      onClick={() => setRateForm(r)}
                      style={{ border: "none", background: "none", cursor: "pointer", marginRight: 8 }}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this rate?")) return;
                        try {
                          await removeRate({ data: { id: r.id } });
                          toast.success("Rate deleted");
                          void load();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                      style={{ border: "none", background: "none", cursor: "pointer", color: "#b03030" }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rates.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, fontSize: 13, color: "#6b6b6b" }}>
                    No rates set yet — labour cost cannot be worked out until a rep has an hourly rate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {[
            { label: "Hours", value: totals.hours.toFixed(1) },
            { label: "Calls", value: String(totals.calls) },
            { label: "Bookings", value: String(totals.bookings) },
            { label: "Hourly pay", value: money(totals.hourly) },
            { label: "Booking bonuses", value: money(totals.bonus) },
            { label: "Total labour", value: money(totals.hourly + totals.bonus) },
          ].map((c) => (
            <div key={c.label} style={CARD}>
              <div style={{ fontSize: 11, color: "#6b6b6b" }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {totals.noRate > 0 && (
          <div style={{ ...CARD, fontSize: 12, color: "#8a5a2b", background: "#fdf5e6", display: "flex", gap: 8, alignItems: "center" }}>
            <AlertTriangle className="h-4 w-4" />
            {totals.noRate.toFixed(1)} hours belong to a rep with no rate set — labour cost is understated until you add their rate.
          </div>
        )}

        {/* Day table */}
        <div style={{ ...CARD, padding: 0, overflowX: "auto" }}>
          <div style={{ padding: "16px 18px 6px", fontSize: 15, fontWeight: 600 }}>Hours by day</div>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Date</th>
                <th style={{ ...th, textAlign: "left" }}>Rep</th>
                <th style={th}>Calls</th>
                <th style={{ ...th, textAlign: "left" }}>First call</th>
                <th style={{ ...th, textAlign: "left" }}>Last call</th>
                <th style={th}>Calculated</th>
                <th style={th}>Hours used</th>
                <th style={th}>Hourly pay</th>
                <th style={th}>Bookings</th>
                <th style={th}>Bonuses</th>
                <th style={{ ...th, textAlign: "left" }}>Flags</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={`${d.rep_id}-${d.work_date}`} style={{ borderBottom: "0.5px solid #f0f0ee" }}>
                  <td style={{ ...td, textAlign: "left" }}>{d.work_date}</td>
                  <td style={{ ...td, textAlign: "left" }}>{d.rep_name}</td>
                  <td style={td}>{d.calls}</td>
                  <td style={{ ...td, textAlign: "left" }}>{clock(d.first_call)}</td>
                  <td style={{ ...td, textAlign: "left" }}>{clock(d.last_call)}</td>
                  <td style={{ ...td, color: "#6b6b6b" }}>{d.calc_hours.toFixed(1)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    {d.effective_hours.toFixed(1)}
                    {d.override_hours !== null && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "#2f6f4f" }}>edited</span>
                    )}
                  </td>
                  <td style={td}>{d.hourly_cost === null ? "—" : money(d.hourly_cost)}</td>
                  <td style={td}>
                    {d.bookings}
                    {d.bookings_unresolved > 0 && (
                      <span style={{ marginLeft: 4, fontSize: 10, color: "#8a5a2b" }}>
                        ({d.bookings_unresolved} unclear)
                      </span>
                    )}
                  </td>
                  <td style={td}>{d.bonus_cost === null ? "—" : money(d.bonus_cost)}</td>
                  <td style={{ ...td, textAlign: "left", fontSize: 11, color: "#8a5a2b" }}>
                    {[
                      !d.has_rate ? "no rate" : null,
                      d.flag_long ? "long day" : null,
                      d.flag_sparse ? "few calls, long span" : null,
                      d.flag_no_location ? "no location" : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() =>
                        setHourEdit({
                          row: d,
                          hours: (d.override_hours ?? d.calc_hours).toFixed(2),
                          note: d.override_note ?? "",
                        })
                      }
                      style={{ border: "none", background: "none", cursor: "pointer" }}
                      title="Correct hours"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: 16, fontSize: 13, color: "#6b6b6b" }}>
                    No calls in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px 16px", fontSize: 11, color: "#6b6b6b" }}>
            Hours run from the first call of the day to the end of the last call, in Sydney time. No breaks are
            deducted — use the pencil to correct any day.
          </div>
        </div>
      </div>

      {/* Rate modal */}
      {rateForm && (
        <div
          onClick={() => setRateForm(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{rateForm.id ? "Edit rate" : "Add rate"}</div>
              <button onClick={() => setRateForm(null)} style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <select
                value={rateForm.rep_id ?? ""}
                onChange={(e) => setRateForm({ ...rateForm, rep_id: e.target.value })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              >
                <option value="">Choose a rep…</option>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Hourly rate"
                value={rateForm.hourly_rate ?? ""}
                onChange={(e) => setRateForm({ ...rateForm, hourly_rate: e.target.value === "" ? null : Number(e.target.value) })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Booking bonus"
                value={rateForm.booking_bonus ?? ""}
                onChange={(e) => setRateForm({ ...rateForm, booking_bonus: e.target.value === "" ? null : Number(e.target.value) })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              />
              <label style={{ fontSize: 11, color: "#6b6b6b" }}>Effective from</label>
              <input
                type="date"
                value={rateForm.effective_from ?? today}
                onChange={(e) => setRateForm({ ...rateForm, effective_from: e.target.value })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              />
              <label style={{ fontSize: 11, color: "#6b6b6b" }}>Effective to (blank = ongoing)</label>
              <input
                type="date"
                value={rateForm.effective_to ?? ""}
                onChange={(e) => setRateForm({ ...rateForm, effective_to: e.target.value || null })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              />
              <input
                placeholder="Note (optional)"
                value={rateForm.note ?? ""}
                onChange={(e) => setRateForm({ ...rateForm, note: e.target.value })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              />
              <button
                onClick={async () => {
                  if (!rateForm.rep_id) return toast.error("Choose a rep first.");
                  try {
                    await saveRate({
                      data: {
                        id: rateForm.id,
                        rep_id: rateForm.rep_id,
                        hourly_rate: rateForm.hourly_rate ?? null,
                        booking_bonus: rateForm.booking_bonus ?? null,
                        effective_from: rateForm.effective_from ?? today,
                        effective_to: rateForm.effective_to ?? null,
                        note: rateForm.note ?? null,
                      },
                    });
                    toast.success("Rate saved");
                    setRateForm(null);
                    void load();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13 }}
              >
                Save rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hours override modal */}
      {hourEdit && (
        <div
          onClick={() => setHourEdit(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {hourEdit.row.rep_name} — {hourEdit.row.work_date}
              </div>
              <button onClick={() => setHourEdit(null)} style={{ marginLeft: "auto", border: "none", background: "none", cursor: "pointer" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#6b6b6b", marginBottom: 10 }}>
              Calculated from calls: {hourEdit.row.calc_hours.toFixed(2)} hours
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <input
                type="number"
                min={0}
                max={24}
                step="0.25"
                value={hourEdit.hours}
                onChange={(e) => setHourEdit({ ...hourEdit, hours: e.target.value })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              />
              <input
                placeholder="Why (optional)"
                value={hourEdit.note}
                onChange={(e) => setHourEdit({ ...hourEdit, note: e.target.value })}
                style={{ padding: "8px 10px", border: "0.5px solid #d8d8d5", borderRadius: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    const hours = Number(hourEdit.hours);
                    if (!Number.isFinite(hours) || hours < 0 || hours > 24)
                      return toast.error("Enter hours between 0 and 24.");
                    try {
                      await saveOverride({
                        data: {
                          rep_id: hourEdit.row.rep_id,
                          work_date: hourEdit.row.work_date,
                          hours,
                          note: hourEdit.note || null,
                        },
                      });
                      toast.success("Hours updated");
                      setHourEdit(null);
                      void load();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                  style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13 }}
                >
                  Save hours
                </button>
                {hourEdit.row.override_hours !== null && (
                  <button
                    onClick={async () => {
                      try {
                        await removeOverride({
                          data: { rep_id: hourEdit.row.rep_id, work_date: hourEdit.row.work_date },
                        });
                        toast.success("Back to calculated hours");
                        setHourEdit(null);
                        void load();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    style={{ padding: "9px 14px", borderRadius: 10, border: "0.5px solid #d8d8d5", background: "#fff", cursor: "pointer", fontSize: 13 }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
