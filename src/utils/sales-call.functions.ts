import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logError } from "./error-logger.functions";

const TWILIO_FROM = "+61468031075";

function formatAUPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("61")) return "+" + cleaned;
  return "+61" + cleaned;
}

/* ───────────────────────── Distance Matrix ───────────────────────── */

export const matchClinicsBySuburb = createServerFn({ method: "POST" })
  .inputValidator((data: { suburb: string }) => ({ suburb: String(data.suburb ?? "").trim() }))
  .handler(async ({ data }) => {
    if (!data.suburb) return { success: false as const, error: "Suburb required", clinics: [] };

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const { data: clinics, error } = await supabaseAdmin
      .from("clinics")
      .select("id, clinic_name, address, city, state, doctor_name, phone, email")
      .order("clinic_name");

    if (error || !clinics) {
      return { success: false as const, error: error?.message ?? "Failed to load clinics", clinics: [] };
    }

    const withAddr = clinics.filter((c) => !!c.address);
    const ranked: Array<{
      id: string; clinic_name: string; address: string | null; doctor_name: string | null;
      drive_minutes: number | null; drive_text: string | null;
    }> = [];

    if (apiKey && withAddr.length > 0) {
      try {
        const origin = encodeURIComponent(`${data.suburb}, Australia`);
        const dests = withAddr.map((c) => encodeURIComponent(`${c.address}`)).join("|");
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dests}&mode=driving&units=metric&key=${apiKey}`;
        const res = await fetch(url);
        const json = await res.json();
        const elements = json?.rows?.[0]?.elements ?? [];
        withAddr.forEach((c, i) => {
          const el = elements[i];
          const mins = el?.duration?.value ? Math.round(el.duration.value / 60) : null;
          ranked.push({
            id: c.id, clinic_name: c.clinic_name, address: c.address, doctor_name: c.doctor_name,
            drive_minutes: mins, drive_text: el?.duration?.text ?? null,
          });
        });
        ranked.sort((a, b) => (a.drive_minutes ?? 9999) - (b.drive_minutes ?? 9999));
      } catch (err) {
        await logError("matchClinicsBySuburb", err instanceof Error ? err.message : "Distance matrix failed", { suburb: data.suburb });
        for (const c of withAddr) ranked.push({ id: c.id, clinic_name: c.clinic_name, address: c.address, doctor_name: c.doctor_name, drive_minutes: null, drive_text: null });
      }
    } else {
      for (const c of clinics) ranked.push({ id: c.id, clinic_name: c.clinic_name, address: c.address, doctor_name: c.doctor_name, drive_minutes: null, drive_text: null });
    }

    return { success: true as const, clinics: ranked };
  });

/* ───────────────────────── Send MMS ───────────────────────── */

export const sendLeadMms = createServerFn({ method: "POST" })
  .inputValidator((data: { leadId: string; mediaUrl: string; body?: string }) => ({
    leadId: String(data.leadId ?? ""),
    mediaUrl: String(data.mediaUrl ?? ""),
    body: data.body ?? "",
  }))
  .handler(async ({ data }) => {
    if (!data.leadId || !data.mediaUrl) return { success: false as const, error: "leadId and mediaUrl required" };

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) return { success: false as const, error: "Twilio credentials not configured" };

    const { data: lead } = await supabaseAdmin
      .from("meta_leads").select("id, phone, first_name").eq("id", data.leadId).single();
    if (!lead?.phone) return { success: false as const, error: "Lead has no phone" };

    const to = formatAUPhone(lead.phone);
    const params = new URLSearchParams();
    params.set("To", to);
    params.set("From", TWILIO_FROM);
    if (data.body) params.set("Body", data.body);
    params.append("MediaUrl", data.mediaUrl);

    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    let twilioResult: { sid?: string; message?: string; status?: string } = {};
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      twilioResult = await res.json();
      if (!res.ok) {
        await logError("sendLeadMms", twilioResult.message || "Twilio MMS failed", { to, raw: twilioResult });
        return { success: false as const, error: twilioResult.message || `Twilio error ${res.status}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      await logError("sendLeadMms", msg, { to });
      return { success: false as const, error: msg };
    }

    // Persist to sms_threads + sms_messages
    let threadId: string | null = null;
    const { data: existing } = await supabaseAdmin.from("sms_threads").select("id").eq("phone", to).maybeSingle();
    if (existing?.id) {
      threadId = existing.id;
    } else {
      const { data: created } = await supabaseAdmin
        .from("sms_threads")
        .insert({ phone: to, display_name: [lead.first_name].filter(Boolean).join(" ") || null })
        .select("id").single();
      threadId = created?.id ?? null;
    }
    if (threadId) {
      await supabaseAdmin.from("sms_messages").insert({
        thread_id: threadId, direction: "outbound",
        body: data.body || null, media_urls: [data.mediaUrl],
        twilio_message_sid: twilioResult.sid ?? null, status: twilioResult.status ?? "queued",
        from_number: TWILIO_FROM, to_number: to,
      });
    }
    return { success: true as const, sid: twilioResult.sid };
  });

