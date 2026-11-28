// Ported from the Legal app (family-law-floater/src/lib/handover.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { firmAllocatesLawyer, TRILOGY_ALLOCATION_LABEL } from "./firm-lawyer-allocation";
import { appointmentOffice } from "./firm-offices";
// Firm handover email. Nothing about the deposit, the $75, Stripe, refunds or
// payment links may ever appear in anything a firm sees.
import { createHmac, timingSafeEqual } from "node:crypto";
import { containsBannedContent, lineLeaksBannedContent } from "./ai-analysis.server";
import { publicBaseUrl } from "./twilio.server";
import { INTERNAL_ALERT_TO, sendEmail } from "./email.server";
import { parseHandoverCc } from "./handover-recipients";
import { getHandoverCc, HANDOVER_OWNER_EMAIL } from "./handover-recipients.server";
import { formatIntelNotes, intelSections, renderIntelHtml } from "./handover-intel-format";
import { singleFlight } from "./intel-cache.server";
import { handoverWork, HandoverContinuation, retryableIntelError } from "./handover-work.server";
import type { HandoverIntelResult } from "./handover-stream";
import boldLogo from "@/legal/assets/bold-mark.png.asset.json";

export type ConflictAction = "flag" | "clear";

export function signConflictLink(appointmentId: string, action: ConflictAction): string {
  const secret = legalEnv["HANDOVER_LINK_SECRET"];
  if (!secret) throw new Error("HANDOVER_LINK_SECRET is not configured");
  return createHmac("sha256", secret).update(`${appointmentId}:${action}`).digest("hex");
}

