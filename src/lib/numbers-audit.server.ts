// Data-quality audit behind the Numbers page. Pulls the raw tables the page
// is built from and checks every join and assumption the figures rely on.
// Server only; admin only (checked by the caller).

type Sev = "ok" | "warn" | "bad" | "info";
export type AuditItem = { label: string; value: string; severity: Sev; detail?: string };
export type AuditSection = { title: string; items: AuditItem[] };
export type AuditReport = { generatedAt: string; sections: AuditSection[] };

type Db = {
  from: (table: string) => {
    select: (cols: string) => {
      order: (col: string, opts?: { ascending?: boolean }) => {
        range: (a: number, b: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
      };
    };
  };
};

async function fetchAll(db: Db, table: string, cols: string, orderBy = "id"): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const page = 1000;
  for (let i = 0; i < 40; i += 1) {
    const { data, error } = await db.from(table).select(cols).order(orderBy, { ascending: true }).range(i * page, i * page + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return out;
}

const KNOWN_CITIES = ["byron bay", "gold coast", "sunshine coast", "central coast", "melbourne", "sydney", "perth", "brisbane", "adelaide", "canberra", "hobart", "darwin", "newcastle", "cairns", "geelong", "wollongong", "townsville"];
const cityOf = (campaign: string | null | undefined): string | null => {
  const c = (campaign ?? "").toLowerCase();
  const hit = KNOWN_CITIES.filter((k) => c.includes(k)).sort((a, b) => b.length - a.length)[0];
  if (hit) return hit;
  const stripped = c.replace(/^hair\s+transplant\s+/i, "").trim();
  return stripped || null;
};
const isTestName = (first: unknown, last: unknown, campaign: unknown) => {
  const f = String(first ?? "").toLowerCase();
  const l = String(last ?? "").toLowerCase();
  const c = String(campaign ?? "").toLowerCase();
  return f === "test" || l === "test" || l.startsWith("test") && f === "peter" || c.startsWith("test");
};
const digits = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-9);
const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");
const sydDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });

