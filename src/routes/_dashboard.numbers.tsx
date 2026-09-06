import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, X, Ban, Plus, Pencil, Trash2, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { APP_TIMEZONE } from "@/lib/timezone";
import {
  getNumbersReport,
  listAdLeads,
  listSpendRows,
  setAppointmentOutcomeFromNumbers,
  upsertManualSpend,
  deleteSpendRow,
  listClinicPacks,
  upsertClinicPack,
  deleteClinicPack,
  type ClinicPackRow,
  type ClinicOption,
  type AdPerformanceRow,
  type LocationSummaryRow,
  type NeedsOutcomeRow,
  type PackEconomicsRow,
  type SpendRow,
  type LabourRow,
  type RevenueRow,
} from "@/lib/ad-spend.functions";
import { CARD, FONT, INK, MUTED, type RangeKey, money, oneDp, pctOrDash, resolveRange, td2, td2r, th2, th2r, todaySydney } from "@/components/numbers/format";
import { buildAdStats, buildAllCities, diagnoseCity, sumCityStats } from "@/components/numbers/model";
import { CityRail } from "@/components/numbers/CityRail";
import { CityDetail } from "@/components/numbers/CityDetail";
import { CompareTable } from "@/components/numbers/CompareTable";
import { AdsTab } from "@/components/numbers/AdsTab";

