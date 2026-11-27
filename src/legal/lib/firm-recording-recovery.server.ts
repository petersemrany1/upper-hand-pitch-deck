// Ported from the Legal app (family-law-floater/src/lib/firm-recording-recovery.server.ts). Re-run the port script to refresh.
import { twilioEnv } from "./twilio.server";

/** Read only the recordings belonging to this CRM call; never search by phone. */
export async function findFirmCallRecording(callSid: string) {
  if (!/^CA[0-9a-f]{32}$/i.test(callSid)) {
    throw new Error("This call has no valid Twilio reference to check.");
  }
  const { accountSid, authToken } = twilioEnv();
  const base = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
  const response = await fetch(`${base}/Calls/${callSid}/Recordings.json?PageSize=1000`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Twilio recording lookup failed (${response.status}). Please retry.`);
  }
  const result = (await response.json()) as {
    recordings?: { sid: string; call_sid: string; status: string; duration: string }[];
    next_page_uri?: string | null;
  };
  if (!Array.isArray(result.recordings) || result.next_page_uri) {
    throw new Error(
      "Twilio returned an incomplete recording list. Please review this call in Twilio.",
    );
  }
  const recordings = result.recordings.filter(
    (recording) =>
      recording.call_sid === callSid &&
      recording.status === "completed" &&
      /^RE[0-9a-f]{32}$/i.test(recording.sid) &&
      Number(recording.duration) > 0,
  );
  const recording = recordings[0];
  if (!recording) {
    throw new Error(
      "Twilio has no completed recording for this call. AI notes cannot be recovered without recorded audio.",
    );
  }
  if (recordings.length > 1) {
    throw new Error(
      "Twilio has multiple recordings for this call. Review all recordings before rebuilding notes.",
    );
  }
  return {
    recording_sid: recording.sid,
    recording_url: `${base}/Recordings/${recording.sid}`,
  };
}
