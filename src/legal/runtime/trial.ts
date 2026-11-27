// Legal screens still being moved open natively only with ?legalData=portal
// ("try on copied records"); see src/legal/LegalView.tsx.
export const TRIAL_PATHS: ReadonlySet<string> = new Set([
  "/sales-call",
  "/inbox",
  "/booked-appointments",
  "/numbers",
  "/training",
  "/training/ai",
  "/training/audience",
  "/training/call-coaching",
  "/training/consultation-videos",
  "/training/knowledge-quiz",
  "/training/platform",
  "/training/practice-call",
  "/training/product-knowledge",
  "/training/read-along",
  "/training/sales-call-example",
  "/training/sales-framework",
  "/legal/dashboard",
  "/legal/firms",
  "/legal/firm-cold-calling",
  "/legal/ad-briefing",
  "/legal/handover-check",
  "/legal/settings",
  "/legal/firm-portal",
  "/legal/firm-offer",
  "/legal/firm-offer-complete",
  "/legal/deposit-confirmed",
  "/legal/deposit-cancelled",
  "/legal/set-password",
]);

export function legalTrialOn(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("legalData") === "portal";
}
