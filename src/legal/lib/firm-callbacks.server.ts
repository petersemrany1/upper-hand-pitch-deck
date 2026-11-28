// Ported from the Legal app (family-law-floater/src/lib/firm-callbacks.server.ts). Re-run the port script to refresh.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { FIRM_CALLBACK_LEASE_MS, firmCallbackIdentity } from "./firm-callbacks";
import { publicBaseUrl, xmlEscape } from "./twilio.server";

const db = supabaseAdmin as SupabaseClient;
export async function callbackSettings(ownerId: string) {
  const { data, error } = await db
    .from("firm_callback_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error("Firm callback settings are not installed yet.");
  return data;
}
export async function requireCallbackOwner(ownerId: string) {
  const settings = await callbackSettings(ownerId);
  if (!settings) throw new Error("Incoming firm calls are not enabled for your account.");
  return settings;
}
export async function setCallbacksEnabled(ownerId: string, enabled: boolean) {
  await requireCallbackOwner(ownerId);
  const { error } = await db
    .from("firm_callback_settings")
    .update({
      enabled,
      ...(!enabled ? { session_id: null, session_expires_at: null, available: false } : {}),
    })
    .eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
}
export async function claimCallbackSession(ownerId: string, sessionId: string, takeOver = false) {
  await requireCallbackOwner(ownerId);
  const now = new Date();
  const { data, error } = await db
    .from("firm_callback_settings")
    .update({
      session_id: sessionId,
      session_expires_at: new Date(now.getTime() + FIRM_CALLBACK_LEASE_MS).toISOString(),
      available: false,
    })
    .eq("owner_id", ownerId)
    .eq("enabled", true)
    // The foreground Firms tab may replace an idle receiver, including a
    // previous page left behind by reload. Connecting/busy sessions stay put.
    .or(
      `session_id.is.null,session_id.eq.${sessionId},session_expires_at.lt.${now.toISOString()}${takeOver ? ",available.eq.true" : ""}`,
    )
    .select("owner_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const current = await requireCallbackOwner(ownerId);
    return current.enabled ? ("waiting" as const) : ("disabled" as const);
  }
  return "claimed" as const;
}
export async function refreshCallbackSession(
  ownerId: string,
  sessionId: string,
  available: boolean,
) {
  const { data, error } = await db
    .from("firm_callback_settings")
    .update({
      available,
      session_expires_at: new Date(Date.now() + FIRM_CALLBACK_LEASE_MS).toISOString(),
    })
    .eq("owner_id", ownerId)
    .eq("session_id", sessionId)
    .eq("enabled", true)
    .select("owner_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const current = await requireCallbackOwner(ownerId);
    return current.enabled ? ("moved" as const) : ("disabled" as const);
  }
  return "renewed" as const;
}
export async function releaseCallbackSession(ownerId: string, sessionId: string) {
  const { error } = await db
    .from("firm_callback_settings")
    .update({
      available: false,
      session_id: null,
      session_expires_at: null,
    })
    .eq("owner_id", ownerId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}
export async function requireCallbackRecipient(ownerId: string, sid: string) {
  await requireCallbackOwner(ownerId);
  const { data: call, error } = await db
    .from("firm_application_calls")
    .select("id,application_id,phone,status,callback_owner_id")
    .eq("twilio_call_sid", sid)
    .eq("direction", "inbound")
    .maybeSingle();
  if (error || !call) throw new Error("Incoming call not found.");
  const { data: recipient, error: recipientError } = await db
    .from("firm_callback_recipients")
    .select("owner_id")
    .eq("call_id", call.id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (recipientError) throw new Error(recipientError.message);
  if (!recipient && call.callback_owner_id !== ownerId)
    throw new Error("This incoming call was not sent to your account.");
  return call;
}
export async function declineFirmCallback(ownerId: string, sid: string) {
  const call = await requireCallbackRecipient(ownerId, sid);
  if (!["missed", "ringing", "declined"].includes(call.status))
    throw new Error("This incoming call is no longer available.");
  const { data, error } = await db
    .from("firm_callback_recipients")
    .update({ declined_at: new Date().toISOString() })
    .eq("call_id", call.id)
    .eq("owner_id", ownerId)
    .select("owner_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return;
  // An invitation delivered before the team rollout has no recipient snapshot.
  const { error: legacyError } = await db
    .from("firm_application_calls")
    .update({ status: "declined" })
    .eq("id", call.id)
    .eq("callback_owner_id", ownerId)
    .eq("direction", "inbound")
    .in("status", ["missed", "ringing", "declined"]);
  if (legacyError) throw new Error(legacyError.message);
}
export function firmVoicemailTwiml() {
  return `<Response><Say voice="alice">Thanks for calling Bold. Our team is unavailable right now. Please leave your name and a message after the tone, and we will call you back.</Say><Record maxLength="120" playBeep="true" recordingStatusCallback="${xmlEscape(`${publicBaseUrl()}/api/public/hooks/twilio-recording`)}" recordingStatusCallbackMethod="POST"/><Hangup/></Response>`;
}
/** Called only after matching both the firm and the number it previously called. */
export async function ringFirmCallback(applicationId: string, sid: string, phone: string) {
  const { data: settings, error } = await db
    .from("firm_callback_settings")
    .select("*")
    .eq("enabled", true)
    .eq("available", true)
    .gt("session_expires_at", new Date().toISOString());
  // A deployment without the new table must retain the existing voicemail path.
  if (error || !settings?.length) return firmVoicemailTwiml();
  const { data: staff, error: staffError } = await db
    .from("sales_reps")
    .select("user_id,role,can_manage_firm_pipeline,portal_pages")
    .in(
      "user_id",
      settings.map((receiver) => receiver.owner_id),
    )
    .eq("is_active", true);
  if (staffError) return firmVoicemailTwiml();
  const receivers = settings
    .filter(
      (receiver) =>
        receiver.session_id &&
        staff?.some(
          (rep) =>
            rep.user_id === receiver.owner_id &&
            (rep.role === "admin" ||
              (rep.can_manage_firm_pipeline && rep.portal_pages?.includes("/firms"))),
        ),
    )
    .slice(0, 10);
  if (!receivers.length) return firmVoicemailTwiml();
  const { data: firm, error: firmError } = await db
    .from("firm_applications")
    .select("first_name,last_name,firm_name")
    .eq("id", applicationId)
    .single();
  if (firmError) throw new Error(firmError.message);
  const { data: call, error: callError } = await db
    .from("firm_application_calls")
    .select("id")
    .eq("twilio_call_sid", sid)
    .eq("direction", "inbound")
    .single();
  if (callError || !call) throw new Error("Incoming call not found.");
  const { error: recipientsError } = await db.from("firm_callback_recipients").upsert(
    receivers.map((receiver) => ({
      call_id: call.id,
      owner_id: receiver.owner_id,
      session_id: receiver.session_id,
    })),
    { onConflict: "call_id,owner_id", ignoreDuplicates: true },
  );
  if (recipientsError) throw new Error(recipientsError.message);
  const { data: recipients, error: readError } = await db
    .from("firm_callback_recipients")
    .select("owner_id,session_id")
    .eq("call_id", call.id);
  if (readError || !recipients?.length) throw new Error("Could not prepare incoming receivers.");
  const { error: logError } = await db
    .from("firm_application_calls")
    .update({
      callback_owner_id: recipients.length === 1 ? recipients[0]!.owner_id : null,
      callback_session_id: recipients.length === 1 ? recipients[0]!.session_id : null,
    })
    .eq("twilio_call_sid", sid)
    .eq("direction", "inbound");
  if (logError) throw new Error(logError.message);
  const name =
    [firm.first_name, firm.last_name].filter(Boolean).join(" ") || firm.firm_name || phone;
  const parameters = {
    ApplicationId: applicationId,
    CallerName: name,
    FirmName: firm.firm_name || "",
    CallerPhone: phone,
    ParentCallSid: sid,
  };
  const action = `${publicBaseUrl()}/api/public/hooks/twilio-voice-inbound?firmCallback=complete`;
  const clients = recipients
    .map(
      (recipient) =>
        `<Client><Identity>${firmCallbackIdentity(recipient.owner_id, recipient.session_id)}</Identity>${Object.entries(
          parameters,
        )
          .map(([key, value]) => `<Parameter name="${key}" value="${xmlEscape(value)}"/>`)
          .join("")}</Client>`,
    )
    .join("");
  return `<Response><Dial answerOnBridge="true" timeout="25" record="record-from-answer-dual" recordingStatusCallback="${xmlEscape(`${publicBaseUrl()}/api/public/hooks/twilio-recording`)}" recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed" action="${xmlEscape(action)}" method="POST">${clients}</Dial></Response>`;
}
/** Signed Dial action; never send an answered or explicitly declined call to voicemail. */
export async function finishFirmCallback(params: Record<string, string>) {
  const { data: call, error } = await db
    .from("firm_application_calls")
    .select("id,callback_owner_id,status")
    .eq("twilio_call_sid", params["CallSid"] || "")
    .eq("direction", "inbound")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!call) return "<Response><Hangup/></Response>";
  const { data: recipients, error: recipientsError } = await db
    .from("firm_callback_recipients")
    .select("declined_at")
    .eq("call_id", call.id);
  if (recipientsError) throw new Error(recipientsError.message);
  if (!recipients?.length && !call.callback_owner_id) return "<Response><Hangup/></Response>";
  if (["completed", "voicemail"].includes(call.status)) return "<Response><Hangup/></Response>";
  const status = params["DialCallStatus"];
  const answered = status === "completed";
  const declined =
    call.status === "declined" ||
    status === "canceled" ||
    (!!recipients?.length && recipients.every((recipient) => !!recipient.declined_at));
  const duration = Number(params["DialCallDuration"]);
  const { error: updateError } = await db
    .from("firm_application_calls")
    .update({
      status: answered ? "completed" : declined ? "declined" : "missed",
      ...(answered
        ? {
            duration_seconds: Number.isFinite(duration) ? duration : null,
            reviewed_at: new Date().toISOString(),
          }
        : {}),
    })
    .eq("id", call.id)
    .in("status", ["missed", "ringing"]);
  if (updateError) throw new Error(updateError.message);
  return answered || declined ? "<Response><Hangup/></Response>" : firmVoicemailTwiml();
}
