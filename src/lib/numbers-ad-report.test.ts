import { describe, expect, test } from "bun:test";
import { groupAdActivity, partialSpendDays } from "./numbers-ad-report.server";
import { dailySpendKey } from "./numbers-ad-identity";
import { buildAdStats } from "../components/numbers/model";

type Spend = Parameters<typeof groupAdActivity>[0][number];
type Lead = Parameters<typeof groupAdActivity>[1][number];
const base = { ad_name: "Example ad", campaign_name: "Example campaign Melbourne", location: "Melbourne" };
const spend = (s: Partial<Spend> = {}): Spend => ({
  ...base, ad_id: "101", adset_name: "City | Original", date: "2026-11-15", source: "make",
  spend_aud: 55, impressions: 1000, clicks: 10, ...s,
});
const explainer = spend({ ad_id: "202", adset_name: "City | Video", spend_aud: 19 });
const lead = (id: string, s: Partial<Lead> = {}): Lead => ({
  ...base, adset_name: null, ad_id: null, lead_id: id, created_at: "2026-11-15T00:00:00Z", status: null,
  unattributed: false, is_booked: false, is_showed: false, is_noshow: false,
  is_upcoming: false, needs_outcome: false, is_disqualified: false, ...s,
});

describe("ad identities in Numbers", () => {
  test("same campaign and display name: split spend, outcomes, calls and drilldowns; never guess an ambiguous lead", () => {
    const { ads, members, spendDuplicates } = groupAdActivity([spend(), explainer], [
      lead("a", { ad_id: "101", is_booked: true, is_showed: true }),
      lead("b", { adset_name: " CITY | video " }), lead("c"),
    ], {});
    expect(ads.map(r => [r.ad_id, r.spend, r.leads, r.showed])).toEqual([
      ["101", 55, 1, 1], ["202", 19, 1, 0], [null, 0, 1, 0],
    ]);
    expect(ads[2].name_collision).toBe(true);
    expect(ads.map(r => members.get(r.ad_key!)!.map(l => l.lead_id))).toEqual([["a"], ["b"], ["c"]]);
    const { rows } = buildAdStats(ads, { "id:202": { total: 1, toCall: 1, chasing: 0, spoke: 0, booked: 0 } });
    expect(rows[2].verdict.label).toBe("Unassigned");
    expect(rows.map(r => r.pipeline?.toCall ?? null)).toEqual([null, 1, null]);
    expect(spendDuplicates).toBe(0);
  });
  test("different IDs remain separate even in the same ad set; a rename keeps one ID", () => {
    const { ads } = groupAdActivity([spend(), spend({ ad_id: "303" }), spend({ date: "2026-11-16", ad_name: "Renamed" })], [
      lead("exact", { ad_id: "303", ad_name: "Renamed" }), lead("unclear", { adset_name: "City | Original" }),
    ], {});
    expect(ads.map(r => [r.ad_id, r.ad_name, r.spend, r.leads])).toEqual([
      ["101", "Renamed", 110, 0], ["303", base.ad_name, 55, 1], [null, base.ad_name, 0, 1],
    ]);
  });
  test("a historical sibling outside the window still prevents a false name-only match", () => {
    const { ads } = groupAdActivity([spend({ date: "2026-11-01" }), explainer,
      spend({ location: "Sydney", campaign_name: "Hair Transplant Sydney" })],
      [lead("unknown"), lead("exact", { ad_id: "202" })], { from: "2026-11-15", city: "Melbourne" });
    expect(ads.map(r => [r.ad_id, r.spend, r.leads])).toEqual([["202", 19, 1], [null, 0, 1]]);
  });
  test("a single unique legacy match remains usable; spend-only ads and website leads are retained", () => {
    const { ads } = groupAdActivity([spend(), spend({ ad_name: "Other", ad_id: "303" })],
      [lead("legacy"), lead("web", { ad_name: null, unattributed: true })], {});
    expect(ads.map(r => [r.ad_key, r.leads])).toEqual([["id:101", 1], ["id:303", 0], ["website", 1]]);
  });
  test("manual overlap warns once per date; repeated imports key on ID, never the shared name", () => {
    expect(groupAdActivity([spend(), explainer, spend({ source: "manual", ad_id: null })], [], {}).spendDuplicates).toBe(1);
    expect(groupAdActivity([spend(), explainer, spend({ source: "manual", ad_id: "other" })], [], {}).spendDuplicates).toBe(0);
    expect(dailySpendKey(spend())).not.toEqual(dailySpendKey(explainer));
    expect(dailySpendKey(spend())).toEqual(dailySpendKey(spend({ ad_name: "Renamed" })));
  });
});

