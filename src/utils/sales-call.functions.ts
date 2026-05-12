import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logError } from "./error-logger.functions";

// Gate helper: ensures the calling user is an admin in sales_reps.
// Uses email matching (case-insensitive).
async function assertAdmin(userId: string): Promise<string> {
  const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !u?.user?.email) throw new Error("Could not verify caller");
  const email = u.user.email;
  const { data: rep } = await supabaseAdmin
    .from("sales_reps")
    .select("role")
    .ilike("email", email)
    .maybeSingle();
  if (rep?.role !== "admin") throw new Error("Forbidden: admin only");
  return email;
}

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

    // Mirror into clinic_appointments immediately so the slot is reserved
    // in the clinic portal availability view (and prevents double-booking
    // by other reps). Intel notes are NOT written here — they are snapshotted
    // only when the handover email is sent.
    if (data.clinicId) {
      const { data: leadRow } = await supabaseAdmin
        .from("meta_leads")
        .select("first_name, last_name, phone")
        .eq("id", data.leadId)
        .maybeSingle();
      const patientName = `${leadRow?.first_name ?? ""} ${leadRow?.last_name ?? ""}`.trim() || "Patient";
      const { data: existing } = await supabaseAdmin
        .from("clinic_appointments")
        .select("id")
        .eq("lead_id", data.leadId)
        .limit(1);
      const payload = {
        clinic_id: data.clinicId,
        lead_id: data.leadId,
        patient_name: patientName,
        patient_phone: leadRow?.phone ?? null,
        appointment_date: data.date,
        appointment_time: data.time,
      };
      if (existing && existing.length > 0) {
        await supabaseAdmin.from("clinic_appointments").update(payload).eq("id", existing[0].id);
      } else {
        await supabaseAdmin.from("clinic_appointments").insert({ ...payload, intel_notes: null });
      }
    }
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
    // Free the slot in the clinic portal availability view.
    await supabaseAdmin.from("clinic_appointments").delete().eq("lead_id", data.leadId);
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

