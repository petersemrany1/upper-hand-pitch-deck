// One CRM for both businesses.
//
// Hair Transplants: partner-clinic prospects (`clinics` in the Upper Hand DB).
// Legal: law-firm applications (`firm_applications` in the Legal DB).
//
// Each business keeps its own exact stages. To compare them side by side the
// "Both" view rolls every stage up into the same seven phases.

import type { Business } from "@/lib/business";

export type Phase = "new" | "contacting" | "follow_up" | "meeting" | "proposal" | "won" | "lost";

export const PHASES: { key: Phase; label: string; hint: string }[] = [
  { key: "new", label: "New", hint: "Not contacted yet" },
  { key: "contacting", label: "Contacting", hint: "Trying to reach them" },
  { key: "follow_up", label: "Follow up", hint: "Spoke, call back" },
  { key: "meeting", label: "Meeting booked", hint: "Zoom or Calendly set" },
  { key: "proposal", label: "Proposal / contract", hint: "Waiting on a signature" },
  { key: "won", label: "Signed", hint: "Partner" },
  { key: "lost", label: "Lost", hint: "Not interested / dead" },
];

export type StageDef = { value: string; label: string; phase: Phase };

export const HAIR_STAGES: StageDef[] = [
  { value: "Not Started", label: "Not started", phase: "new" },
  { value: "Contacted — No Answer", label: "No answer", phase: "contacting" },
  { value: "Contacted — Gatekeeper", label: "Gatekeeper", phase: "contacting" },
  { value: "Sent Email/Loom", label: "Sent email / Loom", phase: "contacting" },
  { value: "Queue for Sending Letter", label: "Letter queued", phase: "contacting" },
  { value: "Letter Sent", label: "Letter sent", phase: "contacting" },
  { value: "Contacted — Call Me Back", label: "Call me back", phase: "follow_up" },
  { value: "Zoom Set", label: "Zoom set", phase: "meeting" },
  { value: "Contract Sent", label: "Contract sent", phase: "proposal" },
  { value: "Signed", label: "Signed", phase: "won" },
  { value: "Pay on Conversion", label: "Pay on conversion", phase: "won" },
  { value: "Contacted — Not Interested", label: "Not interested", phase: "lost" },
  { value: "Not Applicable", label: "Not applicable", phase: "lost" },
];

export const LEGAL_STAGES: StageDef[] = [
  { value: "new", label: "New", phase: "new" },
  { value: "no_answer", label: "No answer", phase: "contacting" },
  { value: "follow_up", label: "Follow ups", phase: "follow_up" },
  { value: "calendly_booked", label: "Calendly booked", phase: "meeting" },
  { value: "zoom_booked", label: "Zoom booked", phase: "meeting" },
  { value: "proposal_sent", label: "Proposal sent", phase: "proposal" },
  { value: "signed", label: "Signed", phase: "won" },
  { value: "dead", label: "Dead", phase: "lost" },
];

export const STAGES_BY_BUSINESS: Record<Business, StageDef[]> = { hair: HAIR_STAGES, legal: LEGAL_STAGES };

// Stages kept out of the CRM entirely.
export const HIDDEN_STAGES = new Set(["TEST"]);

export function stageDef(business: Business, stage: string): StageDef {
  return (
    STAGES_BY_BUSINESS[business].find((s) => s.value === stage) ?? {
      value: stage,
      label: stage,
      // Unknown stages are treated as still being worked, never silently won or lost.
      phase: "contacting",
    }
  );
}

export type CrmRecord = {
  business: Business;
  id: string;
  name: string; // clinic / firm name
  person: string | null; // owner / applicant
  phone: string | null;
  email: string | null;
  city: string | null;
  stage: string;
  createdAt: string;
  // Next follow-up (hair) or booked meeting start (legal).
  nextAt: string | null;
  source: string | null; // ad / campaign for legal applications
};

export function phaseOf(r: Pick<CrmRecord, "business" | "stage">): Phase {
  return stageDef(r.business, r.stage).phase;
}

export function matchesSearch(r: CrmRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, "");
  const hay = [r.name, r.person, r.email, r.city, r.source].filter(Boolean).join(" ").toLowerCase();
  if (hay.includes(needle)) return true;
  return digits.length >= 4 && (r.phone ?? "").replace(/\D/g, "").includes(digits);
}

export type BusinessSummary = { total: number; open: number; meetings: number; signed: number; lost: number };

export function summarise(records: CrmRecord[]): BusinessSummary {
  const s: BusinessSummary = { total: records.length, open: 0, meetings: 0, signed: 0, lost: 0 };
  for (const r of records) {
    const p = phaseOf(r);
    if (p === "won") s.signed += 1;
    else if (p === "lost") s.lost += 1;
    else {
      s.open += 1;
      if (p === "meeting" || p === "proposal") s.meetings += 1;
    }
  }
  return s;
}

export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}