test("read the second spend page and prefer the nested webhook ID over a conflicting ad set", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { readAdActivity } = await import("./numbers-ad-report.server");
  type Database = import("@/integrations/supabase/types").Database;
  const seen: URL[] = [];
  const client = createClient<Database>("https://example.test", "test-key", {
    global: { fetch: async input => {
      const url = new URL(String(input)); seen.push(url);
      const table = url.pathname.split("/").at(-1);
      let records: unknown[];
      if (table === "ad_spend_daily") {
        records = url.searchParams.get("offset") === "500" ? [explainer] :
          Array.from({ length: 500 }, (_, i) => spend({ date: "2026-10-01", ad_id: String(1000 + i), ad_name: "Historical" }));
      } else if (table === "ad_lead_outcomes") {
        records = [lead("l1", { adset_name: "Old label" })];
      } else if (table === "meta_leads") {
        records = [{ id: "l1", snake: null, camel: null, nested: "202", nested_camel: null }];
      } else throw new Error("Unexpected table: " + table);
      return Response.json(records);
    } },
  });
  const result = await readAdActivity(client, { from: "2026-11-15", to: "2026-11-15", city: "Melbourne",
    start: "2026-11-15T00:00:00+11:00", endExclusive: "2026-11-16T00:00:00+11:00" });
  expect(result.ads.map(r => [r.ad_id, r.spend, r.leads])).toEqual([["202", 19, 1]]);
  const outcomes = seen.find(u => u.pathname.endsWith("/ad_lead_outcomes"))!.searchParams;
  expect(outcomes.get("location")).toBe("eq.Melbourne");
  expect(outcomes.getAll("created_at")).toEqual(["gte.2026-11-15T00:00:00+11:00", "lt.2026-11-16T00:00:00+11:00"]);
  expect(seen.find(u => u.pathname.endsWith("/meta_leads"))!.searchParams.get("select")).toContain("nested:raw_payload->raw_payload->>ad_id");
});

describe("part-day spend", () => {
  // The 3am push writes "today" with only a few hours of spend; it is final
  // once a later push (after that Sydney day ended) has rewritten it.
  test("a day last written on that same Sydney day is partial; a later rewrite makes it final", () => {
    expect(partialSpendDays([
      { date: "2026-11-27", updated_at: "2026-11-27T16:01:09Z" }, // 28 Nov 3:01am Sydney
      { date: "2026-11-28", updated_at: "2026-11-27T16:01:13Z" }, // 28 Nov 3:01am Sydney
      { date: "2026-11-28", updated_at: "2026-11-27T16:01:21Z" },
    ])).toEqual(["2026-11-28"]);
  });
  test("Sydney date, not UTC: 11pm UTC on the 27th is already the 28th in Sydney", () => {
    expect(partialSpendDays([{ date: "2026-11-27", updated_at: "2026-11-27T23:00:00Z" }])).toEqual([]);
    expect(partialSpendDays([{ date: "2026-11-28", updated_at: "2026-11-27T23:00:00Z" }])).toEqual(["2026-11-28"]);
  });
  test("rows without a write time are never flagged; groupAdActivity reports only days in the window", () => {
    expect(partialSpendDays([{ date: "2026-11-28" }])).toEqual([]);
    const rows = [spend({ date: "2026-11-15", updated_at: "2026-11-15T02:00:00Z" }), spend({ date: "2026-11-20", ad_id: "9", updated_at: "2026-11-19T20:00:00Z" })];
    expect(groupAdActivity(rows, [], { from: "2026-11-16", to: "2026-11-30" }).spendPartialDays).toEqual(["2026-11-20"]);
  });
});
