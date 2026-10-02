import { PATIENT_SMS_FROM } from "../_shared/patient-sms.ts";

export async function sendSms(
  accountSid: string,
  authToken: string,
  to: string,
  body: string,
  transport: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string; sid?: string; status?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const res = await transport(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: PATIENT_SMS_FROM, Body: body }),
  });
  const data = await res.json();
  if (res.status >= 500) throw new Error("Twilio outcome uncertain; claim retained for review");
  if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
  if (!data.sid) throw new Error("Twilio response missing SID; claim retained for review");
  return { ok: true, sid: data.sid, status: data.status };
}

