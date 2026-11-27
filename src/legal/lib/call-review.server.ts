// Ported from the Legal app (family-law-floater/src/lib/call-review.server.ts). Re-run the port script to refresh.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/legal/integrations/supabase/types";
import type { CallReviewPage } from "./call-review";
import type { SalesCallSummarySource } from "./sales-call-summary.server";
import { twilioEnv } from "./twilio.server";

type Db = SupabaseClient<Database>;
const PAGE_SIZE = 25;

async function requireReviewLead(db: Db, leadId: string) {
  const { data: staff, error: roleError } = await db.rpc("has_sales_role");
  if (roleError || staff !== true) throw new Error("An active sales profile is required");
  const { data: lead, error } = await db
    .from("client_leads")
    .select("id, first_name, last_name, previous_lead_id, call_notes, rep_notes")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error("Could not load this client's call history");
  if (!lead) throw new Error("You do not have access to this client's call history");
  return lead;
}

/** Every lookup uses the caller's RLS client, including linked earlier enquiries. */
async function reviewLeads(db: Db, leadId: string) {
  const lead = await requireReviewLead(db, leadId);
  const leads = [lead];
  const seen = new Set([lead.id]);
  let previousId = lead.previous_lead_id;
  while (previousId && !seen.has(previousId) && leads.length < 20) {
    seen.add(previousId);
    const { data: previous, error } = await db
      .from("client_leads")
      .select("id, first_name, last_name, previous_lead_id, call_notes, rep_notes")
      .eq("id", previousId)
      .maybeSingle();
    if (error) throw new Error("Could not load the previous enquiry. Please retry.");
    if (!previous) break;
    leads.push(previous);
    previousId = previous.previous_lead_id;
  }
  return leads;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function savedAnalysis(value: unknown) {
  const analysis = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const structured =
    analysis["structured"] && typeof analysis["structured"] === "object"
      ? (analysis["structured"] as Record<string, unknown>)
      : {};
  return {
    summary: text(analysis["summary"]),
    nextAction: text(structured["next_action"]),
    outcome: text(structured["call_outcome"]),
    noSaleReasons: Array.isArray(structured["no_sale_reasons"])
      ? structured["no_sale_reasons"].flatMap((reason) => (text(reason) ? [text(reason)!] : []))
      : [],
    followUpDate: text(structured["follow_up_date"]),
    followUpTime: text(structured["follow_up_time"]),
  };
}

/** Authorise every request before reading/generating even a cached sales summary. */
export async function loadSalesCallSummarySource(
  db: Db,
  leadId: string,
  callId: string,
): Promise<SalesCallSummarySource | null> {
  const leads = await reviewLeads(db, leadId);
  const { data: call, error } = await db
    .from("call_records")
    .select("id, lead_id, twilio_call_sid, created_at, transcript")
    .eq("id", callId)
    .in(
      "lead_id",
      leads.map((lead) => lead.id),
    )
    .maybeSingle();
  if (error || !call) throw new Error("This call is not available to your account");
  // The playable row and transcript row can be different callbacks for the
  // same dial. Match only this authorised lead and provider call ID.
  let transcript = text(call.transcript);
  if (call.twilio_call_sid) {
    const { data: duplicates, error: duplicateError } = await db
      .from("call_records")
      .select("transcript")
      .eq("lead_id", call.lead_id!)
      .eq("twilio_call_sid", call.twilio_call_sid)
      .order("created_at", { ascending: false });
    if (duplicateError) throw new Error("Could not load the call transcript. Please retry.");
    transcript = duplicates?.map((row) => text(row.transcript)).find(Boolean) ?? transcript;
  }
  return transcript ? { id: call.id, createdAt: call.created_at, transcript } : null;
}

export async function loadCallReview(
  db: Db,
  leadId: string,
  offset: number,
): Promise<CallReviewPage> {
  const leads = await reviewLeads(db, leadId);
  const { data, error } = await db
    .from("call_records")
    .select(
      "id, lead_id, created_at, direction, call_status, duration_seconds, twilio_call_sid, recording_sid, recording_url, transcript, call_analysis",
    )
    .in(
      "lead_id",
      leads.map((lead) => lead.id),
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  if (error) throw new Error("Could not load previous calls. Please retry.");
  return {
    calls: (data ?? []).slice(0, PAGE_SIZE).map((call) => ({
      id: call.id,
      leadId: call.lead_id!,
      createdAt: call.created_at,
      direction: call.direction,
      status: call.call_status,
      duration: call.duration_seconds,
      callSid: call.twilio_call_sid,
      hasRecording: Boolean(call.recording_sid || call.recording_url),
      transcript: text(call.transcript),
      ...savedAnalysis(call.call_analysis),
    })),
    notes: leads.flatMap((lead) =>
      (["rep_notes", "call_notes"] as const).flatMap((field) => {
        const body = text(lead[field]);
        return body
          ? [
              {
                leadId: lead.id,
                body,
                kind: field === "rep_notes" ? ("rep" as const) : ("legacy" as const),
                previousEnquiry: lead.id !== leadId,
              },
            ]
          : [];
      }),
    ),
    nextOffset: (data?.length ?? 0) > PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
}

/** Filter before paging so unanswered calls never hide an older intake transcript. */
export async function loadClientTranscripts(db: Db, leadId: string, offset: number) {
  const leads = await reviewLeads(db, leadId);
  const { data, error } = await db
    .from("call_records")
    .select("id, lead_id, twilio_call_sid, created_at, transcript")
    .in(
      "lead_id",
      leads.map((lead) => lead.id),
    )
    .not("transcript", "is", null)
    .neq("transcript", "")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  if (error) throw new Error("Could not load client transcripts");
  const client = leads[0]!;
  return {
    name: [client.first_name, client.last_name].filter(Boolean).join(" ") || "Unnamed client",
    calls: (data ?? []).slice(0, PAGE_SIZE).flatMap((row) => {
      const transcript = text(row.transcript);
      return transcript
        ? [
            {
              id: row.id,
              key: row.twilio_call_sid ? row.lead_id + ":" + row.twilio_call_sid : row.id,
              createdAt: row.created_at,
              previousEnquiry: row.lead_id !== leadId,
              transcript,
            },
          ]
        : [];
    }),
    nextOffset: (data?.length ?? 0) > PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
}

/** Build a fixed Twilio URL, never fetch an arbitrary URL supplied by a caller. */
export function recordingMediaUrl(
  accountSid: string,
  recordingSid: string | null,
  recordingUrl: string | null,
): string {
  if (!/^AC[0-9a-f]{32}$/i.test(accountSid)) throw new Error("Recording service is not configured");
  let sid = recordingSid;
  if (!sid && recordingUrl) {
    try {
      const url = new URL(recordingUrl);
      if (
        url.protocol === "https:" &&
        url.hostname === "api.twilio.com" &&
        !url.username &&
        !url.password
      ) {
        sid =
          url.pathname.match(
            new RegExp(
              `^/2010-04-01/Accounts/${accountSid}/Recordings/(RE[0-9a-f]{32})(?:\\.(?:mp3|wav|json))?$`,
              "i",
            ),
          )?.[1] ?? null;
      }
    } catch {
      /* Invalid URLs are never fetched. */
    }
  }
  if (!sid || !/^RE[0-9a-f]{32}$/i.test(sid)) throw new Error("This recording is not available");
  return `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${sid}.mp3`;
}

export async function loadCallRecording(db: Db, leadId: string, callId: string): Promise<Response> {
  const leads = await reviewLeads(db, leadId);
  const { data: call, error } = await db
    .from("call_records")
    .select("id, recording_sid, recording_url")
    .eq("id", callId)
    .in(
      "lead_id",
      leads.map((lead) => lead.id),
    )
    .maybeSingle();
  if (error || !call) throw new Error("This recording is not available to your account");
  const { accountSid, authToken } = twilioEnv();
  const url = recordingMediaUrl(accountSid, call.recording_sid, call.recording_url);
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.body)
    throw new Error("The recording could not be loaded. Please retry.");
  return new Response(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
