// Ported from the Legal app (family-law-floater/src/lib/handover-intel-format.ts). Re-run the port script to refresh.
/** Presentation only: groups verified facts without summarising or inventing details. */
const SECTION_TITLES: Record<string, string> = {
  Situation: "Background and current proceedings",
  Assets: "Assets, liabilities and contributions",
  "Income / work": "Employment and income",
  "Other side": "Other party and legal representation",
  Goal: "What the client wants to achieve",
  Funding: "Funding for legal costs",
  Pricing: "Pricing discussed",
  "Why now": "Timing and urgency",
  "Question for the lawyer": "Questions raised by the client",
  "Objections / risks": "Client concerns",
  "Case details": "Case details",
};
export type IntelSection = { category: string; title: string; points: string[] };
export function intelSections(raw: string): IntelSection[] {
  const sections = new Map<string, IntelSection>();
  let current = "Case details";
  for (const line of raw.split("\n")) {
    const text = line.replace(/^\s*(?:[-•]\s*|#{1,3}\s*)?/, "").trim();
    if (!text) continue;
    const heading = Object.entries(SECTION_TITLES).find(([label, title]) =>
      [label, title].some((value) => value.toLowerCase() === text.replace(/:$/, "").toLowerCase()),
    );
    if (heading) {
      current = heading[0];
      continue;
    }
    const tagged = Object.keys(SECTION_TITLES).find((label) =>
      text.toLowerCase().startsWith(`${label.toLowerCase()}:`),
    );
    const category = tagged ?? current;
    const point = tagged ? text.slice(tagged.length + 1).trim() : text;
    if (!point) continue;
    // An absent pricing discussion must not produce a heading or placeholder.
    if (
      category === "Pricing" &&
      /^(?:(?:legal |lawyer(?:'s)? |hourly |pricing |fees? |rates? )*(?:was |were |is |are )?(?:not |never )(?:discussed|confirmed|mentioned|provided|identified|recorded|stated)|no (?:legal |lawyer(?:'s)? |hourly )?(?:pricing|fees?|rates?)\b|unknown\b|n\/a\b|—$)/i.test(
        point,
      )
    )
      continue;
    if (!sections.has(category))
      sections.set(category, { category, title: SECTION_TITLES[category] ?? category, points: [] });
    const points = sections.get(category)!.points;
    if (!points.includes(point)) points.push(point);
  }
  const order = Object.keys(SECTION_TITLES);
  return [...sections.values()].sort(
    (a, b) =>
      (order.indexOf(a.category) < 0 ? 99 : order.indexOf(a.category)) -
      (order.indexOf(b.category) < 0 ? 99 : order.indexOf(b.category)),
  );
}
export function formatIntelNotes(raw: string, clientName = ""): string {
  return intelSections(raw)
    .map(
      (section) =>
        `${section.title}\n${section.points
          .map((point) => {
            // Avoid a repeated full name without changing attribution, figures or quotations.
            if (clientName && point.startsWith(`${clientName} `))
              point = `The client ${point.slice(clientName.length + 1)}`;
            return `- ${point}`;
          })
          .join("\n")}`,
    )
    .join("\n\n");
}
const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function renderIntelHtml(raw: string): string {
  const sections = intelSections(raw);
  return sections.length
    ? sections
        .map(
          (section) =>
            `<section style="margin:0 0 24px"><h3 style="margin:0 0 9px;font-size:16px;line-height:1.4;color:#141a3d">${escapeHtml(section.title)}</h3><ul style="margin:0;padding-left:21px">${section.points.map((point) => `<li style="margin:0 0 8px;padding-left:3px;font-size:14px;line-height:1.65;color:#27314b">${escapeHtml(point)}</li>`).join("")}</ul></section>`,
        )
        .join("")
    : '<p style="color:#6b72a6">No call intel recorded.</p>';
}
export function withIntelPreview(html: string, notes: string): string {
  return html.replace(
    /<!-- CLIENT_INTEL_START -->[\s\S]*?<!-- CLIENT_INTEL_END -->/,
    `<!-- CLIENT_INTEL_START -->${renderIntelHtml(notes)}<!-- CLIENT_INTEL_END -->`,
  );
}

export function handoverFieldLabel(value: string | null): string {
  if (!value) return "—";
  const labels: Record<string, string> = {
    separated_not_started: "Separated, not started",
    underway: "Underway",
    planning: "Planning",
    researching: "Researching",
    under_1m: "Under $1 million",
    "1m_2m": "$1 million–$2 million",
    "2m_5m": "$2 million–$5 million",
    over_5m: "Over $5 million",
    asap: "As soon as possible",
    "1_3_months": "1–3 months",
    "3_6_months": "3–6 months",
    no_rush: "No rush",
    savings: "Savings",
    family: "Family",
    litigation_funding: "Litigation funding",
    not_sure: "Not confirmed",
  };
  return labels[value] ?? value;
}
