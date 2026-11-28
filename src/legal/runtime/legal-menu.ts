// The Legal menu section in the portal sidebar (after switch-over): the
// Legal-only screens this person's Legal role may open.
import { useEffect, useState } from "react";
import { legalDb } from "@/lib/legal/client";
import { roleMayOpen, type PortalRole } from "@/legal/lib/roles";
import { useLegalLive } from "./trial";

export type LegalMenuItem = { title: string; url: string; legalPath: string };

export const LEGAL_MENU: LegalMenuItem[] = [
  { title: "Legal Dashboard", url: "/legal/dashboard", legalPath: "/dashboard" },
  { title: "Firms", url: "/legal/firms", legalPath: "/firms" },
  { title: "Firm Cold Calling", url: "/legal/firm-cold-calling", legalPath: "/firm-cold-calling" },
  { title: "Firm Portal", url: "/legal/firm-portal", legalPath: "/firm-portal" },
  { title: "Ad Briefing", url: "/legal/ad-briefing", legalPath: "/ad-briefing" },
  { title: "Legal Settings", url: "/legal/settings", legalPath: "/settings" },
];

/**
 * The signed-in person's Legal role once the move is live: undefined while
 * loading, null when they have no Legal staff access.
 */
export function useLegalRole(): PortalRole | null | undefined {
  const { live } = useLegalLive();
  const [role, setRole] = useState<PortalRole | null | undefined>(undefined);
  useEffect(() => {
    if (!live) return setRole(null);
    let alive = true;
    void (legalDb().rpc("current_portal_access") as unknown as Promise<{ data: unknown; error: unknown }>).then(
      ({ data, error }) => {
        if (!alive) return;
        const r = !error && data && typeof data === "object" ? (data as PortalRole) : null;
        setRole(r && r.isStaff ? r : null);
      },
    );
    return () => {
      alive = false;
    };
  }, [live]);
  return role;
}

/** Whether this person may open a Legal screen (by its Legal app path). */
export function useLegalMayOpen(legalPath: string): boolean | undefined {
  const role = useLegalRole();
  if (role === undefined) return undefined;
  return !!role && roleMayOpen(role, legalPath);
}

export function useLegalMenu(): LegalMenuItem[] {
  const { live } = useLegalLive();
  const [role, setRole] = useState<PortalRole | null>(null);
  useEffect(() => {
    if (!live) return setRole(null);
    let alive = true;
    void (legalDb().rpc("current_portal_access") as unknown as Promise<{ data: unknown; error: unknown }>).then(
      ({ data, error }) => {
        if (alive && !error && data && typeof data === "object") setRole(data as PortalRole);
      },
    );
    return () => {
      alive = false;
    };
  }, [live]);
  if (!live || !role || !role.isStaff) return [];
  return LEGAL_MENU.filter((i) => roleMayOpen(role, i.legalPath));
}
