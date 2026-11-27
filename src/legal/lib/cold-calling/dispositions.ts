// Ported from the Legal app (family-law-floater/src/lib/cold-calling/dispositions.ts). Re-run the port script to refresh.
// Outcome automation. Given the firm, the attempt and the caller's input, decide
// every state change. Pure: the server function applies the returned patches.
import { scheduleRetry } from "./calling-window";
import type { ColdCallingSettings } from "./settings";
import { DECISION_MAKER_DISPOSITIONS, type Disposition } from "./types";

export type DispositionFirm = {
  id: string;
  state: string | null;
  phone_e164: string | null;
  prospect_status: string;
  call_attempt_count: number;
  unsuccessful_attempt_count: number;
  do_not_contact: boolean;
};

export type DispositionInput = {
  disposition: Disposition;
  notes: string;
  followUpAt?: string | null; // ISO instant
  assignedOwnerUserId?: string | null;
  meetingAt?: string | null; // ISO instant
  meetingReference?: string | null;
  reason?: string | null; // bad fit / DNC reason
  recipientAskedNotToBeCalled?: boolean;
};

export type FirmPatch = {
  prospect_status: string;
  call_attempt_count: number;
  unsuccessful_attempt_count: number;
  last_call_at: string;
  last_disposition: Disposition;
  next_follow_up_at: string | null;
  follow_up_note: string | null;
  follow_up_owner_user_id: string | null;
  do_not_contact?: boolean;
  do_not_contact_at?: string;
  do_not_contact_reason?: string;
  do_not_contact_by?: string;
  meeting_at?: string | null;
  meeting_reference?: string | null;
  meeting_booked_at?: string;
  meeting_booked_by?: string;
  bad_fit_reason?: string | null;
};

export type DispositionPlan = {
  firmPatch: FirmPatch;
  attemptPatch: { business_disposition: Disposition; notes: string; follow_up_at: string | null };
  /** Cancel this firm's items in every other active queue. */
  cancelOtherQueueItems: boolean;
  /** Add the number to the global suppression list. */
  suppress: { reason: string } | null;
  reachedDecisionMaker: boolean;
  exhausted: boolean;
  auditAction: string;
};

export type DispositionOutcome = { ok: true; plan: DispositionPlan } | { ok: false; error: string };

function futureInstant(value: string | null | undefined, now: Date): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  if (t <= now.getTime()) return null;
  return new Date(t).toISOString();
}

export type DispositionOptions = {
  /** The dial failed before it rang (carrier/Twilio error) — the firm was never actually tried. */
  neverRang?: boolean;
};

