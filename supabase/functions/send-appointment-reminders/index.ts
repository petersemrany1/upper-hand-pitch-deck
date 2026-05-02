// Scheduled SMS reminders for booked appointments.
// Runs daily at 05:00 UTC (≈ 3pm Sydney AEST).
// Sends 3-day and 24-hour SMS for appointment_reminders rows where status='confirmed'.

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

// Days until booking_date, evaluated in Australian Eastern time.
function daysUntilSydney(bookingDate: string, now: Date): number {
  // Today's date in Sydney
  const sydneyTodayStr = now.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }); // YYYY-MM-DD
  const today = new Date(sydneyTodayStr + "T00:00:00Z").getTime();
  const target = new Date(bookingDate + "T00:00:00Z").getTime();
  return Math.round((target - today) / 86400000);
}

function formatDateLong(bookingDate: string): string {
  // "Monday, 5 May" in en-AU using Sydney TZ
  const d = new Date(bookingDate + "T12:00:00Z");
  return d.toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney",
  });
}

function formatTime(bookingTime: string): string {
  // bookingTime is "HH:MM" or "HH:MM:SS"
  const [h, m] = bookingTime.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${m} ${ampm}`;
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

    if (days === 3 && !row.three_day_sms_sent) {
      const body = `Hi ${firstName}, this is a reminder that your hair restoration consultation with Dr ${doctorName} is scheduled for ${dateLong} at ${timeStr}. We look forward to seeing you.`;
      const r = await sendSms(accountSid, authToken, phone, body);
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
      const body = `Hi ${firstName}, a reminder that your consultation with Dr ${doctorName} is tomorrow at ${timeStr}. Please reply if you have any questions. We look forward to seeing you.`;
      const r = await sendSms(accountSid, authToken, phone, body);
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
