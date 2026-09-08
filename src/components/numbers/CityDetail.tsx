import { Fragment } from "react";
import type { LabourRow } from "@/lib/ad-spend.functions";
import { type CityStats, type Diagnosis, compareToAvg, labourSentence, oneIn } from "./model";
import { CARD, FAINT, GREEN, INK, LABEL, MUTED, RED, TONE, money, moneyOrDash, oneDp, pctOrDash } from "./format";
import { Delta, Dot, SplitBar } from "./primitives";

/**
 * The selected city on one screen: verdict → funnel → marketing vs labour.
 * Every figure carries a chip against the account average, so the problem
 * shows up as colour before the number is read.
 */
export function CityDetail({
  scope,
  avg,
  isAll,
  diagnosis,
  unallocated,
  countMyPay,
}: {
  scope: CityStats;
  avg: CityStats;
  isAll: boolean;
  diagnosis: Diagnosis | null;
  unallocated: LabourRow | null;
  countMyPay: boolean;
}) {
  const s = scope;
  const bm = (value: number | null, a: number | null, lowerIsBetter: boolean) => compareToAvg(value, a, lowerIsBetter);
  const unallocCost = unallocated ? unallocated.hourly_cost + unallocated.bonus_cost : 0;
  const sentence = labourSentence(s, avg, s.key, isAll, { oneDp });
  const caveats: string[] = [];
  if (!countMyPay) caveats.push("Your own pay is excluded from labour.");
  if (isAll && unallocated && unallocCost > 0) caveats.push(`Includes ${money(unallocCost)} of labour (${oneDp(unallocated.hours)} h) on website and untracked leads, which have no city.`);
  if (s.hoursMissingRate > 0) caveats.push(`${oneDp(s.hoursMissingRate)} hours are from a rep with no rate set, so labour is understated.`);
  if (s.hoursFallback > 0) caveats.push(`${oneDp(s.hoursFallback)} hours were split by leads contacted rather than call time.`);
  if (s.bonusMissingRate > 0) caveats.push(`${s.bonusMissingRate} bookings have no bonus rate set.`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Verdict */}
      <div style={{ ...CARD, padding: "18px 22px", borderLeft: `4px solid ${TONE[diagnosis?.tone ?? "grey"].dot}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: INK, letterSpacing: -0.3 }}>
            {isAll ? "All cities" : diagnosis?.headline ?? s.key}
          </h2>
          {isAll && (
            <span style={{ fontSize: 12.5, color: MUTED }}>The account average. Pick a city on the left to see what it's struggling with.</span>
          )}
        </div>
        {!isAll && diagnosis && diagnosis.signals.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginTop: 14 }}>
            {diagnosis.signals.map((sig) => (
              <div key={sig.key} style={{ display: "grid", gridTemplateColumns: "10px 1fr", columnGap: 10, alignItems: "start", padding: "10px 12px", borderRadius: 10, background: sig.bad ? TONE[sig.tone].bg : "#faf9f7" }}>
                <Dot tone={sig.tone} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <span style={LABEL}>{sig.title}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: sig.bad ? TONE[sig.tone].text : INK, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{sig.value}</span>
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{sig.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Funnel */}
      <div style={{ ...CARD, padding: 0 }}>
        <div style={{ padding: "14px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>What do leads cost?</div>
          <div style={{ fontSize: 12, color: MUTED }}>{money(s.spend)} ad spend in this range</div>
        </div>
        <div className="numbers-funnel" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", alignItems: "stretch", padding: "12px 22px 18px", columnGap: 8 }}>
          <Stage
            label="Leads"
            count={s.leads}
            cost={s.costPerLead}
            costLabel="per lead"
            delta={bm(s.costPerLead, avg.costPerLead, true)}
            hideDelta={isAll}
            foot={`${s.disqualified} disqualified`}
          />
          <Arrow
            rate={s.bookRate}
            line1={`${pctOrDash(s.bookRate)} book`}
            line2={oneIn(s.bookRate)}
            delta={bm(s.bookRate, avg.bookRate, false)}
            hideDelta={isAll}
          />
          <Stage
            label="Booked"
            count={s.booked}
            cost={s.costPerBooked}
            costLabel="per booked"
            delta={bm(s.costPerBooked, avg.costPerBooked, true)}
            hideDelta={isAll}
            foot={`${s.upcoming} upcoming · ${s.needsOutcome} need outcome`}
            footWarn={s.needsOutcome > 0}
          />
          <Arrow
            rate={s.showRate}
            line1={`${pctOrDash(s.showRate)} show`}
            line2={`${s.noshow} no-show`}
            delta={bm(s.showRate, avg.showRate, false)}
            hideDelta={isAll}
          />
          <Stage
            label="Showed"
            count={s.showed}
            cost={s.trueCostPerShow ?? s.adCostPerShow}
            costLabel="per show"
            breakdown={[
              ["Marketing", moneyOrDash(s.adCostPerShow)],
              ["Labour", s.hoursOk ? moneyOrDash(s.labourPerShow) : "not costed"],
              ["Total per show", moneyOrDash(s.trueCostPerShow ?? s.adCostPerShow)],
            ]}
            delta={bm(s.trueCostPerShow ?? s.adCostPerShow, avg.trueCostPerShow ?? avg.adCostPerShow, true)}
            hideDelta={isAll}
            foot="ads + rep pay, per showed appointment"
            strong
          />
        </div>
      </div>

      {/* Marketing vs labour */}
      <div style={{ ...CARD, padding: "14px 22px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>Marketing vs labour</div>
          <div style={{ fontSize: 12.5, color: MUTED }}>
            {s.hoursOk ? (
              <>
                Cost <b style={{ color: INK }}>{money(s.totalCost)}</b>
                {s.revenue > 0 && (
                  <>
                    {" · "}Revenue <b style={{ color: INK }}>{money(s.revenue)}</b>
                    {" · "}Profit <b style={{ color: s.profit >= 0 ? GREEN : RED }}>{s.profit >= 0 ? "+" : ""}{money(s.profit)}</b>
                  </>
                )}
              </>
            ) : "labour hours could not be calculated"}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <SplitBar share={s.hoursOk ? s.marketingShare : null} height={10} title="Black is ad spend, tan is rep pay and bonuses." />
        </div>

        <div className="numbers-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
          <Side
            title="Marketing"
            share={s.marketingShare}
            big={s.spend ? money(s.spend) : "—"}
            sub={s.leads ? `${s.leads} leads from ads · ${moneyOrDash(s.costPerLead)} each` : "no leads from ads"}
            dotColor={INK}
          />
          <Side
            title="Labour"
            share={s.marketingShare === null ? null : 1 - s.marketingShare}
            big={s.hoursOk ? money(s.labourCost) : "—"}
            sub={s.hoursOk ? `${oneDp(s.hours)} hours of calling · ${s.booked} booking${s.booked === 1 ? "" : "s"}` : "hours not available"}
            dotColor="#d8c6a8"
          />
        </div>

        {sentence && (
          <div style={{ marginTop: 16, padding: "11px 14px", borderRadius: 10, background: TONE[sentence.tone].bg, fontSize: 13.5, color: INK, lineHeight: 1.45 }}>
            <b style={{ color: TONE[sentence.tone].text }}>{sentence.headline}</b> {sentence.detail}
          </div>
        )}

        {(caveats.length > 0) && (
          <div style={{ fontSize: 11.5, color: FAINT, marginTop: 10, lineHeight: 1.5 }}>{caveats.join(" ")}</div>
        )}
      </div>
    </div>
  );
}

function Stage({
  label, count, cost, costLabel, breakdown, delta, hideDelta, foot, footWarn, strong,
}: {
  label: string; count: number; cost: number | null; costLabel: string;
  /** Optional per-unit breakdown shown instead of the single cost line; the last row is the total. */
  breakdown?: [string, string][];
  delta: ReturnType<typeof compareToAvg>; hideDelta: boolean; foot: string; footWarn?: boolean; strong?: boolean;
}) {
  return (
    <div style={{ padding: "8px 0", minWidth: 0 }}>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 600, color: INK, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{count}</div>
      {breakdown ? (
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 12, rowGap: 2, fontSize: 12.5, maxWidth: 220 }}>
          {breakdown.map(([k, v], i) => {
            const total = i === breakdown.length - 1;
            return (
              <Fragment key={k}>
                <span style={{ color: total ? INK : MUTED, fontWeight: total ? 700 : 400, borderTop: total ? "1px solid #e6e6e4" : undefined, paddingTop: total ? 3 : 0 }}>{k}</span>
                <span style={{ color: INK, fontWeight: total ? 700 : 500, textAlign: "right", fontVariantNumeric: "tabular-nums", borderTop: total ? "1px solid #e6e6e4" : undefined, paddingTop: total ? 3 : 0 }}>{v}</span>
              </Fragment>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 13, color: INK, fontWeight: strong ? 700 : 500, whiteSpace: "nowrap" }}>
          {moneyOrDash(cost)} <span style={{ color: MUTED, fontWeight: 400 }}>{costLabel}</span>
        </div>
      )}
      {!hideDelta && delta.ratio !== null && (
        <div style={{ marginTop: 4, marginLeft: -8 }}><Delta b={delta} /></div>
      )}
      <div style={{ fontSize: 11.5, color: footWarn ? "#8a5a2b" : FAINT, marginTop: 4 }}>{foot}</div>
    </div>
  );
}

function Arrow({ rate, line1, line2, delta, hideDelta }: { rate: number | null; line1: string; line2: string; delta: ReturnType<typeof compareToAvg>; hideDelta: boolean }) {
  const pct = rate === null ? 0 : Math.max(0, Math.min(1, rate)) * 100;
  return (
    <div className="numbers-arrow" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 14px", width: 128 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{line1}</div>
      <div style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>{line2}</div>
      <div style={{ width: "100%", height: 6, background: "#ececea", borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: INK }} />
      </div>
      <div style={{ marginTop: 4, marginLeft: -8 }}><Delta b={delta} hide={hideDelta} /></div>
    </div>
  );
}

function Side({ title, share, big, sub, dotColor }: { title: string; share: number | null; big: string; sub: string; dotColor: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...LABEL, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: dotColor, flexShrink: 0 }} />
        {title}{share !== null ? ` · ${Math.round(share * 100)}%` : ""}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: INK, letterSpacing: -0.6, lineHeight: 1.1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{big}</div>
      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>{sub}</div>
    </div>
  );
}
