// Ported from the Legal app (family-law-floater/src/lib/transcript-export.server.ts). Re-run the port script to refresh.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/legal/integrations/supabase/types";

type Client = SupabaseClient<Database>;

function fromPayload(payload: unknown, keys: string[]): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export async function buildTranscriptExport(
  supabase: Client,
): Promise<{ ok: true; text: string; count: number } | { ok: false; error: string }> {
  const { data: calls, error } = await supabase
    .from("call_records")
    .select("id, lead_id, transcript, duration_seconds, created_at")
    .gt("duration_seconds", 120)
    .not("transcript", "is", null)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };

  const rows = (calls ?? []).filter((r) => (r.transcript ?? "").trim());
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter((v): v is string => Boolean(v)))];

  const leads = new Map<string, Record<string, unknown>>();
  if (leadIds.length) {
    const { data, error: leadError } = await supabase
      .from("client_leads")
      .select("id, first_name, last_name, phone, campaign_name, ad_set_name, ad_name, raw_payload")
      .in("id", leadIds);
    if (leadError) return { ok: false, error: leadError.message };
    for (const lead of data ?? []) leads.set(lead.id, lead as Record<string, unknown>);
  }

  const blocks = rows.map((call) => {
    const lead = (call.lead_id ? leads.get(call.lead_id) : undefined) ?? {};
    const payload = lead["raw_payload"];
    const name = [lead["first_name"], lead["last_name"]]
      .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
      .join(" ");
    const campaign =
      (lead["campaign_name"] as string | null) || fromPayload(payload, ["campaign_name", "campaign"]);
    const adset =
      (lead["ad_set_name"] as string | null) ||
      fromPayload(payload, ["ad_set_name", "adset_name", "adset"]);
    const ad = (lead["ad_name"] as string | null) || fromPayload(payload, ["ad_name", "ad"]);

    void campaign;
    void adset;
    return [
      `--- ${name || "Unknown"} | ${fmtDate(call.created_at)} | ${fmtDuration(call.duration_seconds)} | ad: ${ad || "unknown"} ---`,
      call.transcript ?? "",
    ].join("\n");
  });

  return { ok: true, text: `${blocks.join("\n\n")}\n`, count: rows.length };
}

export async function listTranscriptCalls(
  supabase: Client,
): Promise<{ ok: true; calls: { id: string; label: string }[] } | { ok: false; error: string }> {
  const { data: calls, error } = await supabase
    .from("call_records")
    .select("id, lead_id, transcript, duration_seconds, created_at")
    .gt("duration_seconds", 120)
    .not("transcript", "is", null)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };

  const rows = (calls ?? []).filter((r) => (r.transcript ?? "").trim());
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (leadIds.length) {
    const { data, error: leadError } = await supabase
      .from("client_leads")
      .select("id, first_name, last_name")
      .in("id", leadIds);
    if (leadError) return { ok: false, error: leadError.message };
    for (const lead of data ?? []) {
      names.set(
        lead.id,
        [lead.first_name, lead.last_name].filter((v) => v && v.trim()).join(" ") || "Unknown",
      );
    }
  }

  return {
    ok: true,
    calls: rows.map((call) => ({
      id: call.id,
      label: `${(call.lead_id && names.get(call.lead_id)) || "Unknown"} — ${fmtDate(call.created_at)} — ${fmtDuration(call.duration_seconds)}`,
    })),
  };
}

export async function buildSingleTranscript(
  supabase: Client,
  callId: string,
): Promise<{ ok: true; text: string; name: string } | { ok: false; error: string }> {
  const { data: call, error } = await supabase
    .from("call_records")
    .select("id, lead_id, transcript, duration_seconds, created_at")
    .eq("id", callId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!call) return { ok: false, error: "Call not found" };

  let lead: Record<string, unknown> = {};
  if (call.lead_id) {
    const { data, error: leadError } = await supabase
      .from("client_leads")
      .select("id, first_name, last_name, phone, campaign_name, ad_set_name, ad_name, raw_payload")
      .eq("id", call.lead_id)
      .maybeSingle();
    if (leadError) return { ok: false, error: leadError.message };
    lead = (data ?? {}) as Record<string, unknown>;
  }

  const payload = lead["raw_payload"];
  const name =
    [lead["first_name"], lead["last_name"]]
      .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
      .join(" ") || "Unknown";
  const campaign =
    (lead["campaign_name"] as string | null) || fromPayload(payload, ["campaign_name", "campaign"]);
  const adset =
    (lead["ad_set_name"] as string | null) ||
    fromPayload(payload, ["ad_set_name", "adset_name", "adset"]);
  const ad = (lead["ad_name"] as string | null) || fromPayload(payload, ["ad_name", "ad"]);

  const text = [
    "=====",
    `Name: ${name}`,
    `Phone: ${(lead["phone"] as string | null) ?? ""}`,
    `Date: ${fmtDate(call.created_at)}`,
    `Duration: ${fmtDuration(call.duration_seconds)}`,
    `Campaign name: ${campaign ?? ""}`,
    `Adset name: ${adset ?? ""}`,
    `Ad name: ${ad ?? ""}`,
    "FULL TRANSCRIPT:",
    call.transcript ?? "",
    "=====",
  ].join("\n");

  return { ok: true, text: `${text}\n`, name };
}