export function planDisposition(
  firm: DispositionFirm,
  input: DispositionInput,
  callerUserId: string,
  now: Date,
  settings: ColdCallingSettings,
  options: DispositionOptions = {},
): DispositionOutcome {
  const nowISO = now.toISOString();
  const notes = input.notes.trim();
  const attempts = firm.call_attempt_count + 1;
  const base: FirmPatch = {
    prospect_status: firm.prospect_status,
    call_attempt_count: attempts,
    unsuccessful_attempt_count: firm.unsuccessful_attempt_count,
    last_call_at: nowISO,
    last_disposition: input.disposition,
    next_follow_up_at: null,
    follow_up_note: null,
    follow_up_owner_user_id: null,
  };
  const done = (
    plan: Omit<DispositionPlan, "reachedDecisionMaker" | "attemptPatch"> & {
      followUpAt?: string | null;
    },
  ) => ({
    ok: true as const,
    plan: {
      ...plan,
      attemptPatch: {
        business_disposition: input.disposition,
        notes,
        follow_up_at: plan.followUpAt ?? null,
      },
      reachedDecisionMaker: DECISION_MAKER_DISPOSITIONS.includes(input.disposition),
    },
  });

  switch (input.disposition) {
    case "no_answer": {
      if (options.neverRang) {
        // A failed dial is not a no-answer: leave the counts alone (so the firm can never be
        // exhausted by dialler faults) and simply put it back for the next calling session.
        const retry = scheduleRetry(now, 1, firm.state, settings);
        const followUpAt = retry.followUpAt?.toISOString() ?? null;
        return done({
          firmPatch: {
            ...base,
            prospect_status: firm.prospect_status === "new" ? "no_answer" : firm.prospect_status,
            call_attempt_count: firm.call_attempt_count,
            next_follow_up_at: followUpAt,
          },
          followUpAt,
          cancelOtherQueueItems: false,
          suppress: null,
          exhausted: false,
          auditAction: "dial_failed",
        });
      }
      const unsuccessful = firm.unsuccessful_attempt_count + 1;
      const retry = scheduleRetry(now, unsuccessful, firm.state, settings);
      const exhausted = retry.exhausted;
      return done({
        firmPatch: {
          ...base,
          prospect_status: exhausted ? "exhausted" : "no_answer",
          unsuccessful_attempt_count: unsuccessful,
          next_follow_up_at: exhausted ? null : (retry.followUpAt?.toISOString() ?? null),
        },
        followUpAt: exhausted ? null : (retry.followUpAt?.toISOString() ?? null),
        cancelOtherQueueItems: exhausted,
        suppress: null,
        exhausted,
        auditAction: exhausted ? "prospect_exhausted" : "no_answer",
      });
    }
    case "gatekeeper_try_again": {
      if (!notes)
        return { ok: false, error: "Add a note about who you spoke to and what they said." };
      const followUp = futureInstant(input.followUpAt, now);
      if (!followUp) return { ok: false, error: "Pick a follow-up date and time in the future." };
      return done({
        firmPatch: {
          ...base,
          prospect_status: "gatekeeper",
          next_follow_up_at: followUp,
          follow_up_note: notes,
          follow_up_owner_user_id: input.assignedOwnerUserId ?? callerUserId,
        },
        followUpAt: followUp,
        cancelOtherQueueItems: false,
        suppress: null,
        exhausted: false,
        auditAction: "gatekeeper_try_again",
      });
    }
    case "dm_not_interested": {
      const asked = input.recipientAskedNotToBeCalled === true;
      const patch: FirmPatch = {
        ...base,
        prospect_status: asked ? "do_not_contact" : "not_interested",
      };
      if (asked) {
        patch.do_not_contact = true;
        patch.do_not_contact_at = nowISO;
        patch.do_not_contact_reason = "Recipient asked not to be called again";
        patch.do_not_contact_by = callerUserId;
      }
      return done({
        firmPatch: patch,
        cancelOtherQueueItems: true,
        suppress: asked ? { reason: "Recipient asked not to be called again" } : null,
        exhausted: false,
        auditAction: asked ? "do_not_contact" : "not_interested",
      });
    }
    case "follow_up": {
      if (!notes) return { ok: false, error: "Add a note so the next call has context." };
      const followUp = futureInstant(input.followUpAt, now);
      if (!followUp) return { ok: false, error: "Pick a follow-up date and time in the future." };
      const owner = input.assignedOwnerUserId ?? null;
      if (!owner) return { ok: false, error: "Assign an owner for the follow-up." };
      return done({
        firmPatch: {
          ...base,
          prospect_status: "follow_up",
          next_follow_up_at: followUp,
          follow_up_note: notes,
          follow_up_owner_user_id: owner,
        },
        followUpAt: followUp,
        cancelOtherQueueItems: false,
        suppress: null,
        exhausted: false,
        auditAction: "follow_up",
      });
    }
    case "interested": {
      // Warm. If no meeting is booked right now, a follow-up task keeps it alive.
      const followUp =
        futureInstant(input.followUpAt, now) ??
        scheduleRetry(now, 1, firm.state, {
          ...settings,
          retry_policy: { offsets_business_days: [1] },
        }).followUpAt?.toISOString() ??
        null;
      return done({
        firmPatch: {
          ...base,
          prospect_status: "warm",
          next_follow_up_at: followUp,
          follow_up_note: notes || "Interested — book the meeting",
          follow_up_owner_user_id: input.assignedOwnerUserId ?? callerUserId,
        },
        followUpAt: followUp,
        cancelOtherQueueItems: true,
        suppress: null,
        exhausted: false,
        auditAction: "interested",
      });
    }
    case "meeting_booked": {
      const meetingAt = input.meetingAt ? Date.parse(input.meetingAt) : NaN;
      if (!Number.isFinite(meetingAt))
        return { ok: false, error: "Enter the meeting date and time." };
      return done({
        firmPatch: {
          ...base,
          prospect_status: "meeting_booked",
          next_follow_up_at: null,
          meeting_at: new Date(meetingAt).toISOString(),
          meeting_reference: input.meetingReference?.trim() || null,
          meeting_booked_at: nowISO,
          meeting_booked_by: callerUserId,
        },
        cancelOtherQueueItems: true,
        suppress: null,
        exhausted: false,
        auditAction: "meeting_booked",
      });
    }
    case "bad_fit": {
      const reason = input.reason?.trim();
      if (!reason) return { ok: false, error: "Say why this firm is a bad fit." };
      return done({
        firmPatch: { ...base, prospect_status: "bad_fit", bad_fit_reason: reason },
        cancelOtherQueueItems: true,
        suppress: null,
        exhausted: false,
        auditAction: "bad_fit",
      });
    }
    case "do_not_contact": {
      const reason = input.reason?.trim();
      if (!reason) return { ok: false, error: "Record why they must not be contacted." };
      return done({
        firmPatch: {
          ...base,
          prospect_status: "do_not_contact",
          do_not_contact: true,
          do_not_contact_at: nowISO,
          do_not_contact_reason: reason,
          do_not_contact_by: callerUserId,
        },
        cancelOtherQueueItems: true,
        suppress: { reason },
        exhausted: false,
        auditAction: "do_not_contact",
      });
    }
    default:
      return { ok: false, error: "Unknown outcome" };
  }
}