export function verifyConflictLink(
  appointmentId: string,
  action: string,
  signature: string,
): boolean {
  if (action !== "flag" && action !== "clear") return false;
  try {
    const expected = Buffer.from(signConflictLink(appointmentId, action));
    const given = Buffer.from(signature);
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dash(value: unknown): string {
  const text = String(value ?? "").trim();
  return text.length ? esc(text) : "—";
}

function prettyDate(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return esc(date);
  return parsed.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function cleanIntelNotes(raw: string | null | undefined, clientName = ""): string {
  const sections = intelSections(String(raw ?? ""));
  const cleaned = sections
    .flatMap((section) =>
      section.points
        .filter(
          (point) =>
            !/^\s*\[\s*\d{1,2}:\d{2}\s*(am|pm)?\s*\]\s*objection:/i.test(point) &&
            !lineLeaksBannedContent(`- ${section.category}: ${point}`),
        )
        .map((point) => `- ${section.category}: ${point}`),
    )
    .join("\n");
  return formatIntelNotes(cleaned, clientName);
}

export type HandoverData = {
  lead: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    relationship_stage: string | null;
    has_kids_under_18: boolean | null;
    asset_band: string | null;
    settlement_timeline: string | null;
    funding_preference: string | null;
    ex_partner_full_name: string | null;
    booking_date: string | null;
    booking_time: string | null;
    call_notes: string | null;
  };
  firmName: string;
  lawyerName: string | null;
  appointmentId: string;
  consultMode?: "in_person" | "zoom";
  office?: ReturnType<typeof appointmentOffice>;
};

export function renderHandoverEmail(data: HandoverData): { subject: string; html: string } {
  const { lead } = data;
  const clientName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "New client";
  const intel = cleanIntelNotes(lead.call_notes, clientName);

  const flagUrl = `${publicBaseUrl()}/api/public/conflict?apt=${encodeURIComponent(
    data.appointmentId,
  )}&action=flag&sig=${signConflictLink(data.appointmentId, "flag")}`;
  const clearUrl = `${publicBaseUrl()}/api/public/conflict?apt=${encodeURIComponent(
    data.appointmentId,
  )}&action=clear&sig=${signConflictLink(data.appointmentId, "clear")}`;

  const isZoom = data.consultMode === "zoom";
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:13px 18px;border-bottom:1px solid #eceefb;font:600 12px/1.4 ${font};color:#6b72a6;letter-spacing:.04em;text-transform:uppercase;width:38%">${label}</td>` +
    `<td style="padding:13px 18px;border-bottom:1px solid #eceefb;font:500 15px/1.5 ${font};color:#0b1033">${value}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f5f6ff;padding:32px 16px">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e6e8fb;box-shadow:0 18px 40px rgba(15,17,60,.08)">
  <div style="background:#2c3af5;background-image:linear-gradient(120deg,#2c3af5 0%,#4b3df0 55%,#a855f7 100%);padding:30px 32px">
    <img src="${publicBaseUrl()}${boldLogo.url}" alt="Bold Marketing" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:999px;background:#ffffff" />
    <div style="font:800 24px/1.25 ${font};color:#ffffff;margin-top:18px;letter-spacing:-.02em">Client handover</div>
    <div style="font:500 14px/1.5 ${font};color:#dcdcff;margin-top:6px">${esc(
      data.firmName,
    )}${data.lawyerName ? ` &middot; ${esc(data.lawyerName)}` : ""}</div>
  </div>

  <div style="padding:32px">
    ${
      isZoom
        ? `<div style="margin:0 0 20px;padding:16px 20px;background:#fff6e5;border:1px solid #f5c86b;border-left:4px solid #e59a12;border-radius:12px;font:600 15px/1.6 ${font};color:#7a4a00">💻 This is a ZOOM consult — please email ${esc(
            [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "the client",
          )} the Zoom link before the appointment${lead.email ? ` at <strong>${esc(lead.email)}</strong>` : ""}.</div>`
        : ""
    }
    <div style="font:700 12px/1 ${font};letter-spacing:.14em;text-transform:uppercase;color:#2c3af5;margin:0 0 14px">Key facts</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8fb;border-radius:14px;border-collapse:separate;overflow:hidden;background:#fbfbff">
      ${row("Client", dash(clientName))}
      ${row("Phone", dash(lead.phone))}
      ${row("Email", dash(lead.email))}
      ${row("Consultation", `${prettyDate(lead.booking_date)}${lead.booking_time ? ` at ${esc(lead.booking_time)}` : ""}`)}
      ${row("Consult type", isZoom ? "<strong>Zoom video call</strong> — please email the client the Zoom link" : "In person at your office")}
      ${!isZoom && data.office?.name ? row("Office", dash(data.office.name)) : ""}
      ${!isZoom && data.office?.address ? row("Address", dash(data.office.address)) : ""}
      ${!isZoom && data.office?.parking ? row("Parking", dash(data.office.parking)) : ""}
      ${row("Lawyer", dash(data.lawyerName))}
      ${row("Other side", dash(lead.ex_partner_full_name))}
    </table>

    <div style="height:1px;background:#eceefb;margin:32px 0"></div>

    <div style="font:700 12px/1 ${font};letter-spacing:.14em;text-transform:uppercase;color:#a855f7;margin:0 0 20px">Client intel</div>
    <!-- CLIENT_INTEL_START -->${renderIntelHtml(intel)}<!-- CLIENT_INTEL_END -->

  </div>

  <div style="background:#0b1033;padding:20px 32px;font:500 12px/1.6 ${font};color:#9aa0d0">
    Confidential client handover
  </div>
</div></body></html>`;

  return {
    subject: isZoom
      ? `ZOOM CONSULT — please send Zoom link — ${clientName}`
      : `New client consultation — ${clientName}`,
    html,
  };
}

/** Gate: consultation booked AND the $75 deposit collected. AI intel never blocks. */
export async function handoverReadiness(leadId: string): Promise<{
  ready: boolean;
  reason?: string;
}> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: lead } = await supabaseAdmin
    .from("client_leads")
    .select("booking_date, firm_id, deposit_paid_at")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ready: false, reason: "Lead not found" };
  if (!lead.booking_date || !lead.firm_id) {
    return { ready: false, reason: "Book the consultation first" };
  }
  if (!lead.deposit_paid_at) {
    return { ready: false, reason: "Collect the $75 deposit first" };
  }
  return { ready: true };
}

type HandoverBundle = {
  ok: boolean;
  error?: string;
  to?: string;
  cc?: string[];
  automaticCc?: string[];
  subject?: string;
  html?: string;
  notes?: string;
  firmName?: string;
  lawyerName?: string | null;
  clientName?: string;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  funding?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
};

