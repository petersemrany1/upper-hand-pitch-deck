// Ported from the Legal app (family-law-floater/src/lib/portal-pages.ts). Re-run the port script to refresh.
/** The same page list drives the access editor, navigation and route guards. */
export const PORTAL_PAGES = [
  { url: "/dashboard", title: "Dashboard", group: "Overview" },
  { url: "/leads", title: "Leads", group: "Sales" },
  { url: "/sales-call", title: "Sales Call", group: "Sales" },
  { url: "/training", title: "Training", group: "Sales" },
  { url: "/booked-appointments", title: "Booked Appointments", group: "Sales" },
  { url: "/inbox", title: "Inbox", group: "Sales" },
  { url: "/leaderboard", title: "Leaderboard", group: "Sales" },
  { url: "/pitch-deck", title: "Pitch deck", group: "Firm Acquisition" },
  { url: "/firm-cold-calling", title: "Firm Cold Call Portal", group: "Firm Acquisition" },
  { url: "/firms", title: "Firm Pipeline", group: "Firm Acquisition" },
  { url: "/firm-portal", title: "Firm portal", group: "Firm Portal" },
] as const;

export type PortalPage = (typeof PORTAL_PAGES)[number]["url"];
export const PORTAL_PAGE_URLS = PORTAL_PAGES.map((page) => page.url);
// Transcript readers use the same grants as the client call review.
export const CALL_REVIEW_PAGES = [
  "/sales-call",
  "/leads",
  "/booked-appointments",
  "/inbox",
] as const;
export const COLD_CALL_URL = "/firm-cold-calling";

export function defaultPortalPages(role: "setter" | "rep" | "admin"): PortalPage[] {
  if (role === "admin") return [...PORTAL_PAGE_URLS];
  if (role === "setter") return [COLD_CALL_URL];
  return [
    "/dashboard",
    "/sales-call",
    "/training",
    "/booked-appointments",
    "/inbox",
    "/leaderboard",
    "/pitch-deck",
    "/firm-portal",
  ];
}

/** Match registered pages only; training is the only page with child routes. */
export function portalPageForPath(pathname: string): PortalPage | null {
  if (pathname.includes("\\") || pathname.split("/").some((p) => p === "." || p === ".."))
    return null;
  const path = pathname.replace(/\/$/, "");
  if (path.startsWith("/training/")) return "/training";
  return PORTAL_PAGES.find((page) => page.url === path)?.url ?? null;
}

export function pagesAllowPath(pathname: string, allowed: readonly string[]): boolean {
  const page = portalPageForPath(pathname);
  return page !== null && allowed.includes(page);
}

/** Legacy helpers retained for account-scope compatibility. */
export function setterMayOpen(pathname: string, allowed: readonly string[]): boolean {
  return pagesAllowPath(pathname, [COLD_CALL_URL, ...allowed]);
}
export function salesOnlyMayOpen(pathname: string): boolean {
  return pagesAllowPath(pathname, ["/sales-call", "/inbox"]);
}
