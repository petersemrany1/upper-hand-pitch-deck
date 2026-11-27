// Ported from the Legal app (family-law-floater/src/lib/marketing-tracking.ts). Re-run the port script to refresh.
// This dataset is for firms buying Bold's marketing service, never portal/client activity.
export const MARKETING_PIXEL_ID = "1099102499280158";
export const DISCOVERY_BOOKING_URL = "https://calendly.com/paypershowcall/discovery-call";
const MARKETING_HOSTS = new Set(["boldfamilylaw.com.au", "www.boldfamilylaw.com.au"]);
const OPT_OUT_KEY = "bold-ad-measurement-disabled";
const BOOKING_IDS_KEY = "bold-measured-demo-bookings";
const bookingIds = new Set<string>();
let initialised = false;
let pageViewSent = false;
let measurementOptOut = false;

type Pixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: Pixel;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Pixel;
    _fbq?: Pixel;
  }
}

export function isMarketingPage(hostname: string, pathname: string): boolean {
  return MARKETING_HOSTS.has(hostname) && pathname.replace(/\/$/, "") === "/pay-per-show";
}

export function adMeasurementDisabled(): boolean {
  if (typeof window === "undefined") return true;
  if (measurementOptOut) return true;
  if (
    navigator.doNotTrack === "1" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  )
    return true;
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdMeasurementDisabled(disabled: boolean) {
  measurementOptOut = disabled;
  try {
    localStorage.setItem(OPT_OUT_KEY, disabled ? "1" : "0");
  } catch {
    /* Booking remains usable when storage is unavailable. */
  }
  if (disabled) window.fbq?.("consent", "revoke");
  else initialiseMarketingPixel();
}

export function initialiseMarketingPixel(): boolean {
  if (
    typeof window === "undefined" ||
    !isMarketingPage(location.hostname, location.pathname) ||
    adMeasurementDisabled()
  )
    return false;
  if (!window.fbq) {
    const pixel: Pixel = Object.assign(
      function (...args: unknown[]) {
        if (pixel.callMethod) pixel.callMethod(...args);
        else pixel.queue.push(args);
      },
      { queue: [] as unknown[][], loaded: true, version: "2.0" },
    );
    pixel.push = pixel;
    window.fbq = pixel;
    window._fbq = pixel;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  const pixel = window.fbq;
  if (!initialised) {
    // No automatic form scraping, inferred click conversions or advanced matching.
    pixel("set", "autoConfig", false, MARKETING_PIXEL_ID);
    pixel("init", MARKETING_PIXEL_ID);
    initialised = true;
  }
  pixel("consent", "grant");
  if (!pageViewSent) {
    pixel("trackSingle", MARKETING_PIXEL_ID, "PageView");
    pageViewSent = true;
  }
  return true;
}

export function stopMarketingPixel() {
  window.fbq?.("consent", "revoke");
}

export function calendlyBookingId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const message = data as {
    event?: unknown;
    payload?: { event?: { uri?: unknown }; invitee?: { uri?: unknown } };
  };
  if (message.event !== "calendly.event_scheduled") return null;
  const eventUri = message.payload?.event?.uri;
  const inviteeUri = message.payload?.invitee?.uri;
  if (typeof eventUri !== "string" || typeof inviteeUri !== "string") return null;
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  const event = eventUri.match(
    new RegExp(`^https://api\\.calendly\\.com/scheduled_events/(${uuid})$`, "i"),
  );
  const invitee = inviteeUri.match(
    new RegExp(`^https://api\\.calendly\\.com/scheduled_events/(${uuid})/invitees/(${uuid})$`, "i"),
  );
  if (!event || !invitee || event[1]!.toLowerCase() !== invitee[1]!.toLowerCase()) return null;
  return `bold-demo-${invitee[2]!.toLowerCase()}`;
}

export function isCalendlyFrameMessage(
  event: Pick<MessageEvent, "origin" | "source">,
  frame: Window | null,
): boolean {
  return !!frame && event.origin === "https://calendly.com" && event.source === frame;
}

// Call only from the qualified booking widget's confirmed event, never a button or page view.
export function recordQualifiedBooking(eventId: string): boolean {
  if (!/^bold-demo-[0-9a-f-]{36}$/.test(eventId) || !initialiseMarketingPixel()) return false;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(BOOKING_IDS_KEY) ?? "[]");
    if (Array.isArray(saved))
      saved
        .filter((id): id is string => typeof id === "string")
        .forEach((id) => bookingIds.add(id));
  } catch {
    /* In-memory deduplication still applies. */
  }
  if (bookingIds.has(eventId)) return false;
  window.fbq!(
    "trackSingle",
    MARKETING_PIXEL_ID,
    "Schedule",
    {
      content_name: "Bold marketing discovery call",
      status: "qualified",
    },
    { eventID: eventId },
  );
  bookingIds.add(eventId);
  try {
    localStorage.setItem(BOOKING_IDS_KEY, JSON.stringify([...bookingIds].slice(-100)));
  } catch {
    /* In-memory deduplication still applies. */
  }
  return true;
}

export function discoveryBookingUrl(search: string): string {
  const url = new URL(DISCOVERY_BOOKING_URL);
  const params = new URLSearchParams(search);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) url.searchParams.set(key, value.slice(0, 250));
  }
  url.searchParams.set("primary_color", "3029ff");
  return url.toString();
}
