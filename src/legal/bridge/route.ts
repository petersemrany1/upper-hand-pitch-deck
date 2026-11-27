// Stand-in for a Legal page's file route when it runs inside the portal:
// search params come from the portal URL (minus the business switch) through
// the page's own validateSearch, and the route context carries the Legal user.
import { createContext, useContext, useMemo } from "react";
import { useLocation } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";

export const LegalUserContext = createContext<User | null>(null);

type Options<S> = { validateSearch?: (search: Record<string, unknown>) => S } & Record<string, unknown>;

export function legalRoute<S = Record<string, unknown>>(options: Options<S>) {
  return {
    options,
    useSearch(): S {
      const searchStr = useLocation().searchStr;
      return useMemo(() => {
        const raw: Record<string, unknown> = {};
        new URLSearchParams(searchStr).forEach((value, key) => {
          if (key !== "biz") raw[key] = value;
        });
        return options.validateSearch ? options.validateSearch(raw) : (raw as S);
      }, [searchStr]);
    },
    useRouteContext(): { user: User } {
      const user = useContext(LegalUserContext);
      if (!user) throw new Error("Connect Legal Group to view this page");
      return { user };
    },
  };
}
