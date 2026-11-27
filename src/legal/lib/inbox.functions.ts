// Ported from the Legal app (family-law-floater/src/lib/inbox.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";

import { requireInboxAccess } from "@/legal/lib/portal-access-middleware";

type InboxContext = {
  supabase: import("@supabase/supabase-js").SupabaseClient<
    import("@/legal/integrations/supabase/types").Database
  >;
};

async function inboxAccess(context: InboxContext) {
  const [staff, scope] = await Promise.all([
    context.supabase.rpc("has_sales_role"),
    context.supabase.rpc("is_sales_only_user"),
  ]);
  if (staff.error || staff.data !== true || scope.error || typeof scope.data !== "boolean")
    throw new Error("An active sales profile is required");
  if (scope.data) return { db: context.supabase, restricted: true };
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  return { db: supabaseAdmin, restricted: false };
}

export type InboxMessage = {
  id: string;
  kind: "sms";
  direction: "inbound" | "outbound";
  body: string | null;
  created_at: string;
  delivery_status: string | null;
};

export type InboxCall = {
  id: string;
  kind: "call";
  direction: string | null;
  created_at: string;
  call_status: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: string | null;
};

export type InboxItem = InboxMessage | InboxCall;

export type InboxConversation = {
  leadId: string | null;
  phone: string;
  name: string;
  lastMessageAt: string | null;
  lastBody: string | null;
  lastDirection: "inbound" | "outbound" | null;
};