export const Route = createFileRoute("/_dashboard/numbers")({
  head: () => ({
    meta: [
      { title: "Numbers — Ad Spend vs Bookings | Hair Transplant Group" },
      {
        name: "description",
        content:
          "Admin reporting: ad spend against leads, bookings and shows, with cost per show by ad and location.",
      },
      { property: "og:title", content: "Numbers — Ad Spend vs Bookings" },
      {
        property: "og:description",
        content: "Cost per lead, cost per booked and cost per show for every ad and location.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NumbersPage,
});

type View = "performance" | "packs";

const FMT = { money, pct: pctOrDash, oneDp };

// Responsive shell: city rail beside the detail on wide screens, stacked on
// narrow ones. Kept as a scoped stylesheet so the inline-styled cards stay
// self-contained.
const SHELL_CSS = `
.numbers-shell{display:grid;grid-template-columns:1fr;gap:16px;align-items:start}
@media (min-width:1024px){.numbers-shell{grid-template-columns:250px minmax(0,1fr)}.numbers-rail{position:sticky;top:16px}}
@media (max-width:720px){.numbers-funnel{grid-template-columns:1fr!important}.numbers-arrow{padding:6px 0!important;align-items:flex-start!important}.numbers-split{grid-template-columns:1fr!important}}
@media (max-width:1023px){.numbers-rail-list{flex-direction:row!important;overflow-x:auto;gap:6px!important;padding-bottom:4px}.numbers-rail-item{min-width:160px;flex:0 0 auto}.numbers-rail-divider,.numbers-rail-note{display:none}}
.numbers-rail-item:hover{background:#f0f0ee}
.numbers-rail-item[aria-current="true"]:hover{background:#111}
`;

function NumbersPage() {
  const { session, role, ready: authReady } = useAuth();
  const isAdmin = role === "admin";

  const fetchReport = useServerFn(getNumbersReport);
  const fetchLeads = useServerFn(listAdLeads);
  const fetchSpend = useServerFn(listSpendRows);
  const saveOutcome = useServerFn(setAppointmentOutcomeFromNumbers);
  const saveSpend = useServerFn(upsertManualSpend);
  const removeSpend = useServerFn(deleteSpendRow);

  const [rangeKey, setRangeKey] = useState<RangeKey>("90d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [countMyPay, setCountMyPay] = useState(true);
  const [loading, setLoading] = useState(true);

  const [ads, setAds] = useState<AdPerformanceRow[]>([]);
  const [locations, setLocations] = useState<LocationSummaryRow[]>([]);
  const [labourByLocation, setLabourByLocation] = useState<LabourRow[]>([]);
  const [revenueByLocation, setRevenueByLocation] = useState<RevenueRow[]>([]);
  const [needsOutcome, setNeedsOutcome] = useState<NeedsOutcomeRow[]>([]);
  const [packEconomics, setPackEconomics] = useState<PackEconomicsRow[]>([]);

  const [syncState, setSyncState] = useState<{
    last_synced_at: string | null;
    last_status: string | null;
    last_message: string | null;
  } | null>(null);

  const [view, setView] = useState<View>("performance");
  const [showUnresolved, setShowUnresolved] = useState(false);
  const [drill, setDrill] = useState<{ ad: AdPerformanceRow; rows: unknown[] } | null>(null);
  const [spendPanel, setSpendPanel] = useState(false);
  const [spendRows, setSpendRows] = useState<SpendRow[]>([]);
  const [editing, setEditing] = useState<Partial<SpendRow> | null>(null);

  // ---- Editable clinic packs
  const fetchPacks = useServerFn(listClinicPacks);
  const savePack = useServerFn(upsertClinicPack);
  const removePack = useServerFn(deleteClinicPack);
  const [packs, setPacks] = useState<ClinicPackRow[]>([]);
  const [clinicOpts, setClinicOpts] = useState<ClinicOption[]>([]);
  const [editingPack, setEditingPack] = useState<Partial<ClinicPackRow> | null>(null);
  const [showPackEditor, setShowPackEditor] = useState(false);

  const range = useMemo(() => resolveRange(rangeKey, customFrom, customTo), [rangeKey, customFrom, customTo]);

  // Pack totals: revenue is recognised on shows delivered, so anything
  // purchased and not yet delivered is work owed.
  const packTotals = useMemo(() => {
    return packEconomics.reduce(
      (a, p) => ({
        purchased: a.purchased + p.shows_purchased,
        delivered: a.delivered + p.shows_delivered,
        owed: a.owed + p.shows_owed,
        valueOwed: a.valueOwed + p.value_owed,
        paid: a.paid + p.amount_paid_ex_gst,
        freeShows: a.freeShows + p.shows_free_purchased,
      }),
      { purchased: 0, delivered: 0, owed: 0, valueOwed: 0, paid: 0, freeShows: 0 },
    );
  }, [packEconomics]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReport({
        data: { from: range.from, to: range.to, location: locFilter || null, excludePeter: !countMyPay },
      });
      setAds(res.ads);
      setLocations(res.locations);
      setLabourByLocation(res.labourByLocation);
      setRevenueByLocation(res.revenueByLocation);
      setNeedsOutcome(res.needsOutcome);
      setPackEconomics(res.packEconomics);
      setSyncState(res.syncState);
    } catch (e) {
      toast.error((e as Error).message || "Could not load the numbers");
    } finally {
      setLoading(false);
    }
  }, [fetchReport, range.from, range.to, locFilter, countMyPay]);

  useEffect(() => {
    if (authReady && session && isAdmin) void load();
  }, [authReady, session, isAdmin, load]);

  const loadSpendRows = useCallback(async () => {
    try {
      const rows = await fetchSpend({ data: { from: range.from, to: range.to } });
      setSpendRows(rows);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchSpend, range.from, range.to]);

  const loadPacks = useCallback(async () => {
    try {
      const res = await fetchPacks();
      setPacks(res.packs);
      setClinicOpts(res.clinics);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchPacks]);

  useEffect(() => {
    if (authReady && session && isAdmin) void loadPacks();
  }, [authReady, session, isAdmin, loadPacks]);

  // ---- Per-city figures. Locations, labour and revenue come back for every
  // city regardless of the filter, so switching city is instant client-side;
  // only the ad list is filtered server-side.
  const { cities, all, unallocated } = useMemo(
    () => buildAllCities(locations, labourByLocation, revenueByLocation),
    [locations, labourByLocation, revenueByLocation],
  );
  const cityNames = useMemo(() => cities.map((c) => c.key), [cities]);

  const scope = useMemo(() => {
    if (!locFilter) return all;
    const c = cities.find((x) => x.key.toLowerCase() === locFilter.toLowerCase());
    return c ?? sumCityStats(locFilter, []);
  }, [locFilter, cities, all]);

  const adStats = useMemo(() => buildAdStats(ads), [ads]);

  // One verdict per city, read against the account average.
  const diagnosed = useMemo(
    () => cities.map((c) => ({ city: c, diagnosis: diagnoseCity(c, all, FMT) })),
    [cities, all],
  );
  const scopeDiagnosis = locFilter
    ? diagnosed.find((d) => d.city.key.toLowerCase() === locFilter.toLowerCase())?.diagnosis ?? null
    : null;

  if (authReady && session && !isAdmin) {
    return (
      <div style={{ padding: 32, fontFamily: FONT, color: INK }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Not available</h1>
        <p style={{ color: MUTED, fontSize: 14 }}>This page is for admins only.</p>
      </div>
    );
  }

  const markOutcome = async (id: string, outcome: "show" | "noshow" | "disqualified") => {
    try {
      await saveOutcome({ data: { appointmentId: id, outcome } });
      setNeedsOutcome((prev) => prev.filter((n) => n.appointment_id !== id));
      toast.success("Outcome recorded");
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openDrill = async (ad: AdPerformanceRow) => {
    try {
      const rowsOut = await fetchLeads({
        data: {
          adName: ad.ad_name,
          unattributed: ad.unattributed,
          from: range.from,
          to: range.to,
        },
      });
      setDrill({ ad, rows: rowsOut as unknown[] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const scopeLabel = locFilter || "All cities";

  return (
    <div style={{ background: "#f7f7f5", minHeight: "100%", fontFamily: FONT, padding: 24 }}>
      <style>{SHELL_CSS}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: INK, margin: 0 }}>Numbers</h1>
          <div style={{ display: "flex", gap: 4, background: "#eeeeec", borderRadius: 10, padding: 3, marginLeft: 8 }}>
            {([["performance", "Performance"], ["packs", "Clinics & packs"]] as [View, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                style={{ fontSize: 12.5, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: view === k ? "#fff" : "transparent", fontWeight: view === k ? 600 : 400, color: INK }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: syncState?.last_status === "error" ? "#b03030" : MUTED }}>
            Spend last synced:{" "}
            {syncState?.last_synced_at
              ? new Date(syncState.last_synced_at).toLocaleString("en-AU", { timeZone: APP_TIMEZONE })
              : "never"}
            {syncState?.last_status === "error" ? ` — ${syncState.last_message}` : ""}
          </div>
          <button
            onClick={() => void load()}
            style={{ ...CARD, padding: "6px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {/* Range + secondary controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, background: "#f0f0ee", padding: 4, borderRadius: 10 }}>
            {([
              ["month", "This month"],
              ["30d", "Last 30 days"],
              ["90d", "Last 90 days"],
              ["all", "All time"],
              ["custom", "Custom"],
            ] as [RangeKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRangeKey(k)}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: rangeKey === k ? "#fff" : "transparent",
                  fontWeight: rangeKey === k ? 600 : 400,
                  color: INK,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {rangeKey === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ ...CARD, padding: "6px 10px", fontSize: 12 }} />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ ...CARD, padding: "6px 10px", fontSize: 12 }} />
            </>
          )}

          <label
            style={{
              ...CARD,
              padding: "6px 12px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
            }}
            title="Untick to see every cost, profit and cost-per-show figure with Peter's hours and booking bonuses removed"
          >
            <input
              type="checkbox"
              checked={countMyPay}
              onChange={(e) => setCountMyPay(e.target.checked)}
              style={{ accentColor: INK, cursor: "pointer" }}
            />
            Count my pay as a cost
          </label>

          {needsOutcome.length > 0 && (
            <button
              onClick={() => setShowUnresolved((v) => !v)}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                border: "0.5px solid #e0b060",
                background: "#fdf5e6",
                color: "#8a5a2b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle className="h-3 w-3" /> Needs outcome ({needsOutcome.length})
            </button>
          )}

          <Link
            to="/rep-hours"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 999,
              border: "0.5px solid #d8d8d5",
              background: "#fff",
              color: INK,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Clock className="h-3 w-3" /> Rep hours &amp; rates
          </Link>

          <button
            onClick={() => {
              setSpendPanel((v) => !v);
              if (!spendPanel) void loadSpendRows();
            }}
            style={{ ...CARD, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
          >
            {spendPanel ? "Hide spend entries" : "Edit spend by hand"}
          </button>
        </div>

        {/* Needs-outcome panel */}
        {showUnresolved && (
          <div style={CARD}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              Appointments with no outcome recorded
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
              {needsOutcome.map((n) => (
                <div
                  key={n.appointment_id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#faf9f7", borderRadius: 10, flexWrap: "wrap" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, minWidth: 160 }}>{n.patient_name}</div>
                  <div style={{ fontSize: 12, color: "#6b6b6b", minWidth: 120 }}>
                    {n.appointment_date ?? "—"} {n.appointment_time ?? ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b6b6b", flex: 1 }}>{n.clinic_name ?? "—"}</div>
                  <button onClick={() => void markOutcome(n.appointment_id, "show")} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "0.5px solid #bcd8c4", background: "#eef7f0", color: "#2f6f4f", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check className="h-3 w-3" /> Show
                  </button>
                  <button onClick={() => void markOutcome(n.appointment_id, "noshow")} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "0.5px solid #e6c0c0", background: "#fdeeee", color: "#b03030", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <X className="h-3 w-3" /> No-show
                  </button>
                  <button onClick={() => void markOutcome(n.appointment_id, "disqualified")} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "0.5px solid #e8e8e6", background: "#f4f4f2", color: "#6b6b6b", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Ban className="h-3 w-3" /> Disqualified
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual spend panel */}
        {spendPanel && (
          <div style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Spend entries in this range</div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setEditing({ date: todaySydney(), ad_name: "", spend_aud: 0 })}
                style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid #e8e8e6", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Plus className="h-3 w-3" /> Add row
              </button>
            </div>

            {editing && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 10, background: "#faf9f7", borderRadius: 10, marginBottom: 10 }}>
                <input type="date" value={editing.date ?? ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12 }} />
                <input placeholder="Ad name" value={editing.ad_name ?? ""} onChange={(e) => setEditing({ ...editing, ad_name: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, minWidth: 200 }} />
                <input placeholder="Ad set (optional)" value={editing.adset_name ?? ""} onChange={(e) => setEditing({ ...editing, adset_name: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12 }} />
                <input placeholder="Campaign e.g. Hair Transplant Perth" value={editing.campaign_name ?? ""} onChange={(e) => setEditing({ ...editing, campaign_name: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, minWidth: 240 }} />
                <input type="number" placeholder="Spend AUD" value={editing.spend_aud ?? 0} onChange={(e) => setEditing({ ...editing, spend_aud: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 120 }} />
                <input type="number" placeholder="Impressions" value={editing.impressions ?? 0} onChange={(e) => setEditing({ ...editing, impressions: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 120 }} />
                <input type="number" placeholder="Clicks" value={editing.clicks ?? 0} onChange={(e) => setEditing({ ...editing, clicks: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 100 }} />
                <button
                  onClick={async () => {
                    if (!editing.date || !editing.ad_name) {
                      toast.error("Date and ad name are required");
                      return;
                    }
                    try {
                      await saveSpend({
                        data: {
                          id: editing.id,
                          date: editing.date,
                          ad_name: editing.ad_name,
                          adset_name: editing.adset_name ?? null,
                          campaign_name: editing.campaign_name ?? null,
                          spend_aud: Number(editing.spend_aud ?? 0),
                          impressions: Number(editing.impressions ?? 0),
                          clicks: Number(editing.clicks ?? 0),
                        },
                      });
                      toast.success("Saved");
                      setEditing(null);
                      await loadSpendRows();
                      void load();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}
                >
                  Save
                </button>
                <button onClick={() => setEditing(null)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid #e8e8e6", background: "#fff", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            )}

            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Date", "Ad", "Campaign", "Spend", "Impr.", "Clicks", "Source", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 11, color: "#6b6b6b", padding: "6px 8px", borderBottom: "0.5px solid #e8e8e6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spendRows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "0.5px solid #f0f0ee" }}>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.date}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.ad_name}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px", color: "#6b6b6b" }}>{r.campaign_name ?? "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{money(r.spend_aud)}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.impressions}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.clicks}</td>
                      <td style={{ fontSize: 11, padding: "6px 8px", color: "#6b6b6b" }}>{r.source}</td>
                      <td style={{ padding: "6px 8px", display: "flex", gap: 6 }}>
                        <button onClick={() => setEditing(r)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6b6b6b" }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await removeSpend({ data: { id: r.id } });
                              await loadSpendRows();
                              void load();
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#b03030" }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {spendRows.length === 0 && (
                    <tr><td colSpan={8} style={{ fontSize: 12, color: "#6b6b6b", padding: 12 }}>No spend rows in this range yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "performance" && (
          <div className="numbers-shell">
            <div className="numbers-rail">
              <CityRail all={all} items={diagnosed} selected={locFilter} onSelect={setLocFilter} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              {loading && cities.length === 0 ? (
                <div style={{ ...CARD, fontSize: 13, color: MUTED }}>Loading the numbers…</div>
              ) : (
                <>
                  <CityDetail
                    scope={scope}
                    avg={all}
                    isAll={!locFilter}
                    diagnosis={scopeDiagnosis}
                    unallocated={unallocated}
                    countMyPay={countMyPay}
                  />
                  <AdsTab
                    rows={adStats.rows}
                    avgCostPerShow={adStats.avgCostPerShow}
                    loading={loading}
                    scopeLabel={scopeLabel}
                    onDrill={(ad) => void openDrill(ad)}
                  />
                  <CompareTable rows={diagnosed} all={all} selected={locFilter} onSelect={setLocFilter} />
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3 — packs & delivery */}
        {view === "packs" && (
        <>
        <div style={{ ...CARD, marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Clinic packs — delivered vs owed</div>
            <div style={{ fontSize: 12, color: "#6b6b6b" }}>
              {packTotals.owed} show{packTotals.owed === 1 ? "" : "s"} still owed
              {packTotals.valueOwed > 0 ? ` · ${money(packTotals.valueOwed)} of work paid for and not yet delivered` : ""}
            </div>
          </div>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#6b6b6b" }}>
                  <th style={th2}>Clinic</th>
                  <th style={th2r}>Purchased</th>
                  <th style={th2r}>Delivered</th>
                  <th style={th2r}>Still owed</th>
                  <th style={th2r}>Value owed</th>
                  <th style={th2r}>Paid</th>
                  <th style={th2r}>Rate / show</th>
                  <th style={th2r}>Free shows</th>
                </tr>
              </thead>
              <tbody>
                {packEconomics.map((p) => (
                  <tr key={p.clinic_id} style={{ borderTop: "0.5px solid #f0f0ee" }}>
                    <td style={td2}>
                      {p.clinic_name}
                      {p.city ? <span style={{ color: "#9a9a97" }}> · {p.city}</span> : null}
                      {p.over_delivered > 0 && (
                        <span style={{ color: "#b03030", marginLeft: 6 }}>
                          over by {p.over_delivered}
                        </span>
                      )}
                      {p.packs_missing_amount > 0 && (
                        <span style={{ color: "#8a5a2b", marginLeft: 6 }}>
                          {p.packs_missing_amount} pack{p.packs_missing_amount === 1 ? "" : "s"} missing $
                        </span>
                      )}
                    </td>
                    <td style={td2r}>{p.shows_purchased || "—"}</td>
                    <td style={td2r}>{p.shows_delivered || "—"}</td>
                    <td style={{ ...td2r, fontWeight: p.shows_owed > 0 ? 600 : 400, color: p.shows_owed > 0 ? "#8a5a2b" : "#6b6b6b" }}>
                      {p.shows_owed || "—"}
                    </td>
                    <td style={td2r}>{p.value_owed > 0 ? money(p.value_owed) : "—"}</td>
                    <td style={td2r}>{p.amount_paid_ex_gst > 0 ? money(p.amount_paid_ex_gst) : "—"}</td>
                    <td style={td2r}>
                      {p.effective_rate ? money(p.effective_rate) : "—"}
                      {p.effective_rate ? <span style={{ color: "#9a9a97" }}> vs {money(p.list_rate)}</span> : null}
                    </td>
                    <td style={td2r}>{p.shows_free_purchased || "—"}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "0.5px solid #111", fontWeight: 600 }}>
                  <td style={td2}>TOTAL</td>
                  <td style={td2r}>{packTotals.purchased}</td>
                  <td style={td2r}>{packTotals.delivered}</td>
                  <td style={{ ...td2r, color: packTotals.owed > 0 ? "#8a5a2b" : "#6b6b6b" }}>{packTotals.owed}</td>
                  <td style={td2r}>{packTotals.valueOwed > 0 ? money(packTotals.valueOwed) : "—"}</td>
                  <td style={td2r}>{packTotals.paid > 0 ? money(packTotals.paid) : "—"}</td>
                  <td style={td2r}>—</td>
                  <td style={td2r}>{packTotals.freeShows || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: "#9a9a97", marginTop: 10 }}>
            Rate per show is money paid ÷ all shows in the pack, free shows included. Revenue is recognised on shows delivered at that rate and can never exceed the money received, so over-delivered shows earn nothing. Shows still owed are paid work not yet done.
          </div>
        </div>

        {/* SECTION A3 — editable clinic packs */}
        <div style={{ ...CARD, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Packs — what each clinic paid</div>
              <div style={{ fontSize: 12, color: "#6b6b6b" }}>Enter money received here. The table above, revenue and value-owed figures update from these rows.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowPackEditor((v) => !v)}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "0.5px solid #d9d9d6", background: "#fff", cursor: "pointer" }}
              >
                {showPackEditor ? "Hide packs" : "Manage packs"}
              </button>
              <button
                onClick={() => {
                  setShowPackEditor(true);
                  setEditingPack({ pack_size: 10, pack_type: "paid", date_paid: todaySydney() });
                }}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <Plus size={13} /> Add pack
              </button>
            </div>
          </div>

          {showPackEditor && (
            <div style={{ marginTop: 12 }}>
              {editingPack && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: 10, border: "0.5px solid #e0d9c8", background: "#fdfbf5", borderRadius: 10, marginBottom: 10 }}>
                  <select
                    value={editingPack.clinic_id ?? ""}
                    onChange={(e) => setEditingPack({ ...editingPack, clinic_id: e.target.value })}
                    style={{ ...CARD, padding: "6px 8px", fontSize: 12, minWidth: 180 }}
                  >
                    <option value="">Clinic…</option>
                    {clinicOpts.map((c) => (
                      <option key={c.id} value={c.id}>{c.clinic_name}{c.city ? ` (${c.city})` : ""}</option>
                    ))}
                  </select>
                  <input placeholder="Pack name e.g. 10-show pack" value={editingPack.pack_name ?? ""} onChange={(e) => setEditingPack({ ...editingPack, pack_name: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, minWidth: 160 }} />
                  <input type="number" min={1} placeholder="Shows" value={editingPack.pack_size ?? ""} onChange={(e) => setEditingPack({ ...editingPack, pack_size: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 80 }} />
                  <input type="number" min={0} placeholder="Free shows" title="How many of these shows are free (included at no charge)" value={editingPack.free_shows_included ?? 0} onChange={(e) => setEditingPack({ ...editingPack, free_shows_included: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 100 }} />
                  <input type="number" min={0} step="0.01" placeholder="Paid ex GST" value={editingPack.amount_paid_ex_gst ?? ""} onChange={(e) => setEditingPack({ ...editingPack, amount_paid_ex_gst: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 110 }} />
                  <input type="date" value={editingPack.date_paid ?? ""} onChange={(e) => setEditingPack({ ...editingPack, date_paid: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12 }} />
                  <select
                    value={editingPack.pack_type ?? "paid"}
                    onChange={(e) => setEditingPack({ ...editingPack, pack_type: e.target.value })}
                    style={{ ...CARD, padding: "6px 8px", fontSize: 12 }}
                  >
                    <option value="paid">Paid</option>
                    <option value="free_trial">Free trial</option>
                    <option value="guarantee_credit">Guarantee credit</option>
                    <option value="goodwill">Goodwill</option>
                  </select>
                  <input placeholder="Notes (optional)" value={editingPack.notes ?? ""} onChange={(e) => setEditingPack({ ...editingPack, notes: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, minWidth: 140 }} />
                  <button
                    onClick={async () => {
                      if (!editingPack.clinic_id) { toast.error("Pick a clinic"); return; }
                      if (!editingPack.pack_size || editingPack.pack_size < 1) { toast.error("Pack needs at least 1 show"); return; }
                      try {
                        await savePack({
                          data: {
                            id: editingPack.id,
                            clinic_id: editingPack.clinic_id,
                            pack_name: editingPack.pack_name ?? null,
                            pack_size: Number(editingPack.pack_size),
                            free_shows_included: Number(editingPack.free_shows_included ?? 0),
                            amount_paid_ex_gst: editingPack.amount_paid_ex_gst ?? null,
                            date_paid: editingPack.date_paid || null,
                            pack_type: (editingPack.pack_type ?? "paid") as "paid" | "free_trial" | "guarantee_credit" | "goodwill",
                            notes: editingPack.notes ?? null,
                          },
                        });
                        toast.success(editingPack.id ? "Pack updated" : "Pack added");
                        setEditingPack(null);
                        await Promise.all([loadPacks(), load()]);
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingPack(null)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "0.5px solid #d9d9d6", background: "#fff", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#6b6b6b" }}>
                      <th style={th2}>Clinic</th>
                      <th style={th2}>Pack</th>
                      <th style={th2r}>Shows</th>
                      <th style={th2r}>Paid ex GST</th>
                      <th style={th2}>Date paid</th>
                      <th style={th2}>Type</th>
                      <th style={th2}>Notes</th>
                      <th style={th2r}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {packs.map((p) => {
                      const clinic = clinicOpts.find((c) => c.id === p.clinic_id);
                      return (
                        <tr key={p.id} style={{ borderTop: "0.5px solid #f0f0ee" }}>
                          <td style={td2}>{clinic?.clinic_name ?? "—"}</td>
                          <td style={td2}>{p.pack_name ?? "—"}</td>
                          <td style={td2r}>{p.pack_size}</td>
                          <td style={{ ...td2r, color: p.amount_paid_ex_gst == null ? "#8a5a2b" : undefined }}>
                            {p.amount_paid_ex_gst == null ? "missing" : money(p.amount_paid_ex_gst)}
                          </td>
                          <td style={td2}>
                            {p.date_paid ?? (
                              <span title="No date paid recorded" style={{ color: "#8a5a2b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <AlertTriangle size={12} /> no date
                              </span>
                            )}
                          </td>
                          <td style={td2}>{p.pack_type}</td>
                          <td style={{ ...td2, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{p.notes ?? ""}</td>
                          <td style={td2r}>
                            <button onClick={() => setEditingPack({ ...p })} title="Edit pack" style={{ border: "none", background: "none", cursor: "pointer", color: "#6b6b6b", padding: 4 }}>
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this pack?")) return;
                                try {
                                  await removePack({ data: { id: p.id } });
                                  toast.success("Pack deleted");
                                  await Promise.all([loadPacks(), load()]);
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              }}
                              title="Delete pack"
                              style={{ border: "none", background: "none", cursor: "pointer", color: "#b03030", padding: 4 }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {packs.length === 0 && (
                      <tr><td colSpan={8} style={{ ...td2, color: "#9a9a97" }}>No packs yet — use Add pack.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </>
        )}

      </div>

      {/* Drilldown */}
      {drill && (
        <div
          onClick={() => setDrill(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, maxWidth: 900, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{drill.ad.ad_name}</div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setDrill(null)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Lead", "Enquired", "Location", "Appointment", "What happened"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, color: "#6b6b6b", padding: "6px 8px", borderBottom: "0.5px solid #e8e8e6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(drill.rows as Record<string, unknown>[]).map((r) => {
                  const what = r.is_showed
                    ? "Showed"
                    : r.is_noshow
                      ? "No-showed"
                      : r.is_upcoming
                        ? "Upcoming"
                        : r.needs_outcome
                          ? "Needs outcome"
                          : r.is_disqualified
                            ? "Disqualified"
                            : r.is_booked
                              ? "Booked"
                              : "Not booked";
                  return (
                    <tr key={String(r.lead_id)} style={{ borderBottom: "0.5px solid #f0f0ee" }}>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px", color: "#6b6b6b" }}>
                        {r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-AU", { timeZone: APP_TIMEZONE }) : "—"}
                      </td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{(r.location as string) ?? "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{(r.appointment_date as string) ?? "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px", fontWeight: 600 }}>{what}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
