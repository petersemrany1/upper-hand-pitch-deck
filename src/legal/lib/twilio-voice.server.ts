// Ported from the Legal app (family-law-floater/src/lib/twilio-voice.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Server-only Twilio Voice helpers: access-token minting (Voice JWT) and the
// TwiML Application the browser dialler points at. Never import from the client.
import { createHmac } from "node:crypto";

import { publicBaseUrl, twilioEnv, twilioForm } from "./twilio.server";

const API_BASE = "https://api.twilio.com/2010-04-01";
const TWIML_APP_NAME = "LegalGroup-Dialler";
const TWIML_APP_SETTING = "twiml_app_sid";

export const VOICE_OUTBOUND_PATH = "/api/public/legal/hooks/twilio-voice-outbound";
export const VOICE_INBOUND_PATH = "/api/public/legal/hooks/twilio-voice-inbound";
export const SMS_INBOUND_PATH = "/api/public/legal/hooks/twilio-sms-inbound";
export const VOICE_STATUS_PATH = "/api/public/legal/hooks/twilio-status";
export const VOICE_RECORDING_PATH = "/api/public/legal/hooks/twilio-recording";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function voiceApiKeys() {
  const sid = legalEnv["TWILIO_API_KEY_SID"];
  const secret = legalEnv["TWILIO_API_KEY_SECRET"];
  if (!sid || !secret) throw new Error("Twilio API key is not configured");
  return { sid, secret };
}

function basicAuth(): string {
  const { accountSid, authToken } = twilioEnv();
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

/** The TwiML Application SID for the browser dialler, creating it on first use. */
export async function ensureTwimlAppSid(): Promise<string> {
  const fromEnv = legalEnv["TWILIO_TWIML_APP_SID"];
  if (fromEnv) return fromEnv;

  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: setting } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", TWIML_APP_SETTING)
    .maybeSingle();
  const cached = setting?.value as { sid?: string } | null;
  if (cached?.sid) return cached.sid;

  const { accountSid } = twilioEnv();
  const voiceUrl = `${publicBaseUrl()}${VOICE_OUTBOUND_PATH}`;

  const listed = await fetch(
    `${API_BASE}/Accounts/${accountSid}/Applications.json?FriendlyName=${encodeURIComponent(TWIML_APP_NAME)}`,
    { headers: { Authorization: basicAuth() } },
  );
  const listedText = await listed.text();
  if (!listed.ok)
    throw new Error(`Twilio application lookup failed [${listed.status}]: ${listedText}`);
  const apps =
    (JSON.parse(listedText) as { applications?: Array<{ sid?: string }> }).applications ?? [];
  let sid = apps[0]?.sid ?? null;

  if (sid) {
    await twilioForm(`/Applications/${sid}.json`, { VoiceUrl: voiceUrl, VoiceMethod: "POST" });
  } else {
    const created = await twilioForm("/Applications.json", {
      FriendlyName: TWIML_APP_NAME,
      VoiceUrl: voiceUrl,
      VoiceMethod: "POST",
    });
    if (!created.ok) {
      throw new Error(`Could not create the Twilio dialler app: ${JSON.stringify(created.json)}`);
    }
    sid = String(created.json["sid"] ?? "");
  }
  if (!sid) throw new Error("Twilio did not return a TwiML application SID");

  await supabaseAdmin
    .from("app_settings")
    .upsert({ key: TWIML_APP_SETTING, value: { sid } as never }, { onConflict: "key" });
  return sid;
}

/** Mint a Twilio Voice access token (HS256 JWT) for a rep's browser client. */
export async function mintVoiceToken(
  identity: string,
  ttlSeconds = 3600,
  incomingOnly = false,
): Promise<{ token: string; identity: string }> {
  const { accountSid } = twilioEnv();
  const { sid: keySid, secret } = voiceApiKeys();
  const appSid = incomingOnly ? null : await ensureTwimlAppSid();
  const now = Math.floor(Date.now() / 1000);

  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${keySid}-${now}`,
    iss: keySid,
    sub: accountSid,
    nbf: now,
    exp: now + ttlSeconds,
    grants: {
      identity,
      voice: {
        incoming: { allow: true },
        ...(appSid ? { outgoing: { application_sid: appSid } } : {}),
      },
    },
  };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = b64url(createHmac("sha256", secret).update(signingInput).digest());
  return { token: `${signingInput}.${signature}`, identity };
}

/** Twilio client identity for a rep — stable, URL-safe, and reversible. */
export function repIdentity(repId: string): string {
  return `rep_${repId.replace(/-/g, "")}`;
}
