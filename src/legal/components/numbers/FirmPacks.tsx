// Ported from the Legal app (family-law-floater/src/components/numbers/FirmPacks.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { Link } from "@/legal/runtime/router";
import { Search, ArrowUpRight, Building2 } from "lucide-react";
import type { PackEconomicsRow } from "@/legal/lib/numbers.types";
import { NumberCard } from "./NumberCard";
import { money, moneyOrDash } from "./format";
export function FirmPacks({ rows }: { rows: PackEconomicsRow[] }) {
  const [search, setSearch] = useState("");
  const visible = rows
    .filter((r) =>
      `${r.firm_name} ${r.city ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => b.shows_owed - a.shows_owed || a.firm_name.localeCompare(b.firm_name));
  const total = (key: "shows_purchased" | "shows_delivered" | "shows_owed") =>
    rows.reduce((sum, r) => sum + r[key], 0);
  return (
    <section className="numbers-firms" aria-label="Firm pack delivery">
      <div className="numbers-kpi-grid">
        <NumberCard
          label="Purchased consultations"
          value={total("shows_purchased").toLocaleString("en-AU")}
          note={`${rows.length} firms · all-time packs`}
        />
        <NumberCard
          label="Confirmed delivery"
          value={total("shows_delivered").toLocaleString("en-AU")}
          note="Recorded attendance only"
        />
        <NumberCard
          emphasis
          label="Still to deliver"
          value={total("shows_owed").toLocaleString("en-AU")}
          note="Remaining commitments across all firms"
        />
      </div>
      <div className="numbers-list-toolbar">
        <label className="numbers-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search firms</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search firms or cities"
          />
        </label>
        <span>
          {visible.length} of {rows.length} firms · most owed first
        </span>
        <Link to="/firms" className="numbers-button">
          Manage firms <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="numbers-firm-grid">
        {visible.map((p) => (
          <article className="numbers-firm-card" key={p.firm_id}>
            <header>
              <div>
                <h3>{p.firm_name}</h3>
                <p>{p.city || "Location not recorded"}</p>
              </div>
              <span className={`numbers-badge ${p.shows_owed ? "amber" : "neutral"}`}>
                {p.shows_owed
                  ? `${p.shows_owed} to deliver`
                  : p.shows_purchased
                    ? "Fulfilled"
                    : "No pack recorded"}
              </span>
            </header>
            <div className="numbers-delivery">
              <span>
                <b>{p.shows_delivered}</b> delivered
              </span>
              <span>
                <b>{p.shows_purchased}</b> purchased
              </span>
            </div>
            {!!p.shows_purchased && (
              <progress
                aria-label={`${p.firm_name} pack delivery`}
                max={p.shows_purchased}
                value={Math.min(p.shows_delivered, p.shows_purchased)}
              />
            )}
            {!!p.over_delivered && (
              <p className="numbers-small-note">
                {p.over_delivered} delivered beyond purchased capacity
              </p>
            )}
            <details className="numbers-help">
              <summary>Pack value & pricing</summary>
              <dl className="numbers-facts">
                <div>
                  <dt>Contracted pack value</dt>
                  <dd>{p.packs_missing_amount ? "—" : money(p.amount_paid_ex_gst)}</dd>
                </div>
                <div>
                  <dt>Value still to deliver</dt>
                  <dd>{p.packs_missing_amount ? "—" : money(p.value_owed)}</dd>
                </div>
                <div>
                  <dt>Average per consultation</dt>
                  <dd>{p.packs_missing_amount ? "—" : moneyOrDash(p.effective_rate)}</dd>
                </div>
              </dl>
              <p>Excludes GST. Contract value, not a bank-payment reconciliation.</p>
            </details>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="numbers-empty">
          <Building2 size={25} />
          <h3>{search ? "No matching firms" : "No packs to show yet"}</h3>
          <p>
            {search
              ? "Try a different name or city."
              : "Purchased packs and delivered consultations will appear here."}
          </p>
          {search && (
            <button className="numbers-button" onClick={() => setSearch("")}>
              Clear search
            </button>
          )}
        </div>
      )}
    </section>
  );
}