// Reference implementation for the "correct" call_records insert pattern.
// Currently unused at runtime — the live outbound flow goes through the
// browser Twilio SDK (useTwilioDevice.ts -> insertCallRow) and the
// voice-outbound edge function, both of which now mirror the lead_id +
// rep_id pattern below. Keep this in sync with those writers.
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
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firstName: string; lastName: string; email: string }) => ({
    firstName: String(data.firstName ?? "").trim(),
    lastName: String(data.lastName ?? "").trim(),
    email: String(data.email ?? "").toLowerCase().trim(),
  }))
  .handler(async ({ data, context }) => {
    try { await assertAdmin(context.userId); } catch (e) {
      return { success: false as const, error: (e as Error).message };
    }
    if (!data.firstName) return { success: false as const, error: "First name required" };
    if (!data.lastName) return { success: false as const, error: "Last name required" };
    if (!data.email || !data.email.includes("@")) return { success: false as const, error: "Valid email required" };

    const fullName = `${data.firstName} ${data.lastName}`.trim();

    const { data: existing } = await supabaseAdmin.from("sales_reps")
      .select("*").ilike("email", data.email).maybeSingle();
    if (existing) return { success: false as const, error: "A rep with that email already exists" };

    const siteUrl = process.env.SITE_URL || "https://upperhanddashboard.lovable.app";

    const resendKey = process.env.RESEND_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!resendKey || !lovableKey) {
      return { success: false as const, error: "Email service not configured (missing RESEND_API_KEY or LOVABLE_API_KEY)" };
    }

    // Helper: roll back the auth user we created if a later step fails, so the
    // invite can be retried without "user already exists" errors.
    const rollbackAuthUser = async (userId: string | undefined) => {
      if (!userId) return;
      try { await supabaseAdmin.auth.admin.deleteUser(userId); } catch (e) {
        await logError("inviteRep.rollback", (e as Error).message, { email: data.email, userId });
      }
    };

    // 1. Create the auth user (no email sent by Supabase).
    const { data: createdUser, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: { first_name: data.firstName, last_name: data.lastName, full_name: fullName },
    });
    if (createUserErr) {
      await logError("inviteRep", createUserErr.message, { email: data.email });
      return { success: false as const, error: createUserErr.message };
    }
    const newUserId = createdUser.user?.id;

    // 2. Generate the password-set link.
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (linkErr || !linkData.properties?.action_link) {
      await rollbackAuthUser(newUserId);
      const msg = linkErr?.message || "Failed to generate invite link";
      await logError("inviteRep", msg, { email: data.email });
      return { success: false as const, error: msg };
    }
    const actionLink = linkData.properties.action_link;

    // 3. Send branded invite email through the same verified sender domain used by the working email system.
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 12px">You've been invited to Hair Transplant Group Portal</h2>
        <p>Hi ${data.firstName},</p>
        <p>You've been added as a sales rep. Click the button below to set your password and sign in.</p>
        <p style="margin:24px 0">
          <a href="${actionLink}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Set your password</a>
        </p>
        <p style="font-size:12px;color:#666">Or paste this link in your browser:<br>${actionLink}</p>
      </div>`;

    const sendVia = async (from: string, to: string) => {
      const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: "You've been invited to Hair Transplant Group Portal",
          reply_to: "admin@bold-patients.com",
          html,
        }),
      });
      const body = await resp.text();
      return { ok: resp.ok, status: resp.status, body };
    };

    // Translate Resend's raw error JSON into a human-actionable message.
    const explainResendError = (status: number, body: string): string => {
      let parsed: { message?: string; name?: string } = {};
      try { parsed = JSON.parse(body); } catch { /* ignore */ }
      const msg = parsed.message || body || "Unknown error";
      if (/domain is not verified/i.test(msg)) return "The verified sender domain rejected this invite email.";
      if (/can only send testing emails to your own email/i.test(msg)) return "The email provider rejected this recipient while in testing mode.";
      if (status === 429) {
        return "Email rate limit hit. Try again in a few seconds.";
      }
      return `Email send failed (${status}): ${msg}`;
    };

    let sendResult: { ok: boolean; status: number; body: string };
    try {
      sendResult = await sendVia("Hair Transplant Group Portal <admin@bold-patients.com>", data.email);
    } catch (e) {
      await rollbackAuthUser(newUserId);
      await logError("inviteRep:resend", (e as Error).message, { email: data.email });
      return { success: false as const, error: `Email send threw: ${(e as Error).message}` };
    }

    if (!sendResult.ok) {
      await rollbackAuthUser(newUserId);
      const friendly = explainResendError(sendResult.status, sendResult.body);
      await logError("inviteRep:resend", `Resend send failed [${sendResult.status}]: ${sendResult.body}`, { email: data.email });
      return { success: false as const, error: friendly };
    }

    // 4. Insert the sales_reps row only after the email is actually sent.
    const { data: created, error: insertErr } = await supabaseAdmin.from("sales_reps")
      .insert({
        name: fullName,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        role: "rep",
      } as never).select("*").single();
    if (insertErr) {
      // Email already went out — keep the auth user but report the DB error so the
      // user can manually add the row or retry. Don't roll back: the recipient has the link.
      await logError("inviteRep.insert", insertErr.message, { email: data.email });
      return { success: false as const, error: `Invite email sent, but failed to save rep row: ${insertErr.message}` };
    }
    return { success: true as const, rep: created, userId: newUserId ?? null };
  });

/* List reps for the team management screen — admin only */
export const listReps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try { await assertAdmin(context.userId); } catch (e) {
      return { success: false as const, error: (e as Error).message, reps: [] };
    }
    const { data, error } = await supabaseAdmin.from("sales_reps")
      .select("*").order("created_at", { ascending: true });
    if (error) return { success: false as const, error: error.message, reps: [] };
    return { success: true as const, reps: data ?? [] };
  });

/* Update an existing rep's name fields — admin only */
export const updateRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; firstName: string; lastName: string }) => ({
    id: String(data.id ?? ""),
    firstName: String(data.firstName ?? "").trim(),
    lastName: String(data.lastName ?? "").trim(),
  }))
  .handler(async ({ data, context }) => {
    try { await assertAdmin(context.userId); } catch (e) {
      return { success: false as const, error: (e as Error).message };
    }
    if (!data.id) return { success: false as const, error: "id required" };
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const { data: updated, error } = await supabaseAdmin.from("sales_reps")
      .update({ first_name: data.firstName, last_name: data.lastName, name: fullName } as never)
      .eq("id", data.id).select("*").single();
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, rep: updated };
  });

/* Update a rep's role (admin/rep) — admin only */
export const updateRepRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; role: "admin" | "rep" }) => ({
    id: String(data.id ?? ""),
    role: data.role === "admin" ? ("admin" as const) : ("rep" as const),
  }))
  .handler(async ({ data, context }) => {
    try { await assertAdmin(context.userId); } catch (e) {
      return { success: false as const, error: (e as Error).message };
    }
    if (!data.id) return { success: false as const, error: "id required" };
    const { error } = await supabaseAdmin.from("sales_reps")
      .update({ role: data.role } as never)
      .eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });

/* Remove a rep — admin only. Also deletes their auth user. */
export const deleteRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id ?? "") }))
  .handler(async ({ data, context }) => {
    let callerEmail: string;
    try { callerEmail = await assertAdmin(context.userId); } catch (e) {
      return { success: false as const, error: (e as Error).message };
    }
    if (!data.id) return { success: false as const, error: "id required" };

    const { data: rep } = await supabaseAdmin.from("sales_reps")
      .select("email").eq("id", data.id).maybeSingle();
    if (rep?.email && rep.email.toLowerCase() === callerEmail.toLowerCase()) {
      return { success: false as const, error: "You cannot remove yourself" };
    }

    const { error } = await supabaseAdmin.from("sales_reps").delete().eq("id", data.id);
    if (error) return { success: false as const, error: error.message };

    // Best-effort: delete the matching auth user too.
    if (rep?.email) {
      try {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const match = list?.users.find((u) => u.email?.toLowerCase() === rep.email!.toLowerCase());
        if (match) await supabaseAdmin.auth.admin.deleteUser(match.id);
      } catch (e) {
        await logError("deleteRep.authDelete", (e as Error).message, { email: rep.email });
      }
    }
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

    const { data: reps } = await supabaseAdmin.from("sales_reps").select("*");

    // Call metrics come from Twilio-derived call_records. The Twilio status
    // callback writes `duration` in seconds; `duration_seconds` is legacy.
    const { data: calls } = await supabaseAdmin.from("call_records")
      .select("id, rep_id, lead_id, duration, duration_seconds, outcome, status, called_at")
      .gte("called_at", from.toISOString()).lte("called_at", to.toISOString());

    // Booking metrics come from internal booking state. appointment_reminders is
    // created/refreshed when a deposit-paid booking is confirmed; meta_leads is
    // kept as a fallback for older rows without a reminder record.
    const { data: appointmentBookings } = await supabaseAdmin.from("appointment_reminders")
      .select("id, lead_id, status, updated_at")
      .neq("status", "cancelled")
      .gte("updated_at", from.toISOString()).lte("updated_at", to.toISOString());
    const { data: metaBookings } = await supabaseAdmin.from("meta_leads")
      .select("id, rep_id, status, booking_date, updated_at")
      .eq("status", "booked_deposit_paid")
      .gte("updated_at", from.toISOString()).lte("updated_at", to.toISOString());

    const relevantLeadIds = Array.from(new Set([
      ...((calls ?? []).map((c) => c.lead_id).filter(Boolean) as string[]),
      ...((appointmentBookings ?? []).map((b) => b.lead_id).filter(Boolean) as string[]),
      ...((metaBookings ?? []).map((b) => b.id).filter(Boolean) as string[]),
    ]));

    const { data: leadRows } = relevantLeadIds.length > 0
      ? await supabaseAdmin
        .from("meta_leads")
        .select("id, rep_id, first_name, last_name")
        .in("id", relevantLeadIds)
      : { data: [] };
    const leadRep = new Map((leadRows ?? []).map((l) => [l.id as string, l.rep_id as string | null]));
    const leadCallRep = new Map<string, string>();
    for (const c of calls ?? []) {
      if (c.lead_id && c.rep_id) leadCallRep.set(c.lead_id as string, c.rep_id as string);
    }
    const repIdForLead = (leadId: string) => leadRep.get(leadId) || leadCallRep.get(leadId) || null;

    // HARD RULE — exclude any test lead. Matches first="peter" + last starting with "test"
    // (so "Peter Test", "Peter Test 2", "Peter Test 3", etc. are all skipped),
    // and any lead whose first OR last name is literally "test".
    const excludedLeadIds = new Set(
      (leadRows ?? [])
        .filter((l) => {
          const fn = (l.first_name ?? "").trim().toLowerCase();
          const ln = (l.last_name ?? "").trim().toLowerCase();
          if (fn === "peter" && ln.startsWith("test")) return true;
          if (fn === "test" || ln === "test") return true;
          return false;
        })
        .map((l) => l.id as string),
    );

    // Dedupe reps by email (keeps the row with an email so calls attribute correctly).
    // Reps with no email get kept under their id only.
    const seenEmail = new Set<string>();
    const dedupedReps = (reps ?? []).filter((r) => {
      const e = (r.email ?? "").trim().toLowerCase();
      if (!e) return true;
      if (seenEmail.has(e)) return false;
      seenEmail.add(e);
      return true;
    });

    // Orphan rep_id reconciliation: when a rep gets re-invited, their sales_reps
    // row gets a new id but historical call_records still reference the old id.
    // We can't recover the original email from a deleted rep row, so as a safety
    // net we map ANY orphan rep_id (one that isn't in sales_reps anymore) to the
    // single surviving rep that owns most of the leads those orphan calls were on.
    const knownRepIds = new Set((reps ?? []).map((r) => r.id as string));
    const orphanRepLeadCounts = new Map<string, Map<string, number>>(); // orphanRepId -> (currentRepId -> count)
    for (const c of calls ?? []) {
      if (!c.rep_id || knownRepIds.has(c.rep_id as string)) continue;
      const leadOwner = c.lead_id ? leadRep.get(c.lead_id as string) : null;
      if (!leadOwner || !knownRepIds.has(leadOwner)) continue;
      const inner = orphanRepLeadCounts.get(c.rep_id as string) ?? new Map<string, number>();
      inner.set(leadOwner, (inner.get(leadOwner) ?? 0) + 1);
      orphanRepLeadCounts.set(c.rep_id as string, inner);
    }
    const orphanToCurrentRep = new Map<string, string>();
    for (const [orphanId, ownerCounts] of orphanRepLeadCounts.entries()) {
      let bestId: string | null = null;
      let bestCount = 0;
      for (const [ownerId, n] of ownerCounts.entries()) {
        if (n > bestCount) { bestCount = n; bestId = ownerId; }
      }
      if (bestId) orphanToCurrentRep.set(orphanId, bestId);
    }

    const repIdForCall = (c: { rep_id: string | null; lead_id: string | null }) => {
      const raw = c.rep_id || (c.lead_id ? leadRep.get(c.lead_id) ?? null : null);
      if (!raw) return null;
      // If the call's rep_id points to a deleted rep, remap to the current one.
      if (!knownRepIds.has(raw)) return orphanToCurrentRep.get(raw) ?? null;
      return raw;
    };

    const blank = () => ({ calls: 0, attempted: 0, connected: 0, bookings: 0, short: 0, convos: 0, holds: 0, notReached: 0, workSeconds: 0, breakSeconds: 0, breakGaps: 0 });
    const byRep = new Map<string, ReturnType<typeof blank>>();
    for (const r of dedupedReps) byRep.set(r.id, blank());

    for (const c of calls ?? []) {
      if (c.lead_id && excludedLeadIds.has(c.lead_id)) continue; // skip Peter Test
      // Skip in-flight calls (no real duration yet) so they don't pollute the count
      if (c.status === "ringing" || c.status === "initiated" || c.status === "queued" || c.status === "in-progress") continue;
      const repId = repIdForCall(c);
      if (!repId) continue;
      const dur = (c.duration ?? c.duration_seconds ?? 0) as number;
      const reached = dur > 0 || c.outcome === "connected";
      const s = byRep.get(repId) ?? blank();
      s.calls += 1;
      s.attempted += 1;
      if (!reached) {
        s.notReached += 1;
      } else {
        s.connected += 1;
        if (dur < 120) s.short += 1;
        if (dur >= 120) {
          s.convos += 1;
          s.holds += 1;
        }
      }
      byRep.set(repId, s);
    }

    // Break time = sum of gaps between consecutive calls per rep
    const callsByRep = new Map<string, number[]>();
    for (const c of calls ?? []) {
      if (c.status === "ringing" || c.status === "initiated" || c.status === "queued" || c.status === "in-progress") continue;
      const repId = repIdForCall(c);
      if (!repId) continue;
      const ts = new Date(c.called_at).getTime();
      if (!callsByRep.has(repId)) callsByRep.set(repId, []);
      callsByRep.get(repId)!.push(ts);
    }
    for (const [repId, timestamps] of callsByRep.entries()) {
      timestamps.sort((a, b) => a - b);
      let breakSecs = 0;
      let gapCount = 0;
      for (let i = 1; i < timestamps.length; i++) {
        const gapSecs = (timestamps[i] - timestamps[i - 1]) / 1000;
        // CRITICAL: only count gaps under 30 minutes (1800 seconds) as break.
        // Gaps longer than 30 minutes mean end of session — do not count them.
        if (gapSecs > 0 && gapSecs < 1800) {
          breakSecs += gapSecs;
          gapCount += 1;
        }
      }
      const s = byRep.get(repId) ?? blank();
      s.breakSeconds = Math.round(breakSecs);
      s.breakGaps = gapCount;
      byRep.set(repId, s);
    }

    // Work = shift duration: time from first call to last call of the day per rep
    const shiftByRep = new Map<string, { first: number; last: number }>();
    for (const c of calls ?? []) {
      if (c.status === "ringing" || c.status === "initiated" || c.status === "queued" || c.status === "in-progress") continue;
      const repId = repIdForCall(c);
      if (!repId) continue;
      const ts = new Date(c.called_at).getTime();
      const existing = shiftByRep.get(repId);
      if (!existing) {
        shiftByRep.set(repId, { first: ts, last: ts });
      } else {
        if (ts < existing.first) existing.first = ts;
        if (ts > existing.last) existing.last = ts;
      }
    }
    for (const [repId, shift] of shiftByRep.entries()) {
      const s = byRep.get(repId) ?? blank();
      s.workSeconds = Math.round((shift.last - shift.first) / 1000);
      byRep.set(repId, s);
    }

    const bookedLeadIds = new Set<string>();
    for (const b of appointmentBookings ?? []) {
      if (b.lead_id) bookedLeadIds.add(b.lead_id as string);
    }
    for (const b of metaBookings ?? []) {
      bookedLeadIds.add(b.id as string);
    }

    for (const leadId of bookedLeadIds) {
      if (excludedLeadIds.has(leadId)) continue; // skip Peter Test
      const repId = repIdForLead(leadId);
      if (!repId) continue;
      const s = byRep.get(repId) ?? blank();
      s.bookings += 1;
      byRep.set(repId, s);
    }

    const rows = dedupedReps.map((r) => {
      const s = byRep.get(r.id) ?? blank();
      const holdRate = s.connected > 0 ? Math.round((s.holds / s.connected) * 100) : 0;
      const conversion = s.convos > 0 ? Math.round((s.bookings / s.convos) * 100) : 0;
      return {
        id: r.id, name: r.name, email: r.email,
        calls: s.calls,
        notReached: s.notReached,
        short: s.short,
        convos: s.convos,
        holds: s.holds,
        holdRate,
        conversion,
        bookings: s.bookings,
        workMinutes: Math.round(s.workSeconds / 60),
        breakMinutes: Math.round(s.breakSeconds / 60),
        breakGaps: s.breakGaps,
        bonus: s.bookings * 50,
      };
    }).sort((a, b) => b.bookings - a.bookings || b.calls - a.calls);

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
