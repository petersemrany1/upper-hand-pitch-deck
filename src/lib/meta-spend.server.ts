// Pulls AD-LEVEL daily spend from the Meta Marketing API and upserts it into
// public.ad_spend_daily. Shared by the nightly webhook and the admin
// "backfill" button on the Numbers page. Server only.

const GRAPH_VERSION = "v21.0";

export function sydneyToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

export function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function locationFromCampaign(campaign: string | null): string | null {
  if (!campaign) return null;
  const cleaned = campaign.replace(/^hair\s+transplant\s+/i, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

type Insight = {
  ad_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  date_start?: string;
};

export class MetaSyncError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

/**
 * Fetch Meta insights for [since, until] (Sydney dates) and write one row per
 * ad per day. Re-pulling a day corrects the figure instead of duplicating it.
 * Records the outcome in ad_spend_sync_state either way.
 */
export async function syncMetaSpend(opts: { since?: string; until?: string } = {}): Promise<{ since: string; until: string; rows: number }> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountIdRaw = process.env.META_AD_ACCOUNT_ID;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const fail = async (message: string, status = 500): Promise<never> => {
    await supabaseAdmin
      .from("ad_spend_sync_state")
      .update({ last_synced_at: new Date().toISOString(), last_status: "error", last_message: message.slice(0, 500) })
      .eq("id", 1);
    throw new MetaSyncError(message, status);
  };

  if (!accessToken || !accountIdRaw) {
    return fail("META_ACCESS_TOKEN or META_AD_ACCOUNT_ID is not configured", 500);
  }

  const today = sydneyToday();
  const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const since = isDate(opts.since) ? opts.since : shiftDays(today, -6);
  const until = isDate(opts.until) ? opts.until : today;

  const accountId = accountIdRaw.startsWith("act_") ? accountIdRaw : `act_${accountIdRaw}`;
  const params = new URLSearchParams({
    level: "ad",
    fields: "ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks",
    // Meta leaves out ads that have since been deleted or archived unless
    // asked. Old campaigns switched off when new ones launched still spent
    // real money, so ask for every status.
    filtering: JSON.stringify([
      {
        field: "ad.effective_status",
        operator: "IN",
        value: [
          "ACTIVE", "PAUSED", "DELETED", "ARCHIVED", "PENDING_REVIEW", "DISAPPROVED",
          "PREAPPROVED", "PENDING_BILLING_INFO", "CAMPAIGN_PAUSED", "ADSET_PAUSED",
          "IN_PROCESS", "WITH_ISSUES",
        ],
      },
    ]),
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
    access_token: accessToken,
  });

  let url: string | null = `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/insights?${params.toString()}`;
  const rows: Insight[] = [];
  let pages = 0;

  try {
    while (url && pages < 60) {
      const res = await fetch(url);
      const payload = (await res.json()) as { data?: Insight[]; paging?: { next?: string }; error?: { message?: string } };
      if (!res.ok || payload.error) {
        return fail(`Meta API error: ${payload.error?.message ?? res.status}`, res.status === 401 || res.status === 403 ? 401 : 502);
      }
      rows.push(...(payload.data ?? []));
      url = payload.paging?.next ?? null;
      pages += 1;
    }
  } catch (e) {
    if (e instanceof MetaSyncError) throw e;
    return fail(`Meta API request failed: ${(e as Error).message}`);
  }

  const upserts = rows
    .filter((r) => r.date_start && r.ad_name)
    .map((r) => ({
      date: r.date_start as string,
      ad_id: r.ad_id ?? null,
      ad_name: r.ad_name as string,
      adset_name: r.adset_name ?? null,
      campaign_name: r.campaign_name ?? null,
      location: locationFromCampaign(r.campaign_name ?? null),
      spend_aud: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      source: "meta",
    }));

  // One read for the whole range, then batched writes: rows Meta already
  // gave us are updated in place, everything else is inserted in one go.
  const existing = await supabaseAdmin
    .from("ad_spend_daily")
    .select("id, date, ad_name")
    .gte("date", since)
    .lte("date", until)
    .limit(10000);
  if (existing.error) return fail(`Read failed: ${existing.error.message}`);
  const byKey = new Map<string, string>();
  for (const r of existing.data ?? []) byKey.set(`${r.date}|${String(r.ad_name).trim().toLowerCase()}`, r.id);

  const toInsert: typeof upserts = [];
  let written = 0;
  for (const row of upserts) {
    const id = byKey.get(`${row.date}|${row.ad_name.trim().toLowerCase()}`);
    if (id) {
      const { error } = await supabaseAdmin.from("ad_spend_daily").update(row).eq("id", id);
      if (error) return fail(`Write failed: ${error.message}`);
      written += 1;
    } else {
      toInsert.push(row);
    }
  }
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200);
    const { error } = await supabaseAdmin.from("ad_spend_daily").insert(chunk);
    if (error) return fail(`Write failed: ${error.message}`);
    written += chunk.length;
  }

  await supabaseAdmin
    .from("ad_spend_sync_state")
    .update({
      last_synced_at: new Date().toISOString(),
      last_status: "ok",
      last_message: `${written} rows for ${since} → ${until}`,
      rows_upserted: written,
    })
    .eq("id", 1);

  return { since, until, rows: written };
}
