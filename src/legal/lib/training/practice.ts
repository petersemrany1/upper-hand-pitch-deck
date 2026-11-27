// Ported from the Legal app (family-law-floater/src/lib/training/practice.ts). Re-run the port script to refresh.
// AI practice calls: the ElevenLabs agent and the fictional clients it plays.
// The agent's prompt (docs/training/practice-agent-prompt.md) holds each persona's full
// story; this file only has what the call screen needs to show them as a lead. Every
// persona here must have its card in the prompt (tests/training.test.ts checks), and the
// live ElevenLabs agent must be re-pasted from that file before a new persona goes live.

import type { CallLead } from "@/legal/lib/sales-call";

/** "Legal Group - Practice Client" in Peter's ElevenLabs account. */
export const PRACTICE_AGENT_ID = "agent_6601m4jdckrjex5t7vz2171jbmec";

/** sessionStorage key: a practice call that started but may not be saved yet. */
export const PENDING_PRACTICE_CALL_KEY = "practice-pending-conversation";

/** Never a real lead id: every server function that writes to a lead requires a UUID. */
export const PRACTICE_LEAD_ID = "practice-ai-client";

export type PracticePersona = {
  id: "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8" | "P9";
  firstName: string;
  lastName: string;
  /** How they answer the phone. */
  pickup: string;
  /** ElevenLabs voice. Undefined = the agent's default (Australian female). */
  voiceId?: string;
  /** Male personas need a male voice before they can be used. */
  needsMaleVoice?: boolean;
  /**
   * Their card is in docs/training/practice-agent-prompt.md but not yet pasted into the live
   * ElevenLabs agent, so the app doesn't offer them. Delete the flag once the prompt is re-pasted.
   */
  awaitingAgentPrompt?: boolean;
  city: string;
  relationshipStage: string;
  kidsUnder18: boolean;
  assetBand: string;
  funding: string;
  summary: string;
};

export const PERSONAS: PracticePersona[] = [
  {
    id: "P1",
    firstName: "Michelle",
    lastName: "Hughes",
    pickup: "Hello, Michelle speaking.",
    city: "Sydney",
    relationshipStage: "separated_not_started",
    kidsUnder18: true,
    assetBand: "1m_2m",
    funding: "not_sure",
    summary: "Separated mum, joint home, two kids. The whole call, done cleanly.",
  },
  {
    id: "P2",
    firstName: "Craig",
    lastName: "Barker",
    pickup: "Yeah, Craig.",
    voiceId: "aGkVQvWUZi16EH8aZJvT", // Steve - Australian Male
    needsMaleVoice: true,
    city: "Sydney",
    relationshipStage: "underway",
    kidsUnder18: true,
    assetBand: "1m_2m",
    funding: "litigation_funding",
    summary: "FIFO worker, still under the same roof, his ex runs the money.",
  },
  {
    id: "P3",
    firstName: "Jess",
    lastName: "Doyle",
    pickup: "Hello?",
    voiceId: "LtPsVjX1k0Kl4StEMZPK", // Sophia - Young Australian Female
    city: "Sydney",
    relationshipStage: "researching",
    kidsUnder18: false,
    assetBand: "1m_2m",
    funding: "savings",
    summary: "De facto, nearly two years since the split, apartment in his name.",
  },
  {
    id: "P4",
    firstName: "Lyn",
    lastName: "Ellis",
    pickup: "Hello, this is Lyn.",
    city: "Sydney",
    relationshipStage: "underway",
    kidsUnder18: false,
    assetBand: "2m_5m",
    funding: "savings",
    summary: "Married 34 years, his lawyer has sent an offer with a deadline.",
  },
  {
    id: "P5",
    firstName: "Dan",
    lastName: "Walsh",
    pickup: "Dan speaking.",
    voiceId: "CFN1FeTIoSu4xm6mDCkI", // David - Australian (the HTG "Dave" voice)
    needsMaleVoice: true,
    city: "Sydney",
    relationshipStage: "underway",
    kidsUnder18: true,
    assetBand: "1m_2m",
    funding: "savings",
    summary: "Business owner, burnt by a lawyer's fees, doesn't trust anyone.",
  },
  {
    id: "P6",
    firstName: "Sonia",
    lastName: "Turner",
    pickup: "Hello, Sonia here.",
    voiceId: "LtPsVjX1k0Kl4StEMZPK", // Sophia - Young Australian Female
    city: "Brisbane",
    relationshipStage: "separated_not_started",
    kidsUnder18: true,
    assetBand: "under_1m",
    funding: "not_sure",
    summary: "Separated mum in Brisbane, renting, money's tight. Work out whether she's a fit.",
  },
  {
    id: "P7",
    firstName: "Tom",
    lastName: "Harris",
    pickup: "Tom speaking.",
    voiceId: "CFN1FeTIoSu4xm6mDCkI", // David - Australian (shared with Dan)
    needsMaleVoice: true,
    city: "Sydney",
    relationshipStage: "separated_not_started",
    kidsUnder18: true,
    assetBand: "under_1m",
    funding: "litigation_funding",
    summary: "Dad whose ex moved the kids away; his 11-year-old won't come on his weekends.",
  },
  {
    id: "P8",
    firstName: "Priya",
    lastName: "Sharma",
    pickup: "Hello, Priya speaking.",
    city: "Sydney",
    relationshipStage: "underway",
    kidsUnder18: true,
    assetBand: "2m_5m",
    funding: "not_sure",
    summary: "Still under one roof with her ex; his lawyer's letter has a reply date.",
  },
  {
    id: "P9",
    firstName: "Mark",
    lastName: "Fletcher",
    pickup: "Mark.",
    voiceId: "aGkVQvWUZi16EH8aZJvT", // Steve - Australian Male (shared with Craig)
    needsMaleVoice: true,
    city: "Gold Coast",
    relationshipStage: "underway",
    kidsUnder18: false,
    assetBand: "2m_5m",
    funding: "savings",
    summary:
      "Follow-up: last Tuesday he gave you two minutes. He has a lawyer and isn't happy with them.",
  },
];

