// Ported from the Legal app (family-law-floater/src/lib/roles.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";
import {
  CALL_REVIEW_PAGES,
  pagesAllowPath,
  PORTAL_PAGE_URLS,
  type PortalPage,
} from "./portal-pages";

export type PortalRole = {
  isStaff: boolean;
  isAdmin: boolean;
  isSetter: boolean;
  salesOnly: boolean;
  firmId: string | null;
  pages: PortalPage[];
  canManageFirmPipeline?: boolean;
};

/** Read fresh, trusted database permissions; never recover with broader defaults. */
export async function resolveRole(): Promise<PortalRole> {
  const { data, error } = await supabase.rpc("current_portal_access");
  if (error || !data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Could not verify portal access. Please refresh and try again.");
  const value = data as Record<string, unknown>;
  if (
    ["isStaff", "isAdmin", "isSetter", "salesOnly"].some(
      (key) => typeof value[key] !== "boolean",
    ) ||
    (value["canManageFirmPipeline"] !== undefined &&
      typeof value["canManageFirmPipeline"] !== "boolean") ||
    !Array.isArray(value["pages"]) ||
    !value["pages"].every((p) => PORTAL_PAGE_URLS.includes(p as PortalPage)) ||
    (value["firmId"] !== null && typeof value["firmId"] !== "string")
  )
    throw new Error("Could not verify portal access. Please refresh and try again.");
  return value as PortalRole;
}

export function roleMayOpen(role: PortalRole, pathname: string): boolean {
  if (!role.isStaff)
    return !role.isAdmin && !!role.firmId && pathname.replace(/\/$/, "") === "/firm-portal";
  if (
    role.isAdmin &&
    ["/settings", "/ad-briefing", "/numbers", "/handover-check"].includes(
      pathname.replace(/\/$/, ""),
    )
  )
    return true;
  if (pathname.replace(/\/$/, "") === "/transcripts")
    return CALL_REVIEW_PAGES.some((page) => role.pages.includes(page));
  return pagesAllowPath(pathname, role.pages);
}

/** Always land on a granted tab, including when the usual home was removed. */
export function landingPathFor(role: PortalRole): string | null {
  if (!role.isStaff) return role.firmId ? "/firm-portal" : null;
  const preferred = role.isSetter
    ? "/firm-cold-calling"
    : role.salesOnly
      ? "/sales-call"
      : "/dashboard";
  if (role.pages.includes(preferred)) return preferred;
  return PORTAL_PAGE_URLS.find((page) => role.pages.includes(page)) ?? null;
}
