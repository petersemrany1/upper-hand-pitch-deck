// Ported from the Legal app (family-law-floater/src/components/numbers/AdsTab.tsx). Re-run the port script to refresh.
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdPerformanceRow } from "@/legal/lib/numbers.types";
import { isUntrackedAd, pipelineSentence, type AdStats, type Pipeline } from "./model";
import { FAINT, INK, money, moneyOrDash, pctOrDash, td2r } from "./format";

// "Called": how much of an ad's leads have had at least one call, as one
// number. An ad with lots of leads and no bookings is only bad once this is
// high; when it is low the leads are simply still in the queue.
function CalledCell({ p }: { p: Pipeline | null }) {
  if (!p || p.total === 0)
    return (
      <td style={td2r}>
        <span style={{ color: FAINT }}>—</span>
      </td>
    );
  const called = p.total - p.toCall;
  const share = called / p.total;
  const tone =
    share < 0.5
      ? { color: "#b03030", background: "#fdeeee" }
      : share < 0.8
        ? { color: "#8a5a2b", background: "#fdf5e8" }
        : { color: INK };
  return (
    <td
      style={{ ...td2r, ...tone, fontWeight: 600 }}
      title={`${called} of ${p.total} called · ${pipelineSentence(p)}`}
    >
      {Math.round(share * 100)}%
      <span style={{ fontWeight: 400, color: share < 0.8 ? tone.color : FAINT }}>
        {" "}
        · {called} of {p.total}
      </span>
    </td>
  );
}

type SortKey =
  | "verdict"
  | "spend"
  | "leads"
  | "called"
  | "costPerLead"
  | "booked"
  | "bookRate"
  | "shows"
  | "adCostPerShow";

/**
 * Client outcomes use the existing reporting model and sort rules.
 * Expected attendance includes confirmed, upcoming and unresolved consultations.
 */
export function AdsTab({
  rows,
  loading,
  onDrill,
}: {
  rows: AdStats[];
  loading: boolean;
  onDrill: (ad: AdPerformanceRow) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("verdict");
  const [sortAsc, setSortAsc] = useState(true);
  const [more, setMore] = useState(false);

  const sorted = useMemo(() => {
    const val = (r: AdStats): number | null => {
      switch (sortKey) {
        case "spend":
          return r.spendVerified === false || r.unattributed ? null : r.spend;
        case "leads":
          return r.leads;
        case "called":
          return r.pipeline && r.pipeline.total
            ? (r.pipeline.total - r.pipeline.toCall) / r.pipeline.total
            : null;
        case "costPerLead":
          return r.costPerLead;
        case "booked":
          return r.booked;
        case "bookRate":
          return r.bookRate;
        case "shows":
          return r.shows;
        case "adCostPerShow":
          return r.adCostPerShow;
        default:
          return null;
      }
    };
    return [...rows].sort((a, b) => {
      if (sortKey === "verdict") {
        if (a.verdict.rank !== b.verdict.rank) return a.verdict.rank - b.verdict.rank;
        const ac = a.adCostPerShow ?? Infinity;
        const bc = b.adCostPerShow ?? Infinity;
        if (ac !== bc) return ac - bc;
        return b.spend - a.spend;
      }
      const av = val(a);
      const bv = val(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortAsc ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortAsc]);

  const th = (key: SortKey, label: string) => (
    <th
      aria-sort={
        sortKey === key && key !== "verdict" ? (sortAsc ? "ascending" : "descending") : "none"
      }
    >
      <button
        onClick={() => {
          if (sortKey === key) setSortAsc(!sortAsc);
          else {
            setSortKey(key);
            setSortAsc(key === "costPerLead" || key === "adCostPerShow" || key === "verdict");
          }
        }}
      >
        {label}
        {sortKey === key && key !== "verdict" ? (sortAsc ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
  return (
    <div>
      <div className="numbers-table-tools">
        <span>Portal enquiries and outcomes. Select an ad to see its clients.</span>
        <label>
          <input type="checkbox" checked={more} onChange={(e) => setMore(e.target.checked)} /> More
          metrics
        </label>
      </div>
      <div className="legal-table-scroll">
        <table className="numbers-table">
          <caption className="sr-only">Client outcomes by ad</caption>
          <thead>
            <tr>
              {th("verdict", "Ad · best first")}
              <th>Location</th>
              {th("leads", "Enquiries")}
              {th("booked", "Booked")}
              {th("shows", "Expected attendance")}
              {th("adCostPerShow", "Ad cost / expected attendance")}
              <th>Assessment</th>
              {more && (
                <>
                  {th("spend", "Spend")}
                  {th("called", "Called")}
                  {th("costPerLead", "Ad cost / enquiry")}
                  {th("bookRate", "Booking rate")}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.reporting_key ?? `${r.ad_name}-${r.unattributed}`}>
                <td>
                  <button onClick={() => onDrill(r)}>
                    {isUntrackedAd(r) ? "Website & untracked enquiries" : r.ad_name}
                  </button>
                  {r.name_collision && (
                    <span title="Possible renamed or reused ad name">
                      <AlertTriangle size={13} />
                    </span>
                  )}
                </td>
                <td>{r.location ?? "—"}</td>
                <td>{r.leads}</td>
                <td>{r.booked}</td>
                <td>{r.shows}</td>
                <td>{moneyOrDash(r.adCostPerShow)}</td>
                <td>{r.verdict.label}</td>
                {more && (
                  <>
                    <td>{r.spendVerified === false || r.unattributed ? "—" : money(r.spend)}</td>
                    <CalledCell p={r.pipeline} />
                    <td>{moneyOrDash(r.costPerLead)}</td>
                    <td>{pctOrDash(r.bookRate)}</td>
                  </>
                )}
              </tr>
            ))}
            {!loading && !sorted.length && (
              <tr>
                <td colSpan={more ? 11 : 7}>No ads in this range yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <details className="numbers-help">
        <summary>How these assessments work</summary>
        <p>
          Expected attendance includes confirmed, upcoming and unresolved past consultations.
          Winning means ad cost per expected attendance is at least 20% below the ad average; poor
          is 20% above. Fewer than 3 expected attendances is too early. Not booking means 10+
          enquiries, none booked, and the leads have been called. Not called yet means most are
          still waiting for a call.
        </p>
        <p>
          Ads match by ID or creative name within their recorded campaign. Reused names within a
          campaign can combine IDs. Awaiting spend means import coverage is incomplete; Unmatched ad
          means no matching Meta ad was found. Website and untracked enquiries remain separate and
          uncosted against individual ads.
        </p>
      </details>
    </div>
  );
}
