// Ported from the Legal app (family-law-floater/src/lib/cold-calling/handover.ts). Re-run the port script to refresh.
// The "Zoom set" handover email, written for Peter to read in one pass. Pure so it can be tested.
import { renderDebriefText, type FirmDebrief } from "./debrief";

export type HandoverInput = {
  firm: {
    firm_name: string;
    phone_e164: string | null;
    website: string | null;
    primary_city: string | null;
    state: string | null;
    office_locations: string[];
    family_law_team_size: number | null;
    accredited_specialist_count: number | null;
    fit_score: number | null;
    priority_tier: string | null;
    meeting_at: string | null;
    meeting_reference: string | null;
    follow_up_note: string | null;
    reason_1: string | null;
    reason_2: string | null;
    reason_3: string | null;
  };
  contacts: Array<{
    full_name: string;
    position: string | null;
    confidence: string | null;
    is_primary_decision_maker: boolean;
  }>;
  attempt: {
    started_at: string;
    duration_seconds: number | null;
    notes: string | null;
    attempt_number: number;
  };
  setterName: string;
  debrief: FirmDebrief | null;
  /** Shown instead of the debrief when there is none (no recording, or not ready). */
  debriefNote: string | null;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function when(iso: string | null, style: "full" | "short" = "full"): string {
  if (!iso) return "not set";
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    ...(style === "full"
      ? { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }
      : { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
  });
}

function minutes(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.round(seconds / 60);
  return m < 1 ? "under a minute" : `${m} min`;
}

function phone(e164: string | null): string {
  if (!e164) return "no number on file";
  const d = e164.replace(/\D/g, "");
  if (d.startsWith("61") && d.length === 11) {
    const n = d.slice(2);
    return n.startsWith("4")
      ? `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
      : `(0${n[0]}) ${n.slice(1, 5)} ${n.slice(5)}`;
  }
  return e164;
}

export function buildHandoverEmail(input: HandoverInput): {
  subject: string;
  text: string;
  html: string;
} {
  const { firm, attempt, debrief } = input;
  const primary =
    input.contacts.find((c) => c.is_primary_decision_maker) ?? input.contacts[0] ?? null;
  const others = input.contacts.filter((c) => c !== primary);
  const who = primary
    ? `${primary.full_name}${primary.position ? `, ${primary.position}` : ""}`
    : "decision-maker not confirmed";
  const subject = `Zoom set: ${primary?.full_name ?? "decision-maker TBC"} at ${firm.firm_name} — ${when(firm.meeting_at, "short")}`;
  const confidence = primary?.confidence
    ? ` (${primary.confidence.toLowerCase()} confidence they're the decision-maker)`
    : "";
  const dur = minutes(attempt.duration_seconds);

  // ---- plain text ----
  const lines: string[] = [];
  lines.push(`Hi Peter,`, "");
  lines.push(
    `${input.setterName} set a closer Zoom with ${who} at ${firm.firm_name}${confidence}.`,
  );
  lines.push(
    `When: ${when(firm.meeting_at)} (Sydney time)${firm.meeting_reference ? ` — ${firm.meeting_reference}` : ""}`,
  );
  lines.push(
    `The call: ${when(attempt.started_at)}${dur ? `, ${dur}` : ""}, attempt ${attempt.attempt_number}.`,
  );
  if (others.length)
    lines.push(
      `Also at the firm: ${others.map((c) => `${c.full_name}${c.position ? ` (${c.position})` : ""}`).join(", ")}`,
    );
  lines.push("");
  lines.push("THE FIRM");
  lines.push(
    `- ${firm.firm_name}, ${[firm.primary_city, firm.state].filter(Boolean).join(" ") || "location not verified"}${firm.office_locations.length > 1 ? `, ${firm.office_locations.length} offices` : ""}`,
  );
  lines.push(`- Phone ${phone(firm.phone_e164)}${firm.website ? ` · ${firm.website}` : ""}`);
  lines.push(
    `- ${firm.family_law_team_size ?? "?"} family lawyers, ${firm.accredited_specialist_count ?? "?"} accredited specialists · fit score ${firm.fit_score ?? "—"}, tier ${firm.priority_tier ?? "—"}`,
  );
  const reasons = [firm.reason_1, firm.reason_2, firm.reason_3].filter((r): r is string => !!r);
  for (const r of reasons) lines.push(`- Why we picked them: ${r}`);
  lines.push("");
  lines.push("HOW THE CALL WENT");
  lines.push(
    debrief ? renderDebriefText(debrief) : (input.debriefNote ?? "No call summary is available."),
  );
  lines.push("");
  lines.push(`${input.setterName.toUpperCase()}'S NOTES`);
  lines.push(attempt.notes?.trim() || "(none)");
  if (firm.follow_up_note) lines.push("", "EARLIER NOTES ON THIS FIRM", firm.follow_up_note);
  const text = lines.join("\n");

  // ---- html ----
  const h = (t: string) =>
    `<h3 style="margin:22px 0 6px;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:#555">${esc(t)}</h3>`;
  const ul = (items: string[], empty: string) =>
    `<ul style="margin:4px 0 0 18px;padding:0">${(items.length ? items : [empty]).map((i) => `<li style="margin:3px 0">${esc(i)}</li>`).join("")}</ul>`;
  const p = (t: string) => `<p style="margin:6px 0">${esc(t)}</p>`;
  let body = "";
  body += `<p style="margin:0 0 12px">Hi Peter,</p>`;
  body += `<p style="margin:0 0 6px;font-size:16px"><strong>${esc(input.setterName)}</strong> set a closer Zoom with <strong>${esc(who)}</strong> at <strong>${esc(firm.firm_name)}</strong>${esc(confidence)}.</p>`;
  body += p(
    `When: ${when(firm.meeting_at)} (Sydney time)${firm.meeting_reference ? ` — ${firm.meeting_reference}` : ""}`,
  );
  body += p(
    `The call: ${when(attempt.started_at)}${dur ? `, ${dur}` : ""}, attempt ${attempt.attempt_number}.`,
  );
  if (others.length)
    body += p(
      `Also at the firm: ${others.map((c) => `${c.full_name}${c.position ? ` (${c.position})` : ""}`).join(", ")}`,
    );
  body += h("The firm");
  body += ul(
    [
      `${firm.firm_name}, ${[firm.primary_city, firm.state].filter(Boolean).join(" ") || "location not verified"}${firm.office_locations.length > 1 ? `, ${firm.office_locations.length} offices` : ""}`,
      `Phone ${phone(firm.phone_e164)}${firm.website ? ` · ${firm.website}` : ""}`,
      `${firm.family_law_team_size ?? "?"} family lawyers, ${firm.accredited_specialist_count ?? "?"} accredited specialists · fit score ${firm.fit_score ?? "—"}, tier ${firm.priority_tier ?? "—"}`,
      ...reasons.map((r) => `Why we picked them: ${r}`),
    ],
    "",
  );
  body += h("How the call went");
  if (debrief) {
    const tone =
      debrief.temperature === "hot"
        ? "#166534"
        : debrief.temperature === "warm"
          ? "#1d4ed8"
          : debrief.temperature === "cold"
            ? "#991b1b"
            : "#92400e";
    body += `<p style="margin:6px 0;font-size:16px"><strong>${esc(debrief.headline)}</strong> <span style="color:${tone};font-weight:600">(${esc(debrief.temperature)})</span></p>`;
    body += `<p style="margin:6px 0"><strong>Who you're meeting:</strong> ${esc(debrief.who_we_spoke_to)}</p>`;
    body +=
      `<p style="margin:10px 0 0"><strong>Their situation</strong></p>` +
      ul(debrief.their_situation, "Not discussed");
    body +=
      `<p style="margin:10px 0 0"><strong>What they liked</strong></p>` +
      ul(debrief.what_they_liked, "Nothing specific stood out");
    body += `<p style="margin:10px 0 0"><strong>Concerns and hesitations</strong></p>`;
    if (debrief.concerns_and_hesitations.length === 0) body += ul([], "None raised");
    else
      body += `<ul style="margin:4px 0 0 18px;padding:0">${debrief.concerns_and_hesitations
        .map(
          (c) =>
            `<li style="margin:5px 0"><strong>${esc(c.concern)}</strong>${c.their_words ? `<br/><em>"${esc(c.their_words)}"</em>` : ""}${c.how_it_was_handled ? `<br/>Handled: ${esc(c.how_it_was_handled)}` : ""}</li>`,
        )
        .join("")}</ul>`;
    body += `<p style="margin:10px 0 0"><strong>Questions they asked</strong></p>`;
    body +=
      debrief.questions_they_asked.length === 0
        ? ul([], "None")
        : ul(
            debrief.questions_they_asked.map(
              (q) => `${q.question} (answered: ${q.answered})${q.note ? ` — ${q.note}` : ""}`,
            ),
            "",
          );
    body +=
      `<p style="margin:10px 0 0"><strong>Pricing</strong></p>` +
      ul(
        [
          `Price stated on the call: ${debrief.pricing.price_stated ? "yes" : "NO — say it early on the Zoom"}`,
          `Reaction: ${debrief.pricing.reaction}`,
          `Pack interest: ${debrief.pricing.pack_interest}`,
        ],
        "",
      );
    body +=
      `<p style="margin:10px 0 0"><strong>Commitments and next steps</strong></p>` +
      ul(debrief.commitments_and_next_steps, "Not discussed");
    body +=
      `<p style="margin:10px 0 0"><strong>Risks to the close</strong></p>` +
      ul(debrief.risks_to_the_close, "None obvious");
    body +=
      `<p style="margin:10px 0 0"><strong>How to open the Zoom</strong></p>` +
      ul(debrief.how_to_open_the_zoom, "Not discussed");
    if (debrief.setter_performance_note)
      body += `<p style="margin:10px 0 0;color:#555"><strong>Setter note:</strong> ${esc(debrief.setter_performance_note)}</p>`;
  } else {
    body += p(input.debriefNote ?? "No call summary is available.");
  }
  body += h(`${input.setterName}'s notes`);
  body += `<p style="margin:6px 0;white-space:pre-wrap">${esc(attempt.notes?.trim() || "(none)")}</p>`;
  if (firm.follow_up_note)
    body +=
      h("Earlier notes on this firm") +
      `<p style="margin:6px 0;white-space:pre-wrap">${esc(firm.follow_up_note)}</p>`;
  const html = `<div style="font-family:Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:680px">${body}</div>`;
  return { subject, text, html };
}