/**
 * Personas ready to use: a male persona needs its male voice set first, and a new persona
 * waits until its card is in the live agent's prompt.
 */
export function availablePersonas(): PracticePersona[] {
  return PERSONAS.filter((p) => !p.awaitingAgentPrompt && (!p.needsMaleVoice || p.voiceId));
}

/** First call is always P1; after that, a random ready persona. */
export function pickPersona(callsSoFar: number, random = Math.random): PracticePersona {
  const ready = availablePersonas();
  if (callsSoFar === 0) return ready.find((p) => p.id === "P1") ?? ready[0]!;
  return ready[Math.floor(random() * ready.length)] ?? ready[0]!;
}

/** A pretend lead so the real call screen has something to show. Never saved anywhere. */
export function practiceLead(p: PracticePersona): CallLead {
  return {
    id: PRACTICE_LEAD_ID,
    first_name: p.firstName,
    last_name: p.lastName,
    email: null,
    phone: "0400 000 000",
    city: p.city,
    campaign_name: "Practice",
    relationship_stage: p.relationshipStage,
    has_kids_under_18: p.kidsUnder18,
    asset_band: p.assetBand,
    settlement_timeline: null,
    funding_preference: p.funding,
    ex_partner_full_name: null,
    status: "new",
    call_notes: null,
    rep_notes: null,
    callback_scheduled_at: null,
    day_number: 1,
    booking_date: null,
    booking_time: null,
    firm_id: null,
    lawyer_id: null,
    rep_id: null,
    deposit_paid_at: null,
    deposit_amount: null,
    stripe_checkout_session_id: null,
    previous_lead_id: null,
    handover_sent_at: null,
    eligibility_verdict: null,
    eligibility_net_pool: null,
    eligibility_data: null,
    eligibility_flags: null,
    raw_payload: null,
    created_at: new Date().toISOString(),
  };
}

/** Minimum length for a practice call to count towards completing AI Training (Q43 default). */
export { MIN_PRACTICE_CALL_S } from "./content-facts";
