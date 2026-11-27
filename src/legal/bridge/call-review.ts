/**
 * Portal bridge for the Legal app's call-review server functions used by the
 * Transcripts page. The Legal server already runs these with the caller's own
 * sign-in (row-level security), so they run here with your Legal login.
 */
import { z } from "zod";
import { supabase } from "@/legal/integrations/supabase/client";

type Db = typeof supabase;
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


/** Same shape as the Legal app's getClientTranscriptsFn server function. */
export async function getClientTranscriptsFn({ data }: { data: { leadId: string; offset: number } }) {
  const input = z.object({ leadId: z.string().uuid(), offset: z.number().int().nonnegative() }).parse(data);
  return loadClientTranscripts(supabase, input.leadId, input.offset);
}

// The rest of the Legal call-review functions run on the moved Legal engine
// (portal database); only the Transcripts list above still reads the Legal app.
export { getCallReviewFn, getCallRecordingFn, getSalesCallSummaryFn } from "@/legal/lib/call-review.functions";
