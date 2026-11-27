// The context Legal staff pages expect from the Legal app's signed-in route:
// the signed-in user and their Legal role. LegalView provides it.
import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { PortalRole } from "@/legal/lib/roles";

export type LegalRouteContext = { user: User; role: PortalRole };

export const LegalContext = createContext<LegalRouteContext | null>(null);

export function useLegalContext(): LegalRouteContext {
  const ctx = useContext(LegalContext);
  if (!ctx) throw new Error("Connect Legal Group to view this page");
  return ctx;
}
