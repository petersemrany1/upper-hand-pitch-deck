// Ported from the Legal app (family-law-floater/src/lib/cold-calling/callbacks.ts). Re-run the port script to refresh.
// A firm ringing or texting back one of our pool numbers. Pure helpers shared by
// the webhooks (server) and the portal (browser): what to write on the firm and
// how to recognise it in the queue. No new columns: the callback is recorded as
// a follow-up due now, owned by the caller who last spoke to the firm.
import { CALLABLE_STATUSES } from "./types";

export const CALLBACK_DISPOSITIONS = ["called_back", "texted_back"] as const;
export type CallbackKind = "call" | "sms";

export type CallbackFirm = {
  id: string;
  firm_name: string;
  prospect_status: string;
  do_not_contact: boolean;
  last_disposition: string | null;
  next_follow_up_at: string | null;
  follow_up_note: string | null;
  follow_up_owner_user_id: string | null;
  assigned_caller_user_id: string | null;
};

/** True while a callback is waiting for the setter (cleared when they save the next outcome). */
export function isCallback(firm: {
  last_disposition: string | null;
  next_follow_up_at: string | null;
}): boolean {
  return (
    (CALLBACK_DISPOSITIONS as readonly string[]).includes(firm.last_disposition ?? "") &&
    firm.next_follow_up_at !== null
  );
}

export function callbackLabel(kind: CallbackKind): string {
  return kind === "call" ? "Called back" : "Texted back";
}

/** Human line appended to the firm's notes, e.g. "[18 Sep, 10:14 am] Texted back from 0418 214 953: Call me after 3". */
export function callbackNoteLine(input: {
  kind: CallbackKind;
  from: string;
  body?: string | null;
  now: Date;
}): string {
  // Built from two parts so the wording does not depend on the runtime's locale data ("at" vs ",").
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    input.now.toLocaleString("en-AU", { timeZone: "Australia/Sydney", ...o });
  const stamp = `${fmt({ day: "numeric", month: "short" })}, ${fmt({ hour: "numeric", minute: "2-digit" })}`;
  const from = formatAuNumber(input.from);
  const text = (input.body ?? "").trim();
  return `[${stamp}] ${callbackLabel(input.kind)} from ${from}${text ? `: ${text}` : ""}`;
}

/** +61418214953 → 0418 214 953; anything else is returned as typed. */
export function formatAuNumber(e164: string): string {
  const m = /^\+61(\d{9})$/.exec(e164.trim());
  if (!m) return e164;
  const d = m[1]!;
  return d.startsWith("4")
    ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
    : `0${d.slice(0, 1)} ${d.slice(1, 5)} ${d.slice(5)}`;
}

/**
 * The patch that puts a firm at the top of its owner's queue. Null when nothing
 * should change (Do Not Contact). The status only moves to "follow_up" while the
 * firm is still callable; a booked or closed firm keeps its status but is still
 * flagged so the setter sees the callback in the Pipeline.
 */
export function callbackPatch(
  firm: CallbackFirm,
  input: {
    kind: CallbackKind;
    from: string;
    body?: string | null;
    now: Date;
    ownerUserId: string | null;
  },
): Record<string, unknown> | null {
  if (firm.do_not_contact) return null;
  const line = callbackNoteLine(input);
  const owner = input.ownerUserId ?? firm.follow_up_owner_user_id ?? firm.assigned_caller_user_id;
  const patch: Record<string, unknown> = {
    last_disposition: input.kind === "call" ? "called_back" : "texted_back",
    next_follow_up_at: input.now.toISOString(),
    follow_up_note: firm.follow_up_note ? `${firm.follow_up_note}\n${line}` : line,
    follow_up_owner_user_id: owner,
    assigned_caller_user_id: owner,
  };
  if ((CALLABLE_STATUSES as readonly string[]).includes(firm.prospect_status))
    patch["prospect_status"] = "follow_up";
  return patch;
}

/** What the firm hears when they ring back and nobody is free (they never get a ringtone in a setter's browser). */
export function callbackGreeting(): string {
  return (
    "Hi, thanks for calling back — you've reached Bold. We're on another call right now, " +
    "but we'll ring you back in the next few minutes. If you'd like, leave a quick message after the tone."
  );
}

/** A reply that means "stop texting me" (Spam Act opt-out). */
export function isOptOutText(body: string | null | undefined): boolean {
  return /^\s*(stop|unsubscribe|opt\s*out|no\s+thanks?|remove\s+me)\b/i.test(body ?? "");
}
