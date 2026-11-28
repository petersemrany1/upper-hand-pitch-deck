// The portal serves two businesses. Sections that exist for both show a
// Hair Transplants / Legal switch at the top; the choice lives in the URL
// (?biz=legal) so links and refreshes keep it, and the last pick per section
// is remembered for next time.

export type Business = "hair" | "legal";
export type BusinessView = Business | "both";

export const BUSINESS_LABEL: Record<BusinessView, string> = {
  hair: "Hair Transplants",
  legal: "Legal",
  both: "Both",
};

// Brand colour per business, used for chips, dots and the switch.
export const BUSINESS_COLOR: Record<Business, { fg: string; bg: string; border: string }> = {
  hair: { fg: "#c2410c", bg: "#fff1ee", border: "#fbd5c9" },
  legal: { fg: "#1e40af", bg: "#eef2ff", border: "#c7d2fe" },
};

export type SwitchableSection = {
  // Upper Hand path prefix the section lives at.
  path: string;
  // Matching page in the Legal app.
  legalPath: string;
  // Whether a combined "Both" view exists.
  both?: boolean;
  // "Both" shows the two pages one above the other (whole-page dashboards)
  // instead of side by side, and is where the section opens by default.
  stacked?: boolean;
  // The Legal screen to show when it lives at a different path (e.g. /legal/dashboard).
  legalNative?: string;
};

export const SWITCHABLE_SECTIONS: SwitchableSection[] = [
  { path: "/", legalPath: "/dashboard", legalNative: "/legal/dashboard", both: true, stacked: true },
  { path: "/partner-clinics", legalPath: "/firm-portal", legalNative: "/legal/firm-portal", both: true, stacked: true },
  { path: "/sales-call", legalPath: "/sales-call" },
  { path: "/inbox", legalPath: "/inbox" },
  { path: "/booked-appointments", legalPath: "/booked-appointments" },
  { path: "/numbers", legalPath: "/numbers", both: true },
  { path: "/pitch-deck", legalPath: "/pitch-deck" },
  { path: "/leads", legalPath: "/leads" },
  { path: "/leaderboard", legalPath: "/leaderboard" },
  { path: "/my-recordings", legalPath: "/transcripts" },
  { path: "/training", legalPath: "/training" },
];

export function sectionForPath(pathname: string): SwitchableSection | null {
  return (
    SWITCHABLE_SECTIONS.find(
      (s) => pathname === s.path || (s.path !== "/" && pathname.startsWith(`${s.path}/`)),
    ) ?? null
  );
}

export function parseBusinessView(value: unknown, allowBoth: boolean): BusinessView | null {
  if (value === "hair" || value === "legal") return value;
  if (value === "both" && allowBoth) return "both";
  return null;
}

const storageKey = (path: string) => `upperhand-biz:${path}`;

export function rememberedView(path: string): BusinessView | null {
  try {
    const v = window.localStorage.getItem(storageKey(path));
    return v === "hair" || v === "legal" || v === "both" ? v : null;
  } catch {
    return null;
  }
}

export function rememberView(path: string, view: BusinessView): void {
  try {
    window.localStorage.setItem(storageKey(path), view);
  } catch {
    /* private mode: the URL still carries the choice */
  }
}
