// Scheduled SMS reminders for booked appointments.
// Runs daily at 05:00 UTC (≈ 3pm Sydney AEST).
// Sends 3-day and 24-hour SMS for appointment_reminders rows where status='confirmed'.
//
// Test mode: POST { "test_phone": "+61..." } to send both reminder messages
// to the given phone using placeholder data — does NOT touch the DB.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TWILIO_FROM = "+61483938205";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatAUPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (hasPlus) return "+" + digits;
  if (digits.startsWith("61")) return "+" + digits;
  if (digits.startsWith("0")) return "+61" + digits.slice(1);
  return "+61" + digits;
}

function daysUntilSydney(bookingDate: string, now: Date): number {
  const sydneyTodayStr = now.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const today = new Date(sydneyTodayStr + "T00:00:00Z").getTime();
  const target = new Date(bookingDate + "T00:00:00Z").getTime();
  return Math.round((target - today) / 86400000);
}

function formatDateLong(bookingDate: string): string {
  const d = new Date(bookingDate + "T12:00:00Z");
  return d.toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney",
  });
}

function formatTime(bookingTime: string): string {
  const [h, m] = bookingTime.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${m} ${ampm}`;
}

function addDaysISO(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

async function sendSms(
  accountSid: string,
  authToken: string,
  to: string,
  body: string,
): Promise<{ ok: boolean; error?: string; sid?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
  return { ok: true, sid: data.sid };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!accountSid || !authToken || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing env" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse body if POST/PUT
  let body: Record<string, unknown> = {};
  if (req.method === "POST" || req.method === "PUT") {
    try { body = await req.json(); } catch { body = {}; }
  }

  // ---- TEST MODE ----
  const testPhoneRaw = typeof body.test_phone === "string" ? body.test_phone : null;
  if (testPhoneRaw) {
    const phone = formatAUPhone(testPhoneRaw);
    if (!phone) {
      return new Response(JSON.stringify({ error: "Invalid test_phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[send-appointment-reminders] TEST MODE — sending both messages to", phone);

    const now = new Date();
    const firstName = (typeof body.first_name === "string" && body.first_name.trim()) || "Peter";
    const doctorName = typeof body.doctor_name === "string" ? body.doctor_name.trim() : "";
    const doctorPhrase = doctorName ? `with Dr ${doctorName} ` : "";
    const threeDayDate = addDaysISO(now, 3);
    const oneDayDate = addDaysISO(now, 1);
    const timeStr = "2:00 PM";

    const body3 = `Hi ${firstName}, this is a reminder that your hair restoration consultation ${doctorPhrase}is scheduled for ${formatDateLong(threeDayDate)} at ${timeStr}. We look forward to seeing you. [TEST]`;
    const body1 = `Hi ${firstName}, a reminder that your consultation ${doctorPhrase}is tomorrow at ${timeStr}. Please reply if you have any questions. We look forward to seeing you. [TEST]`;

    const r3 = await sendSms(accountSid, authToken, phone, body3);
    const r1 = await sendSms(accountSid, authToken, phone, body1);

    console.log("[send-appointment-reminders] TEST results", { r3, r1 });

    return new Response(JSON.stringify({
      ok: true,
      mode: "test",
      to: phone,
      messages: [
        { kind: "3day", body: body3, result: r3 },
        { kind: "24h", body: body1, result: r1 },
      ],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ---- REAL MODE ----
  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();

  const { data: rows, error } = await supabase
    .from("appointment_reminders")
    .select("*")
    .eq("status", "confirmed");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const row of rows ?? []) {
    if (!row.booking_date || !row.booking_time) continue;
    if (row.status !== "confirmed") continue;

    const phone = formatAUPhone(row.patient_phone);
    if (!phone) {
      results.push({ id: row.id, skipped: "no_phone" });
      continue;
    }

    const days = daysUntilSydney(row.booking_date, now);
    const firstName = (row.patient_first_name || "there").toString().trim() || "there";
    const doctorName = (row.doctor_name || "").toString().trim();
    const dateLong = formatDateLong(row.booking_date);
    const timeStr = formatTime(row.booking_time);

    const doctorPhrase = doctorName ? `with Dr ${doctorName} ` : "";

    if (days === 3 && !row.three_day_sms_sent) {
      const msg = `Hi ${firstName}, this is a reminder that your hair restoration consultation ${doctorPhrase}is scheduled for ${dateLong} at ${timeStr}. We look forward to seeing you.`;
      const r = await sendSms(accountSid, authToken, phone, msg);
      if (r.ok) {
        await supabase.from("appointment_reminders").update({
          three_day_sms_sent: true,
          three_day_sms_sent_at: new Date().toISOString(),
        }).eq("id", row.id);
        results.push({ id: row.id, sent: "3day", sid: r.sid });
      } else {
        results.push({ id: row.id, error: r.error, kind: "3day" });
      }
    } else if (days === 1 && !row.twentyfour_hour_sms_sent) {
      const msg = `Hi ${firstName}, a reminder that your consultation ${doctorPhrase}is tomorrow at ${timeStr}. Please reply if you have any questions. We look forward to seeing you.`;
      const r = await sendSms(accountSid, authToken, phone, msg);
      if (r.ok) {
        await supabase.from("appointment_reminders").update({
          twentyfour_hour_sms_sent: true,
          twentyfour_hour_sms_sent_at: new Date().toISOString(),
        }).eq("id", row.id);
        results.push({ id: row.id, sent: "24h", sid: r.sid });
      } else {
        results.push({ id: row.id, error: r.error, kind: "24h" });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