/** Builds the exact email the firm would receive, so the rep can read it first. */
export async function handoverPreview(
  leadId: string,
  notesOverride?: string,
  fundingOverride?: string,
): Promise<HandoverBundle> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const readiness = await handoverReadiness(leadId);
  if (!readiness.ready) return { ok: false, error: readiness.reason ?? "Not ready" };

  const { data: lead } = await supabaseAdmin
    .from("client_leads")
    .select(
      "id, first_name, last_name, email, phone, city, relationship_stage, has_kids_under_18, asset_band, settlement_timeline, funding_preference, ex_partner_full_name, booking_date, booking_time, call_notes, rep_notes, firm_id, lawyer_id",
    )
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Lead not found" };

  const { data: firm } = await supabaseAdmin
    .from("firms")
    .select("firm_name, email")
    .eq("id", lead.firm_id!)
    .maybeSingle();
  if (!firm) return { ok: false, error: "Firm not found" };

  const { data: lawyer } = lead.lawyer_id
    ? await supabaseAdmin.from("firm_lawyers").select("name").eq("id", lead.lawyer_id).maybeSingle()
    : { data: null };

  const { data: appointment } = await supabaseAdmin
    .from("firm_appointments")
    .select("id, consult_mode, location_id, location_name, location_address, location_parking_info, location_nearby_landmarks")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!appointment) return { ok: false, error: "No appointment found for this lead" };

  const notes =
    typeof notesOverride === "string"
      ? notesOverride
      : cleanIntelNotes(
          (lead.call_notes || lead.rep_notes) as string | null,
          [lead.first_name, lead.last_name].filter(Boolean).join(" "),
        );
  // Intel generation (transcription + AI summary) is deliberately NOT done here:
  // it can take minutes and would blow the platform request budget, which the
  // browser reports as an opaque "Failed to fetch". It runs in its own call —
  // see generateHandoverIntel below.

  const funding =
    typeof fundingOverride === "string" ? fundingOverride : (lead.funding_preference ?? null);

  const { subject, html } = renderHandoverEmail({
    lead: { ...(lead as HandoverData["lead"]), call_notes: notes, funding_preference: funding },
    firmName: firm.firm_name,
    lawyerName: lawyer?.name ?? (firmAllocatesLawyer(lead.firm_id) ? TRILOGY_ALLOCATION_LABEL : null),
    appointmentId: appointment.id,
    office: appointmentOffice(appointment),
    consultMode: appointment.consult_mode === "zoom" ? "zoom" : "in_person",
  });

  return {
    ok: true,
    to: firm.email ?? "",
    cc: await getHandoverCc(lead.firm_id!),
    automaticCc: [HANDOVER_OWNER_EMAIL],
    subject,
    html,
    notes,
    firmName: firm.firm_name,
    lawyerName: lawyer?.name ?? (firmAllocatesLawyer(lead.firm_id) ? TRILOGY_ALLOCATION_LABEL : null),
    clientName: [lead.first_name, lead.last_name].filter(Boolean).join(" "),
    appointmentDate: lead.booking_date ?? null,
    appointmentTime: lead.booking_time ?? null,
    funding,
    clientPhone: lead.phone ?? null,
    clientEmail: lead.email ?? null,
  };
}

/**
 * Builds the client-intel summary on its own request, so a slow transcription /
 * AI step can never take the handover preview or the send with it.
 * Reuses only source- and prompt-matched, verified AI output. Existing notes
 * are source material only, never automatically a finished firm handover.
 */
const pendingHandoverIntel = singleFlight<HandoverIntelResult>();

export function generateHandoverIntel(leadId: string): Promise<HandoverIntelResult> {
  return pendingHandoverIntel(leadId, () => buildHandoverIntel(leadId));
}

async function buildHandoverIntel(leadId: string): Promise<HandoverIntelResult> {
  try {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { data: lead, error } = await supabaseAdmin
      .from("client_leads")
      .select("call_notes, first_name, last_name")
      .eq("id", leadId)
      .abortSignal(AbortSignal.timeout(10_000))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lead) return { notes: null, error: "Lead not found" };
    const { condenseNotes, expandRepNotes, ensureRecentCallTranscribed } =
      await import("@/legal/lib/ai-analysis.server");
    const work = handoverWork();
    await ensureRecentCallTranscribed(leadId, 120_000, work);
    const generated = (await condenseNotes(leadId, work)) || (await expandRepNotes(leadId, work));
    if (!generated) {
      return { notes: null, error: "There is no transcript or call notes for the AI to summarise" };
    }
    return {
      notes: cleanIntelNotes(
        generated,
        [lead.first_name, lead.last_name].filter(Boolean).join(" "),
      ),
    };
  } catch (err) {
    if (err instanceof HandoverContinuation) {
      return { notes: null, pending: true, stage: err.stage, retryAfterMs: err.retryAfterMs };
    }
    console.error("[handover] intel summary failed", err);
    return { notes: null, error: (err as Error).message, retryable: retryableIntelError(err) };
  }
}

