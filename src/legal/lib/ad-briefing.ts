// Ported from the Legal app (family-law-floater/src/lib/ad-briefing.ts). Re-run the port script to refresh.
import { z } from "zod";

export const BRIEF_TIMEZONE = "Australia/Sydney";
export const MAX_CALL_SECONDS = 300;
export const MAX_QUESTIONS = 8;
export const reportSchema = z.object({
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  collected_at: z.string().datetime(),
  summary: z.string().trim().min(20).max(3000),
  report: z.string().trim().min(20).max(20000),
});
export type AdReport = z.infer<typeof reportSchema>;

// Stored in the existing report text so old deployments and saved reports remain
// readable. Legacy reports fail closed: an audit is not permission to call.
export function hasActionableAdAlert(report: Pick<AdReport, "report"> | null) {
  return report?.report.split(/\r?\n/, 1)[0]?.trim() === "AD_ALERT_DECISION: ACTION_REQUIRED";
}

export function normalizeAustralianMobile(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, "");
  if (/^04\d{8}$/.test(compact)) return `+61${compact.slice(1)}`;
  if (/^614\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+614\d{8}$/.test(compact)) return compact;
  return null;
}

export type BriefingSettingsInput = { enabled: boolean; recipient: string; caller_id: string };
export function parseBriefingSettings(input: BriefingSettingsInput) {
  const parsed = z
    .object({
      enabled: z.boolean(),
      recipient: z.string(),
      caller_id: z.string().regex(/^\+[1-9]\d{7,14}$/, "Choose a calling number."),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Please check the call settings.");
  const recipient = normalizeAustralianMobile(parsed.data.recipient);
  if (!recipient)
    throw new Error("Enter a valid Australian mobile, like 0418 214 953 or +61 418 214 953.");
  return { ...parsed.data, recipient };
}

export const CALL_GREETING = "Hey Peter, it's Haboob. Is now a good time for a quick catch-up?";
export type ConversationPhase = "permission" | "wellbeing" | "chat";
export type ConversationAction = "finish" | "clarify" | "wellbeing" | "brief" | "chat";

export function conversationAction(
  phase: ConversationPhase,
  speech: string,
  digit = "",
): ConversationAction {
  const words = speech
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[.!?,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (
    digit === "0" ||
    /^(?:please )?(?:goodbye|bye(?: bye)?|stop|end (?:the )?call|hang up|that's all|that is all|thanks that's all|gotta go|have to go)(?: please| thanks| now| mate| peter)?$/.test(
      words,
    ) ||
    /\b(?:i (?:have to|need to|gotta) go|i'm busy|im busy|call me (?:back |again )?later|can't talk|cannot talk)\b/.test(
      words,
    )
  )
    return "finish";
  if (phase === "permission") {
    // Negative phrases win over an opening 'yeah': "yeah, not now" is not consent.
    const permissionWords = words.replace(/\bno (?:worries|problem)\b/g, "sure");
    if (
      /\b(no|nope|nah|not|busy|later|can't|cannot|don't|do not|driving|wrong number|leave (?:a|your) message|voicemail)\b/.test(
        permissionWords,
      )
    )
      return "finish";
    if (
      digit === "1" ||
      /^(?:oh |ah |well )?(?:yes|yeah|yep|yup|sure|absolutely|certainly|okay|ok|go ahead|of course|all good|good time|i can talk|i'm free|im free|let's do it|lets do it|tell me)(?:\b|$)/.test(
        permissionWords,
      )
    )
      return "wellbeing";
    return "clarify";
  }
  if (!words) return "clarify";
  return phase === "wellbeing" ? "brief" : "chat";
}

export function sydneyTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: BRIEF_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function isCallWindow(now = new Date()) {
  const time = sydneyTime(now);
  return time.hour === 9 && time.minute < 10;
}

export function isFreshReport(
  report: Pick<AdReport, "report_date" | "collected_at">,
  now = new Date(),
) {
  const age = now.getTime() - Date.parse(report.collected_at);
  return (
    report.report_date === sydneyTime(now).date &&
    Number.isFinite(age) &&
    age >= -60000 &&
    age <= 3 * 60 * 60 * 1000
  );
}

export function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function say(text: string) {
  // Polly limits each Say to 3,000 characters; the audit may include an outro.
  return (text.match(/[\s\S]{1,2600}/g) ?? [])
    .map((chunk) => `<Say voice="Polly.Olivia-Neural" language="en-AU">${escapeXml(chunk)}</Say>`)
    .join("");
}

export function finish(text: string) {
  return `<Response>${say(text)}<Hangup/></Response>`;
}

export function listen(url: string, text: string) {
  // Speech is gathered during the prompt too, so Peter can naturally interrupt.
  const attrs = 'input="speech dtmf" numDigits="1" language="en-AU" speechTimeout="2" timeout="8"';
  return `<Response><Gather ${attrs} action="${escapeXml(url)}" method="POST">${say(text)}</Gather>${say("I'll leave you to it. Catch you later, Peter.")}<Hangup/></Response>`;
}

// Only explicit automated greetings qualify. Silence, refusal and application
// errors must not be treated as permission to ring again.
export function isVoicemailGreeting(text: unknown): boolean {
  if (typeof text !== "string") return false;
  return /your voice message is being converted to text|(?:please )?leave (?:a|your) message (?:after|at) the (?:tone|beep)|you(?:'ve| have) reached (?:the )?(?:voicemail|messagebank)|(?:person|number) you (?:have )?(?:called|dialled|dialed) (?:is|cannot|can not)/i.test(
    text,
  );
}