/* ───────────────────────── List MMS images ───────────────────────── */

export const listMmsImages = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.storage.from("mms-images").list("", { limit: 100 });
  if (error) return { success: false as const, error: error.message, images: [] };
  const images = (data ?? [])
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => {
      const { data: pub } = supabaseAdmin.storage.from("mms-images").getPublicUrl(f.name);
      return { name: f.name, url: pub.publicUrl };
    });
  return { success: true as const, images };
});

/* ───────────────────────── AI Coach (Claude streaming) ───────────────────────── */

const COACH_SYSTEM = `You are an expert sales coach specialising in NEPQ (Neuro-Emotional Persuasion Questioning) and the following sales framework in this exact order: Mindset → Opening (name, who you are, reference enquiry, pre-empt callback) → Discovery (clinical questions + WHY NOW + echoing) → Amplification (reflect pain back in one sentence, get the yes) → Education (knowledge check, product simply explained, connect to their situation) → Audiobook (paint the picture using their exact words, 2+ specific references, frame as tomorrow without the problem, then silence) → Commitment (open question only, no off-ramps) → Price and Sell (personalise to doctor, price journey in exact order) → Finance Check → Booking. Analyse the following call notes and give direct specific feedback on: 1) Did they follow the framework in order? 2) Did they use the correct opening? 3) Did they find the WHY NOW? 4) Did they amplify correctly by reflecting pain back? 5) Did they paint a genuine audiobook picture using the lead's own words? 6) Did they ask for commitment the right way with no off-ramps? 7) What was the strongest part of this call? 8) What one thing would have changed the outcome most? Be direct. Be specific. Be motivating. No vague feedback. Talk to them like a coach who cares.`;

// Server route handles streaming; this is a simple non-stream wrapper as fallback.
export const analyseCallNotes = createServerFn({ method: "POST" })
  .inputValidator((data: { notes: string }) => ({ notes: String(data.notes ?? "") }))
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { success: false as const, error: "ANTHROPIC_API_KEY not configured" };
    if (!data.notes.trim()) return { success: false as const, error: "Call notes are empty" };

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: COACH_SYSTEM,
          messages: [{ role: "user", content: `Call notes:\n\n${data.notes}` }],
        }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false as const, error: json?.error?.message ?? `Claude error ${res.status}` };
      const text = json?.content?.[0]?.text ?? "";
      return { success: true as const, text };
    } catch (err) {
      return { success: false as const, error: err instanceof Error ? err.message : "Network error" };
    }
  });

