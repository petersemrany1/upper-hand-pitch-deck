// Twilio webhook for inbound SMS/MMS messages.
// Twilio POSTs application/x-www-form-urlencoded with fields:
//   From, To, Body, MessageSid, NumMedia, MediaUrl0..N, MediaContentType0..N
// We:
//   1) Find or create the sms_thread for the From number (auto-links to clinic via DB trigger)
//   2) Download any MMS media into the sms-media bucket so it persists
//   3) Insert sms_messages row (which triggers thread preview update)
//   4) Reply with empty TwiML (no auto-reply)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const TWILIO_GATEWAY_BASE = "https://connector-gateway.lovable.dev/twilio";

async function downloadMedia(mediaUrl: string, contentType: string): Promise<Uint8Array | null> {
  // Twilio media URLs require auth — fetch via gateway by appending the path part
  // (gateway handles auth). The MediaUrl is full path under /2010-04-01/Accounts/{Sid}/...
  // Strip the host so the gateway routes it correctly.
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  if (!lovableKey || !twilioKey) {
    console.error("Missing LOVABLE_API_KEY or TWILIO_API_KEY for media download");
    return null;
  }
  try {
    const u = new URL(mediaUrl);
    // Path looks like /2010-04-01/Accounts/{AccountSid}/Messages/{MsgSid}/Media/{MediaSid}
    // Gateway expects path AFTER /2010-04-01/Accounts/{AccountSid}/
    const m = u.pathname.match(/\/2010-04-01\/Accounts\/[^/]+\/(.*)$/);
    const subPath = m ? m[1] : u.pathname.replace(/^\//, "");
    const gwUrl = `${TWILIO_GATEWAY_BASE}/${subPath}`;
    const res = await fetch(gwUrl, {
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Accept": contentType || "*/*",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      console.error("Media download failed", res.status, await res.text());
      return null;
    }
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    console.error("Media download error", e);
    return null;
  }
}

function extFromContentType(ct: string): string {
  if (!ct) return "bin";
  const parts = ct.split("/");
  if (parts.length !== 2) return "bin";
  const sub = parts[1].split(";")[0].trim();
  if (sub === "jpeg") return "jpg";
  return sub || "bin";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const form = await req.formData();

    // Reject any request that wasn't actually signed by Twilio. Otherwise an
    // attacker could inject fake SMS messages into our threads.
    if (!(await validateTwilioSignature(req, form))) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const from = form.get("From")?.toString() ?? "";
    const to = form.get("To")?.toString() ?? "";
    const body = form.get("Body")?.toString() ?? "";
    const messageSid = form.get("MessageSid")?.toString() ?? "";
    const numMedia = parseInt(form.get("NumMedia")?.toString() ?? "0", 10);

    console.log("sms-inbound: received", { from, to, messageSid, numMedia, bodyLen: body.length });

    if (!from) {
      return new Response("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // 1) Find or create thread
    let threadId: string;
    const { data: existing } = await sb
      .from("sms_threads")
      .select("id")
      .eq("phone", from)
      .maybeSingle();

    if (existing?.id) {
      threadId = existing.id;
    } else {
      const { data: created, error: createErr } = await sb
        .from("sms_threads")
        .insert({ phone: from })
        .select("id")
        .single();
      if (createErr || !created) {
        console.error("sms-inbound: thread create failed", createErr);
        return new Response("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
      }
      threadId = created.id;
    }

    // 2) Download media into sms-media bucket
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = form.get(`MediaUrl${i}`)?.toString() ?? "";
      const ct = form.get(`MediaContentType${i}`)?.toString() ?? "application/octet-stream";
      if (!url) continue;
      const bytes = await downloadMedia(url, ct);
      if (!bytes) continue;
      const ext = extFromContentType(ct);
      const path = `${threadId}/${messageSid || crypto.randomUUID()}_${i}.${ext}`;
      const { error: upErr } = await sb.storage.from("sms-media").upload(path, bytes, {
        contentType: ct, upsert: true,
      });
      if (upErr) {
        console.error("sms-inbound: media upload failed", upErr);
        continue;
      }
      const { data: pub } = sb.storage.from("sms-media").getPublicUrl(path);
      mediaUrls.push(pub.publicUrl);
    }

    // 3) Insert message
    const { error: msgErr } = await sb.from("sms_messages").insert({
      thread_id: threadId,
      direction: "inbound",
      body,
      media_urls: mediaUrls,
      twilio_message_sid: messageSid || null,
      status: "received",
      from_number: from,
      to_number: to,
    });
    if (msgErr) console.error("sms-inbound: message insert failed", msgErr);

    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
      status: 200,
      headers: { "Content-Type": "text/xml", ...corsHeaders },
    });
  } catch (e) {
    console.error("sms-inbound error", e);
    return new Response("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
  }
});