export async function sendHandoverEmail(
  leadId: string,
  override?: { to?: string; cc?: string; notes?: string; funding?: string },
): Promise<{ ok: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const bundle = await handoverPreview(leadId, override?.notes, override?.funding);
  if (!bundle.ok) return { ok: false, error: bundle.error ?? "Not ready" };

  const to = String(override?.to ?? bundle.to ?? "").trim();
  if (!to) return { ok: false, error: "No email address to send the handover to" };

  let cc: string[];
  try {
    cc = [
      ...new Set([...parseHandoverCc(override?.cc ?? bundle.cc ?? [], to), HANDOVER_OWNER_EMAIL]),
    ].filter((email) => email !== to.toLowerCase());
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  const html = bundle.html!;
  // Per-line check so a legitimate asset fact ("rental income deposited into an
  // offset account") never blocks the send, while our own payment wording still does.
  const intelLines = intelSections(bundle.notes ?? "").flatMap((section) =>
    section.points.map((point) => `- ${section.category}: ${point}`),
  );
  const nonIntelHtml = html.replace(
    /<!-- CLIENT_INTEL_START -->[\s\S]*?<!-- CLIENT_INTEL_END -->/,
    "",
  );
  const leaks = [
    ...new Set(
      [...intelLines, ...nonIntelHtml.split(/<[^>]*>|\n/)].flatMap((line) =>
        lineLeaksBannedContent(line) ? containsBannedContent(line) : [],
      ),
    ),
  ];
  if (leaks.length) {
    console.error("[handover] blocked: banned content", leaks);
    return { ok: false, error: "Handover blocked — internal payment wording detected" };
  }

  const sent = await sendEmail({ to: [to], cc, subject: bundle.subject!, html });
  if (!sent.ok) return { ok: false, error: sent.error ?? "Email failed" };

  // Persist any edits the rep made so the record matches what the firm got.
  if (typeof override?.notes === "string") {
    await supabaseAdmin
      .from("client_leads")
      .update({ call_notes: override.notes })
      .eq("id", leadId);
  }
  if (typeof override?.funding === "string" && override.funding.trim()) {
    await supabaseAdmin
      .from("client_leads")
      .update({ funding_preference: override.funding.trim() })
      .eq("id", leadId);
  }
  await supabaseAdmin
    .from("client_leads")
    .update({ handover_sent_at: new Date().toISOString(), status: "booked_deposit_paid" })
    .eq("id", leadId);

  // The firm portal must show exactly the same comprehensive brief the firm just
  // received by email — overwrite any earlier, thinner version.
  if (bundle.notes?.trim()) {
    const { data: appointment } = await supabaseAdmin
      .from("firm_appointments")
      .select("id")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (appointment) {
      await supabaseAdmin
        .from("firm_appointments")
        .update({ intel_notes: bundle.notes })
        .eq("id", appointment.id);
    }
  }

  return { ok: true };
}

export async function applyConflictDecision(
  appointmentId: string,
  action: ConflictAction,
): Promise<{ ok: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: appointment } = await supabaseAdmin
    .from("firm_appointments")
    .select("id, lead_id, firm_id, appointment_date, appointment_time")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) return { ok: false, error: "Appointment not found" };

  const { error } = await supabaseAdmin
    .from("firm_appointments")
    .update({
      conflict_status: action === "flag" ? "conflict" : "cleared",
      conflict_resolved_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);
  if (error) return { ok: false, error: error.message };

  if (action === "flag") {
    const { data: lead } = appointment.lead_id
      ? await supabaseAdmin
          .from("client_leads")
          .select("first_name, last_name, ex_partner_full_name")
          .eq("id", appointment.lead_id)
          .maybeSingle()
      : { data: null };
    await sendEmail({
      to: [INTERNAL_ALERT_TO],
      subject: "⚠️ Conflict flagged by firm",
      text: [
        "A partner firm has flagged a conflict on a booked consultation.",
        "",
        `Client: ${[lead?.first_name, lead?.last_name].filter(Boolean).join(" ") || "unknown"}`,
        `Other side: ${lead?.ex_partner_full_name ?? "unknown"}`,
        `Appointment: ${appointment.appointment_date ?? "?"} ${appointment.appointment_time ?? ""}`,
      ].join("\n"),
    });
  }
  return { ok: true };
}