/* Generate amplification + audiobook pre-fill from discovery notes */
export const discoveryToAmpAudio = createServerFn({ method: "POST" })
  .inputValidator((data: { notes: string }) => ({ notes: String(data.notes ?? "") }))
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { success: false as const, error: "ANTHROPIC_API_KEY not configured" };
    if (!data.notes.trim()) return { success: false as const, error: "Discovery notes are empty" };

    const system = "You are a sales coach. Based on these discovery notes from a hair transplant sales call, generate two things: 1) An amplification sentence that reflects the lead's pain back to them in one sentence using this format: 'So let me make sure I understand... You've been dealing with [pain] for [timeframe], it's affecting [impacts], and you're tired of [consequences]... is that right?' 2) An audiobook picture moment: one sentence that paints a picture of their life after a successful hair transplant, using specific details from the notes, framed as waking up tomorrow without the problem. Return ONLY valid JSON with no surrounding prose: {\"amplification\": \"...\", \"audiobook\": \"...\"}";

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system,
          messages: [{ role: "user", content: `Discovery notes:\n\n${data.notes}` }],
        }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false as const, error: json?.error?.message ?? `Claude error ${res.status}` };
      const text: string = json?.content?.[0]?.text ?? "";
      // Try to parse JSON; tolerate code fences or stray text by grabbing the first {...} block.
      let parsed: { amplification?: string; audiobook?: string } | null = null;
      try { parsed = JSON.parse(text); } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
      }
      if (!parsed?.amplification || !parsed?.audiobook) {
        return { success: false as const, error: "Could not parse AI response" };
      }
      return { success: true as const, amplification: parsed.amplification, audiobook: parsed.audiobook };
    } catch (err) {
      return { success: false as const, error: err instanceof Error ? err.message : "Network error" };
    }
  });

/* ───────────────────────── Finance check + booking persist ───────────────────────── */

export const saveFinanceCheck = createServerFn({ method: "POST" })
  .inputValidator((data: { leadId: string; eligible: boolean; answers: Record<string, unknown> }) => ({
    leadId: String(data.leadId ?? ""), eligible: !!data.eligible, answers: data.answers ?? {},
  }))
  .handler(async ({ data }) => {
    if (!data.leadId) return { success: false as const, error: "leadId required" };
    const { error } = await supabaseAdmin.from("meta_leads").update({
      finance_eligible: data.eligible,
      finance_form_answers: data.answers as never,
      updated_at: new Date().toISOString(),
    }).eq("id", data.leadId);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

export const saveBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { leadId: string; clinicId: string | null; date: string; time: string }) => ({
    leadId: String(data.leadId ?? ""), clinicId: data.clinicId ?? null,
    date: String(data.date ?? ""), time: String(data.time ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.leadId || !data.date) return { success: false as const, error: "leadId and date required" };
    const { error } = await supabaseAdmin.from("meta_leads").update({
      status: "booked", booking_date: data.date, booking_time: data.time, clinic_id: data.clinicId,
      updated_at: new Date().toISOString(),
    }).eq("id", data.leadId);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

export const clearBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { leadId: string }) => ({ leadId: String(data.leadId ?? "") }))
  .handler(async ({ data }) => {
    if (!data.leadId) return { success: false as const, error: "leadId required" };
    const { error } = await supabaseAdmin.from("meta_leads").update({
      booking_date: null,
      booking_time: null,
      status: "new",
      updated_at: new Date().toISOString(),
    }).eq("id", data.leadId);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { leadId: string; status: string }) => ({
    leadId: String(data.leadId ?? ""), status: String(data.status ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.leadId || !data.status) return { success: false as const, error: "leadId and status required" };
    const { error } = await supabaseAdmin.from("meta_leads")
      .update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.leadId);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

export const saveCallNotes = createServerFn({ method: "POST" })
  .inputValidator((data: { leadId: string; notes: string }) => ({
    leadId: String(data.leadId ?? ""), notes: String(data.notes ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.leadId) return { success: false as const, error: "leadId required" };
    const { error } = await supabaseAdmin.from("meta_leads")
      .update({ call_notes: data.notes, updated_at: new Date().toISOString() }).eq("id", data.leadId);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

export const logCallAttempt = createServerFn({ method: "POST" })
  .inputValidator((data: {
    leadId: string; repId: string | null; outcome: "no_answer" | "connected";
    attemptNumber: number; dialNumber: number; dayNumber: number; timeSlot: string;
    durationSeconds?: number;
  }) => data)
  .handler(async ({ data }) => {
    if (!data.leadId) return { success: false as const, error: "leadId required" };
    const { error } = await supabaseAdmin.from("call_records").insert({
      lead_id: data.leadId, rep_id: data.repId, outcome: data.outcome,
      attempt_number: data.attemptNumber, dial_number: data.dialNumber,
      day_number: data.dayNumber, time_slot: data.timeSlot,
      duration_seconds: data.durationSeconds ?? null,
      status: data.outcome === "connected" ? "completed" : "no-answer",
      direction: "outbound",
    });
    if (error) return { success: false as const, error: error.message };
    if (data.outcome === "connected") {
      await supabaseAdmin.from("meta_leads")
        .update({ status: "contacted", updated_at: new Date().toISOString() }).eq("id", data.leadId);
    }
    return { success: true as const };
  });

/* ───────────────────────── Rep mapping ───────────────────────── */

export const ensureRepForEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; name?: string }) => ({
    email: String(data.email ?? "").toLowerCase().trim(), name: data.name ?? "",
  }))
  .handler(async ({ data }) => {
    if (!data.email) return { success: false as const, error: "email required", rep: null };
    const { data: existing } = await supabaseAdmin.from("sales_reps").select("*").eq("email", data.email).maybeSingle();
    if (existing) return { success: true as const, rep: existing };
    const { data: created, error } = await supabaseAdmin.from("sales_reps")
      .insert({ email: data.email, name: data.name || data.email.split("@")[0] }).select("*").single();
    if (error) return { success: false as const, error: error.message, rep: null };
    return { success: true as const, rep: created };
  });

export const addRep = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string }) => ({
    name: String(data.name ?? "").trim(), email: String(data.email ?? "").toLowerCase().trim(),
  }))
  .handler(async ({ data }) => {
    if (!data.name) return { success: false as const, error: "Name required" };
    const { data: created, error } = await supabaseAdmin.from("sales_reps")
      .insert({ name: data.name, email: data.email || null }).select("*").single();
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, rep: created };
  });