/** Every SMS conversation across all leads, newest first. */
export const listConversationsFn = createServerFn({ method: "GET" })
  .middleware([requireInboxAccess])
  .handler(async ({ context }) => {
    const { db } = await inboxAccess(context);
    const { data: threads } = await db
      .from("sms_threads")
      .select("id, lead_id, phone, last_message_at")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);

    const rows = threads ?? [];
    const leadIds = [...new Set(rows.map((t) => t.lead_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (leadIds.length) {
      const { data: leads } = await db
        .from("client_leads")
        .select("id, first_name, last_name")
        .in("id", leadIds);
      for (const l of leads ?? []) {
        names.set(l.id, `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Unknown");
      }
    }

    const conversations: InboxConversation[] = [];
    for (const t of rows) {
      const { data: last } = await db
        .from("sms_messages")
        .select("body, direction, created_at")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      conversations.push({
        leadId: t.lead_id,
        phone: t.phone,
        name: (t.lead_id ? names.get(t.lead_id) : null) ?? t.phone,
        lastMessageAt: t.last_message_at ?? last?.created_at ?? null,
        lastBody: last?.body ?? null,
        lastDirection: (last?.direction as "inbound" | "outbound" | undefined) ?? null,
      });
    }
    return conversations;
  });

/** Full text + call history for one lead (or bare phone number), oldest first. */
export const getConversationFn = createServerFn({ method: "POST" })
  .middleware([requireInboxAccess])
  .inputValidator((input: { leadId?: string | null; phone?: string | null }) => ({
    leadId: input?.leadId ?? null,
    phone: input?.phone ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { db } = await inboxAccess(context);
    const { last9 } = await import("./twilio.server");

    const items: InboxItem[] = [];

    let messages: Array<{
      id: string;
      direction: string;
      body: string | null;
      created_at: string;
      delivery_status: string | null;
      phone: string | null;
      lead_id: string | null;
    }> = [];

    if (data.leadId) {
      const { data: byLead } = await db
        .from("sms_messages")
        .select("id, direction, body, created_at, delivery_status, phone, lead_id")
        .eq("lead_id", data.leadId)
        .order("created_at", { ascending: true })
        .limit(500);
      messages = byLead ?? [];
    }

    const tail = last9(data.phone);
    if (tail) {
      const { data: recent } = await db
        .from("sms_messages")
        .select("id, direction, body, created_at, delivery_status, phone, lead_id")
        .order("created_at", { ascending: false })
        .limit(1000);
      for (const m of recent ?? []) {
        if (last9(m.phone) === tail && !messages.some((x) => x.id === m.id)) messages.push(m);
      }
    }

    for (const m of messages) {
      items.push({
        id: m.id,
        kind: "sms",
        direction: m.direction === "inbound" ? "inbound" : "outbound",
        body: m.body,
        created_at: m.created_at,
        delivery_status: m.delivery_status,
      });
    }

    if (data.leadId) {
      const { data: calls } = await db
        .from("call_records")
        .select(
          "id, direction, created_at, call_status, duration_seconds, recording_url, transcript",
        )
        .eq("lead_id", data.leadId)
        .order("created_at", { ascending: true })
        .limit(200);
      for (const c of calls ?? []) items.push({ ...c, kind: "call" });
    }

    items.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return items;
  });

export type CallLogEntry = {
  id: string;
  leadId: string | null;
  name: string;
  phone: string | null;
  direction: string | null;
  created_at: string;
  call_status: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: string | null;
};

/** Every call across all leads, newest first — the calls log. */
export const listCallsFn = createServerFn({ method: "GET" })
  .middleware([requireInboxAccess])
  .handler(async ({ context }) => {
    const { db } = await inboxAccess(context);
    const { data: calls } = await db
      .from("call_records")
      .select(
        "id, lead_id, direction, created_at, call_status, duration_seconds, recording_url, transcript",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    const rows = calls ?? [];
    const leadIds = [...new Set(rows.map((c) => c.lead_id).filter(Boolean))] as string[];
    const leadMap = new Map<string, { name: string; phone: string | null }>();
    if (leadIds.length) {
      const { data: leads } = await db
        .from("client_leads")
        .select("id, first_name, last_name, phone")
        .in("id", leadIds);
      for (const l of leads ?? []) {
        leadMap.set(l.id, {
          name: `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || "Unknown",
          phone: l.phone,
        });
      }
    }

    const entries: CallLogEntry[] = rows.map((c) => {
      const lead = c.lead_id ? leadMap.get(c.lead_id) : null;
      return {
        id: c.id,
        leadId: c.lead_id,
        name: lead?.name ?? "Unknown",
        phone: lead?.phone ?? null,
        direction: c.direction,
        created_at: c.created_at,
        call_status: c.call_status,
        duration_seconds: c.duration_seconds,
        recording_url: c.recording_url,
        transcript: c.transcript,
      };
    });
    return entries;
  });

/** Free-text SMS from the inbox, sent on a rotating pool number. */
export const sendInboxSmsFn = createServerFn({ method: "POST" })
  .middleware([requireInboxAccess])
  .inputValidator((input: { leadId?: string | null; phone: string; body: string }) => {
    if (!input?.phone) throw new Error("A phone number is required");
    if (!input?.body?.trim()) throw new Error("Type a message first");
    if (input.body.length > 1200) throw new Error("Message is too long");
    return { leadId: input.leadId ?? null, phone: input.phone, body: input.body.trim() };
  })
  .handler(async ({ data, context }) => {
    const { db, restricted } = await inboxAccess(context);
    let leadId = data.leadId;
    if (restricted) {
      const { last9 } = await import("./twilio.server");
      const tail = last9(data.phone);
      if (!tail) throw new Error("A valid client phone number is required");
      let query = db.from("client_leads").select("id, phone");
      if (leadId) query = query.eq("id", leadId);
      const { data: leads, error } = await query.limit(1000);
      if (error) throw error;
      const lead = leads?.find((row) => last9(row.phone) === tail);
      if (!lead) throw new Error("You can only text your assigned clients");
      leadId = lead.id;
    }
    const { sendSmsToLead } = await import("./twilio.server");
    const result = await sendSmsToLead(leadId, data.phone, data.body);
    return { ok: result.ok, error: result.error ?? null, from: result.from ?? null };
  });
