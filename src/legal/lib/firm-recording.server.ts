// Ported from the Legal app (family-law-floater/src/lib/firm-recording.server.ts). Re-run the port script to refresh.
import { assertFirmPipelineAccess } from "./firm-pipeline-access";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordingMediaUrl } from "./call-review.server";
import { twilioEnv } from "./twilio.server";

/** Uses the signed-in pipeline user's RLS client; never accepts a media URL from the browser. */
export async function loadFirmRecording(
  db: SupabaseClient,
  applicationId: string,
  callId: string,
): Promise<Response> {
  await assertFirmPipelineAccess(db);
  const { data: call, error } = await db
    .from("firm_application_calls")
    .select("recording_sid, recording_url")
    .eq("application_id", applicationId)
    .eq("id", callId)
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