/* Invite a new rep: sends Supabase auth invite email + creates sales_reps row */
export const inviteRep = createServerFn({ method: "POST" })
  .inputValidator((data: { firstName: string; lastName: string; email: string }) => ({
    firstName: String(data.firstName ?? "").trim(),
    lastName: String(data.lastName ?? "").trim(),
    email: String(data.email ?? "").toLowerCase().trim(),
  }))
  .handler(async ({ data }) => {
    if (!data.firstName) return { success: false as const, error: "First name required" };
    if (!data.lastName) return { success: false as const, error: "Last name required" };
    if (!data.email || !data.email.includes("@")) return { success: false as const, error: "Valid email required" };

    const fullName = `${data.firstName} ${data.lastName}`.trim();

    // Check if rep already exists
    const { data: existing } = await supabaseAdmin.from("sales_reps")
      .select("*").eq("email", data.email).maybeSingle();
    if (existing) return { success: false as const, error: "A rep with that email already exists" };

    // Send Supabase auth invite (creates auth.users row + emails magic link)
    const siteUrl = process.env.SITE_URL || "https://upperhanddashboard.lovable.app";
    const { data: invite, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${siteUrl}/reset-password`,
        data: { first_name: data.firstName, last_name: data.lastName, full_name: fullName },
      },
    );
    if (inviteErr) {
      await logError("inviteRep", inviteErr.message, { email: data.email });
      return { success: false as const, error: inviteErr.message };
    }

    // Create the sales_reps row
    const { data: created, error: insertErr } = await supabaseAdmin.from("sales_reps")
      .insert({
        name: fullName,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
      } as never).select("*").single();
    if (insertErr) {
      return { success: false as const, error: insertErr.message };
    }
    return { success: true as const, rep: created, userId: invite.user?.id ?? null };
  });

/* List reps for the team management screen */
export const listReps = createServerFn({ method: "POST" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("sales_reps")
      .select("*").order("created_at", { ascending: true });
    if (error) return { success: false as const, error: error.message, reps: [] };
    return { success: true as const, reps: data ?? [] };
  });

/* Update an existing rep's name fields */
export const updateRep = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; firstName: string; lastName: string }) => ({
    id: String(data.id ?? ""),
    firstName: String(data.firstName ?? "").trim(),
    lastName: String(data.lastName ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    if (!data.id) return { success: false as const, error: "id required" };
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const { data: updated, error } = await supabaseAdmin.from("sales_reps")
      .update({ first_name: data.firstName, last_name: data.lastName, name: fullName } as never)
      .eq("id", data.id).select("*").single();
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, rep: updated };
  });

/* Remove a rep */
export const deleteRep = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data.id ?? "") }))
  .handler(async ({ data }) => {
    if (!data.id) return { success: false as const, error: "id required" };
    const { error } = await supabaseAdmin.from("sales_reps").delete().eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

/* ───────────────────────── Leaderboard ───────────────────────── */

export const getLeaderboard = createServerFn({ method: "POST" })
  .inputValidator((data: { range: "today" | "yesterday" | "today_yesterday" | "week" | "lastweek" | "30d" }) => ({
    range: data.range ?? "today",
  }))
  .handler(async ({ data }) => {
    const now = new Date();
    let from: Date, to: Date;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    switch (data.range) {
      case "yesterday": {
        const y = new Date(now); y.setDate(now.getDate() - 1);
        from = startOfDay(y); to = startOfDay(now); break;
      }
      case "today_yesterday": {
        const y = new Date(now); y.setDate(now.getDate() - 1);
        from = startOfDay(y); to = new Date(now); break;
      }
      case "week": {
        const w = new Date(now); w.setDate(now.getDate() - 7);
        from = startOfDay(w); to = new Date(now); break;
      }
      case "lastweek": {
        const e = new Date(now); e.setDate(now.getDate() - 7);
        const s = new Date(now); s.setDate(now.getDate() - 14);
        from = startOfDay(s); to = startOfDay(e); break;
      }
      case "30d": {
        const w = new Date(now); w.setDate(now.getDate() - 30);
        from = startOfDay(w); to = new Date(now); break;
      }
      default:
        from = startOfDay(now); to = new Date(now);
    }

    // HARD RULE — exclude any lead whose name is "Peter Test" from every leaderboard metric.
    const { data: peterRows } = await supabaseAdmin
      .from("meta_leads")
      .select("id")
      .ilike("first_name", "peter")
      .ilike("last_name", "test");
    const excludedLeadIds = new Set((peterRows ?? []).map((p) => p.id as string));

    const { data: reps } = await supabaseAdmin.from("sales_reps").select("*");
    const { data: calls } = await supabaseAdmin.from("call_records")
      .select("rep_id, lead_id, duration_seconds, outcome, called_at")
      .gte("called_at", from.toISOString()).lte("called_at", to.toISOString());
    // Count bookings as any lead with a booking_date set in the period (covers
    // booked_deposit_paid + callback_scheduled-with-date). updated_at is when
    // the booking was confirmed.
    const { data: bookings } = await supabaseAdmin.from("meta_leads")
      .select("id, rep_id, status, booking_date, updated_at")
      .not("booking_date", "is", null)
      .gte("updated_at", from.toISOString()).lte("updated_at", to.toISOString());

    const byRep = new Map<string, {
      calls: number; attempted: number; connected: number; bookings: number;
      shortCalls: number; convos: number; holds: number; workSeconds: number;
    }>();
    for (const r of reps ?? []) byRep.set(r.id, { calls: 0, attempted: 0, connected: 0, bookings: 0, shortCalls: 0, convos: 0, holds: 0, workSeconds: 0 });

    for (const c of calls ?? []) {
      if (!c.rep_id) continue;
      if (c.lead_id && excludedLeadIds.has(c.lead_id)) continue; // skip Peter Test
      const s = byRep.get(c.rep_id) ?? { calls: 0, attempted: 0, connected: 0, bookings: 0, shortCalls: 0, convos: 0, holds: 0, workSeconds: 0 };
      s.calls += 1;
      s.attempted += 1;
      if (c.outcome === "connected") s.connected += 1;
      const dur = c.duration_seconds ?? 0;
      s.workSeconds += dur;
      if (dur > 0 && dur < 120) s.shortCalls += 1;
      if (dur >= 180) s.convos += 1;
      if (dur >= 300) s.holds += 1;
      byRep.set(c.rep_id, s);
    }
    for (const b of bookings ?? []) {
      if (!b.rep_id) continue;
      if (excludedLeadIds.has(b.id as string)) continue; // skip Peter Test
      const s = byRep.get(b.rep_id) ?? { calls: 0, attempted: 0, connected: 0, bookings: 0, shortCalls: 0, convos: 0, holds: 0, workSeconds: 0 };
      s.bookings += 1;
      byRep.set(b.rep_id, s);
    }

    const rows = (reps ?? []).map((r) => {
      const s = byRep.get(r.id) ?? { calls: 0, attempted: 0, connected: 0, bookings: 0, shortCalls: 0, convos: 0, holds: 0, workSeconds: 0 };
      const conversion = s.connected > 0 ? Math.round((s.bookings / s.connected) * 100) : 0;
      const convosPct = s.calls > 0 ? Math.round((s.convos / s.calls) * 100) : 0;
      return {
        id: r.id, name: r.name, email: r.email,
        calls: s.calls, attempted: s.attempted, connected: s.connected, bookings: s.bookings,
        bonus: s.bookings * 75, shortCalls: s.shortCalls,
        convos: s.convos, holds: s.holds,
        workMinutes: Math.round(s.workSeconds / 60),
        convosPct, conversion,
      };
    }).sort((a, b) => b.bookings - a.bookings || b.connected - a.connected);

    return { success: true as const, rows };
  });

/* ───────────────────────── Find lead by inbound phone ───────────────────────── */

// Strip everything except digits, then keep the last 9 (Australian mobile/landline
// significant digits) so "+61412345678", "0412345678", "412345678" all match.
function phoneTail9(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = String(raw).replace(/[^0-9]/g, "");
  return digits.slice(-9);
}

export const findLeadByPhone = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string }) => ({ phone: String(data.phone ?? "") }))
  .handler(async ({ data }) => {
    const tail = phoneTail9(data.phone);
    if (!tail) return { success: false as const, error: "No phone provided", lead: null };

    // Fast path: ask the DB to find rows whose phone CONTAINS the last 9 digits.
    // This returns in milliseconds vs scanning 2000 rows JS-side.
    const { data: candidates, error } = await supabaseAdmin
      .from("meta_leads")
      .select("id, first_name, last_name, phone, day_number, status, call_notes, callback_scheduled_at, booking_date, booking_time")
      .ilike("phone", `%${tail}%`)
      .limit(10);

    if (error) return { success: false as const, error: error.message, lead: null };

    const match = (candidates ?? []).find((l) => phoneTail9(l.phone) === tail);
    if (!match) return { success: true as const, lead: null };

    // Count attempts for context (run after match found — small query)
    const { count } = await supabaseAdmin
      .from("call_records")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", match.id);

    return {
      success: true as const,
      lead: {
        id: match.id,
        first_name: match.first_name,
        last_name: match.last_name,
        phone: match.phone,
        day_number: match.day_number,
        status: match.status,
        call_notes: match.call_notes,
        callback_scheduled_at: match.callback_scheduled_at,
        booking_date: match.booking_date,
        booking_time: match.booking_time,
        attempt_count: count ?? 0,
      },
    };
  });
