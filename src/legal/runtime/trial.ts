// Which Legal screens open natively in the portal.
// Before switch-over: only with ?legalData=portal ("try on copied records").
// After switch-over (LEGAL_LIVE=true, read from /api/legal-live): every Legal
// screen, for everyone, on this portal's records.
import { useSyncExternalStore } from "react";

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
  "/legal/pay-per-show",
  "/legal/portal-guide",
]);

const STORAGE_KEY = "upperhand-legal-live";
function remembered(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
let live = remembered();
let loaded = false;
let loading: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

/** Ask the server once whether the Legal move is switched over. */
export function loadLegalLive(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  loading ??= fetch("/api/legal-live", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { live: false }))
    .then((j: { live?: boolean }) => !!j.live)
    .catch(() => false)
    .then((value) => {
      live = value;
      try {
        window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
      } catch {
        /* private mode: the answer is still used for this page */
      }
      loaded = true;
      listeners.forEach((l) => l());
      return value;
    });
  return loading;
}

export function legalLiveNow(): boolean {
  return live;
}

/** True once switched over; re-renders when the answer arrives. */
export function useLegalLive(): { live: boolean; loaded: boolean } {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      void loadLegalLive();
      return () => listeners.delete(cb);
    },
    () => (loaded ? (live ? 2 : 1) : 0),
    () => 0,
  );
  return { live: value === 2, loaded: value !== 0 };
}

export function legalTrialOn(): boolean {
  if (live) return true;
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("legalData") === "portal";
}