export async function runNumbersAudit(db: Db, meta: { accessToken?: string; accountId?: string }): Promise<AuditReport> {
  const [leads, spend, appts, calls, reps, rates, clinics, packs] = await Promise.all([
    fetchAll(db, "meta_leads", "id, created_at, first_name, last_name, phone, status, ad_name, campaign_name, lead_class, rep_id, booking_date, clinic_id", "created_at"),
    fetchAll(db, "ad_spend_daily", "id, date, ad_id, ad_name, campaign_name, location, spend_aud, source", "date"),
    fetchAll(db, "clinic_appointments", "id, lead_id, clinic_id, appointment_date, outcome, patient_name, created_at", "created_at"),
    fetchAll(db, "call_records", "id, lead_id, rep_id, called_at, duration, status", "called_at"),
    fetchAll(db, "sales_reps", "id, name, is_active, role", "name"),
    fetchAll(db, "rep_rates", "id, rep_id, hourly_rate, booking_bonus, effective_from, effective_to", "effective_from"),
    fetchAll(db, "partner_clinics", "id, clinic_name, city, location, price_per_booking", "clinic_name"),
    fetchAll(db, "clinic_packs", "id, clinic_id, pack_size, amount_paid_ex_gst, pack_type, free_shows_included, date_paid", "purchased_at"),
  ]);

  const sections: AuditSection[] = [];
  const S = (n: number) => String(n);

  // ---------------- Leads ----------------
  const testLeads = leads.filter((l) => isTestName(l.first_name, l.last_name, l.campaign_name));
  const real = leads.filter((l) => !isTestName(l.first_name, l.last_name, l.campaign_name));
  const unattributed = real.filter((l) => !String(l.ad_name ?? "").trim() || !String(l.campaign_name ?? "").trim());
  const attributed = real.filter((l) => !unattributed.includes(l));
  const campaignNames = new Map<string, number>();
  for (const l of attributed) campaignNames.set(String(l.campaign_name), (campaignNames.get(String(l.campaign_name)) ?? 0) + 1);
  const unknownCity = Array.from(campaignNames.entries()).filter(([n]) => !KNOWN_CITIES.some((k) => n.toLowerCase().includes(k)));
  const byPhone = new Map<string, number>();
  for (const l of real) { const d = digits(l.phone); if (d.length >= 8) byPhone.set(d, (byPhone.get(d) ?? 0) + 1); }
  const repeatPhones = Array.from(byPhone.values()).filter((n) => n > 1);
  const repeatLeadRows = repeatPhones.reduce((s, n) => s + (n - 1), 0);
  const classes = new Map<string, number>();
  for (const l of real) classes.set(String(l.lead_class ?? "null"), (classes.get(String(l.lead_class ?? "null")) ?? 0) + 1);
  const spendAdNames = new Set(spend.map((s) => String(s.ad_name).trim().toLowerCase()));
  const leadAdNames = new Map<string, number>();
  for (const l of attributed) { const k = String(l.ad_name).trim().toLowerCase(); leadAdNames.set(k, (leadAdNames.get(k) ?? 0) + 1); }
  const leadsNoSpendAd = Array.from(leadAdNames.entries()).filter(([k]) => !spendAdNames.has(k));
  const leadsNoSpendCount = leadsNoSpendAd.reduce((s, [, n]) => s + n, 0);
  const noPhone = real.filter((l) => digits(l.phone).length < 8).length;

  sections.push({
    title: "Leads",
    items: [
      { label: "Leads in the table", value: S(leads.length), severity: "info", detail: `${testLeads.length} test leads excluded from every figure` },
      { label: "Website / untracked (no ad or campaign)", value: `${unattributed.length} (${pct(unattributed.length, real.length)})`, severity: unattributed.length ? "info" : "ok", detail: "Not counted in any city. Their rep time sits in the All-cities total." },
      { label: "Campaign names that don't name a city", value: S(unknownCity.length), severity: unknownCity.length ? "bad" : "ok", detail: unknownCity.slice(0, 6).map(([n, c]) => `${n} (${c})`).join(" · ") || undefined },
      { label: "Repeat enquiries (same phone twice or more)", value: `${repeatLeadRows} extra rows across ${repeatPhones.length} people`, severity: repeatLeadRows > real.length * 0.05 ? "warn" : "info", detail: "Each row counts as a lead, so cost per lead reads a little low." },
      { label: "Leads whose ad has no spend row at all", value: `${leadsNoSpendCount} leads across ${leadsNoSpendAd.length} ad names`, severity: leadsNoSpendCount > real.length * 0.1 ? "bad" : leadsNoSpendCount ? "warn" : "ok", detail: leadsNoSpendAd.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => `${n} (${c})`).join(" · ") || undefined },
      { label: "Leads with no usable phone", value: S(noPhone), severity: noPhone ? "warn" : "ok" },
      { label: "Lead classes", value: Array.from(classes.entries()).map(([k, v]) => `${k}: ${v}`).join(" · "), severity: "info" },
    ],
  });

  // ---------------- Spend ----------------
  const dates = spend.map((s) => String(s.date)).sort();
  const first = dates[0], last = dates[dates.length - 1];
  let gapDays = 0;
  if (first && last) {
    const have = new Set(dates);
    for (let d = new Date(`${first}T00:00:00Z`); d.toISOString().slice(0, 10) <= last; d.setUTCDate(d.getUTCDate() + 1)) {
      if (!have.has(d.toISOString().slice(0, 10))) gapDays += 1;
    }
  }
  const bySource = new Map<string, number>();
  for (const s of spend) bySource.set(String(s.source), (bySource.get(String(s.source)) ?? 0) + 1);
  const dupKeys = new Map<string, number>();
  for (const s of spend) { const k = `${s.date}|${String(s.ad_name).trim().toLowerCase()}`; dupKeys.set(k, (dupKeys.get(k) ?? 0) + 1); }
  const dups = Array.from(dupKeys.values()).filter((n) => n > 1).length;
  const orphanSpendRows = spend.filter((s) => !leadAdNames.has(String(s.ad_name).trim().toLowerCase()));
  const orphanSpend = orphanSpendRows.reduce((t, s) => t + Number(s.spend_aud ?? 0), 0);
  const totalSpend = spend.reduce((t, s) => t + Number(s.spend_aud ?? 0), 0);
  const noLocSpend = spend.filter((s) => !cityOf(String(s.location ?? s.campaign_name ?? ""))).reduce((t, s) => t + Number(s.spend_aud ?? 0), 0);
  let accountMeta = "not checked";
  let accountSev: Sev = "info";
  if (meta.accessToken && meta.accountId) {
    try {
      const id = meta.accountId.startsWith("act_") ? meta.accountId : `act_${meta.accountId}`;
      const r = await fetch(`https://graph.facebook.com/v21.0/${id}?fields=name,timezone_name,currency,account_status&access_token=${meta.accessToken}`);
      const j = (await r.json()) as { name?: string; timezone_name?: string; currency?: string; account_status?: number; error?: { message?: string } };
      if (j.error) { accountMeta = `Meta error: ${j.error.message}`; accountSev = "bad"; }
      else {
        accountMeta = `${j.name ?? "?"} · ${j.timezone_name ?? "?"} · ${j.currency ?? "?"} · status ${j.account_status ?? "?"}`;
        accountSev = j.timezone_name === "Australia/Sydney" && j.currency === "AUD" ? "ok" : "warn";
      }
    } catch (e) { accountMeta = `lookup failed: ${(e as Error).message}`; accountSev = "warn"; }
  }
  sections.push({
    title: "Ad spend",
    items: [
      { label: "Spend rows / total", value: `${spend.length} rows · ${money(totalSpend)}`, severity: "info", detail: `${first ?? "—"} → ${last ?? "—"} · sources: ${Array.from(bySource.entries()).map(([k, v]) => `${k} ${v}`).join(", ")}` },
      { label: "Days with no spend row between first and last", value: S(gapDays), severity: gapDays > 7 ? "warn" : "ok", detail: "Zero-spend days are normal when ads are paused; a long run of gaps means a sync outage." },
      { label: "Same ad recorded twice on one day", value: S(dups), severity: dups ? "bad" : "ok" },
      { label: "Spend on ads that never produced a lead", value: `${money(orphanSpend)} (${pct(orphanSpend, totalSpend)}) across ${new Set(orphanSpendRows.map((s) => String(s.ad_name))).size} ads`, severity: orphanSpend > totalSpend * 0.15 ? "warn" : "info", detail: "Counted in city cost per lead, but shows no lead on the ads table." },
      { label: "Spend with no city", value: money(noLocSpend), severity: noLocSpend > 0 ? "bad" : "ok", detail: "Falls out of every city figure." },
      { label: "Meta ad account", value: accountMeta, severity: accountSev, detail: "The page assumes Sydney time and AUD." },
    ],
  });

  // ---------------- Appointments ----------------
  const leadById = new Map(leads.map((l) => [String(l.id), l]));
  const clinicById = new Map(clinics.map((c) => [String(c.id), c]));
  const apptReal = appts.filter((a) => !String(a.patient_name ?? "").toLowerCase().includes("test"));
  const walkIns = apptReal.filter((a) => !a.lead_id);
  const perLead = new Map<string, number>();
  for (const a of apptReal) if (a.lead_id) perLead.set(String(a.lead_id), (perLead.get(String(a.lead_id)) ?? 0) + 1);
  const multi = Array.from(perLead.values()).filter((n) => n > 1).length;
  const today = sydDate(new Date().toISOString());
  const outcomes = new Map<string, number>();
  let pastNoOutcome = 0, future = 0;
  for (const a of apptReal) {
    const o = a.outcome ? String(a.outcome) : null;
    if (o) outcomes.set(o, (outcomes.get(o) ?? 0) + 1);
    else if (String(a.appointment_date) < today) pastNoOutcome += 1;
    else future += 1;
  }
  const beforeLead = apptReal.filter((a) => a.lead_id && leadById.get(String(a.lead_id)) && String(a.appointment_date) < sydDate(String(leadById.get(String(a.lead_id))!.created_at))).length;
  const apptButNotBookedStatus = apptReal.filter((a) => {
    const l = a.lead_id ? leadById.get(String(a.lead_id)) : null;
    if (!l) return false;
    const s = String(l.status ?? "").toLowerCase();
    return !s.includes("booked") && !s.includes("deposit");
  });
  const cityMismatch = apptReal.filter((a) => {
    const l = a.lead_id ? leadById.get(String(a.lead_id)) : null;
    const c = a.clinic_id ? clinicById.get(String(a.clinic_id)) : null;
    if (!l || !c) return false;
    const lc = cityOf(String(l.campaign_name ?? ""));
    const cc = cityOf(String(c.location ?? c.city ?? ""));
    return !!lc && !!cc && lc !== cc;
  }).length;
  sections.push({
    title: "Appointments",
    items: [
      { label: "Appointments", value: `${apptReal.length} (${appts.length - apptReal.length} test)`, severity: "info", detail: `Outcomes: ${Array.from(outcomes.entries()).map(([k, v]) => `${k} ${v}`).join(", ")} · ${future} upcoming` },
      { label: "Past appointments with no outcome", value: S(pastNoOutcome), severity: pastNoOutcome ? "warn" : "ok", detail: "Counted as booked, not as showed or no-show, so cost per showed reads high." },
      { label: "Walk-ins (appointment with no lead)", value: S(walkIns.length), severity: walkIns.length ? "info" : "ok", detail: "Never in the funnel; revenue for them lands under the clinic only." },
      { label: "Leads with more than one appointment", value: S(multi), severity: multi ? "warn" : "ok", detail: "Funnel uses the earliest; bonuses count each." },
      { label: "Appointment dated before the lead enquired", value: S(beforeLead), severity: beforeLead ? "bad" : "ok", detail: "Data-entry errors." },
      { label: "Booked in the diary but lead status isn't booked", value: S(apptButNotBookedStatus.length), severity: apptButNotBookedStatus.length ? "bad" : "ok", detail: "The dialler can call these people again. " + apptButNotBookedStatus.slice(0, 4).map((a) => String(a.patient_name)).join(", ") },
      { label: "Lead city ≠ clinic city", value: S(cityMismatch), severity: cityMismatch ? "warn" : "ok", detail: "Revenue credits the clinic's city; spend and leads credit the lead's city." },
    ],
  });

  // ---------------- Calls & labour ----------------
  const callsReal = calls.filter((c) => !(c.lead_id && leadById.get(String(c.lead_id)) && isTestName(leadById.get(String(c.lead_id))!.first_name, leadById.get(String(c.lead_id))!.last_name, leadById.get(String(c.lead_id))!.campaign_name)));
  const testCalls = calls.length - callsReal.length;
  const noRep = callsReal.filter((c) => !c.rep_id).length;
  const noLead = callsReal.filter((c) => !c.lead_id).length;
  const nullDur = callsReal.filter((c) => c.duration === null || c.duration === undefined).length;
  const repDay = new Map<string, { first: number; last: number; n: number }>();
  for (const c of callsReal) {
    if (!c.rep_id || !c.called_at) continue;
    const k = `${c.rep_id}|${sydDate(String(c.called_at))}`;
    const t = new Date(String(c.called_at)).getTime();
    const cur = repDay.get(k) ?? { first: t, last: t, n: 0 };
    cur.first = Math.min(cur.first, t); cur.last = Math.max(cur.last, t + Number(c.duration ?? 0) * 1000); cur.n += 1;
    repDay.set(k, cur);
  }
  const longDays = Array.from(repDay.values()).filter((d) => (d.last - d.first) / 3600000 > 10).length;
  const repIdsWithCalls = new Set(callsReal.map((c) => String(c.rep_id)).filter((r) => r && r !== "null"));
  const repsWithRate = new Set(rates.map((r) => String(r.rep_id)));
  const repsNoRate = Array.from(repIdsWithCalls).filter((r) => !repsWithRate.has(r)).map((r) => String(reps.find((x) => String(x.id) === r)?.name ?? r));
  const unknownRepCalls = callsReal.filter((c) => c.rep_id && !reps.some((r) => String(r.id) === String(c.rep_id))).length;
  sections.push({
    title: "Calls and labour",
    items: [
      { label: "Calls", value: `${callsReal.length} (${testCalls} to test leads, excluded once the labour migration is applied)`, severity: testCalls ? "warn" : "info" },
      { label: "Calls with no rep on them", value: `${noRep} (${pct(noRep, callsReal.length)})`, severity: noRep > callsReal.length * 0.05 ? "bad" : noRep ? "warn" : "ok", detail: "Not counted as anyone's hours." },
      { label: "Calls with no lead on them", value: `${noLead} (${pct(noLead, callsReal.length)})`, severity: noLead > callsReal.length * 0.1 ? "warn" : "info", detail: "Counted as hours, but can't be split to a city or ad." },
      { label: "Calls with no duration recorded", value: S(nullDur), severity: nullDur > callsReal.length * 0.1 ? "warn" : "info", detail: "Treated as zero seconds: no talk time, but the day still spans them." },
      { label: "Rep-days spanning more than 10 hours", value: S(longDays), severity: longDays ? "warn" : "ok", detail: "Look right on the Rep hours page if any." },
      { label: "Reps with calls but no pay rate", value: repsNoRate.length ? repsNoRate.join(", ") : "none", severity: repsNoRate.length ? "bad" : "ok" },
      { label: "Calls by a rep id not in the reps table", value: S(unknownRepCalls), severity: unknownRepCalls ? "bad" : "ok" },
    ],
  });

  // ---------------- Clinics, packs, revenue ----------------
  const showsByClinic = new Map<string, number>();
  for (const a of apptReal) if (String(a.outcome ?? "") === "show" && a.clinic_id) showsByClinic.set(String(a.clinic_id), (showsByClinic.get(String(a.clinic_id)) ?? 0) + 1);
  const packsByClinic = new Map<string, Record<string, unknown>[]>();
  for (const p of packs) { const k = String(p.clinic_id); packsByClinic.set(k, [...(packsByClinic.get(k) ?? []), p]); }
  const showsNoPacks = Array.from(showsByClinic.entries()).filter(([c]) => !packsByClinic.has(c));
  const missingAmount = packs.filter((p) => String(p.pack_type) === "paid" && (p.amount_paid_ex_gst === null || p.amount_paid_ex_gst === undefined));
  const over = Array.from(showsByClinic.entries()).filter(([c, n]) => (packsByClinic.get(c) ?? []).reduce((s, p) => s + Number(p.pack_size ?? 0), 0) < n);
  const clinicsNoCity = clinics.filter((c) => !cityOf(String(c.location ?? c.city ?? "")));
  const noDate = packs.filter((p) => !p.date_paid).length;
  sections.push({
    title: "Clinics, packs and revenue",
    items: [
      { label: "Clinics with shows but no pack entered", value: showsNoPacks.length ? showsNoPacks.map(([c, n]) => `${clinicById.get(c)?.clinic_name ?? c} (${n})`).join(" · ") : "none", severity: showsNoPacks.length ? "bad" : "ok", detail: "Those shows earn $0 on the page." },
      { label: "Paid packs with no amount", value: S(missingAmount.length), severity: missingAmount.length ? "bad" : "ok", detail: "Rate per show, revenue and profit are understated for that clinic." },
      { label: "Packs with no date paid", value: S(noDate), severity: noDate ? "warn" : "ok" },
      { label: "Clinics over-delivered (more shows than shows bought)", value: over.length ? over.map(([c]) => String(clinicById.get(c)?.clinic_name ?? c)).join(", ") : "none", severity: over.length ? "warn" : "ok", detail: "Extra shows earn nothing until a new pack is entered." },
      { label: "Clinics with no city", value: clinicsNoCity.length ? clinicsNoCity.map((c) => String(c.clinic_name)).join(", ") : "none", severity: clinicsNoCity.length ? "warn" : "ok", detail: "Their revenue falls back to the lead's city." },
    ],
  });

  return { generatedAt: new Date().toISOString(), sections };
}
