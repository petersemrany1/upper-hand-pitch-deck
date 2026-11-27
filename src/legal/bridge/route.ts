// Stand-in for a Legal page's file route when it runs inside the portal:
// search params come from the portal URL (minus the business switch) through
// the page's own validateSearch, and the route context carries the Legal user
// and role (src/legal/runtime/context.ts).
import { useMemo } from "react";
import { useLocation } from "@tanstack/react-router";
import { useLegalContext, type LegalRouteContext } from "@/legal/runtime/context";
import { useNavigate as useLegalNavigate } from "@/legal/runtime/router";

type Validator<S> = ((search: Record<string, unknown>) => S) | { parse: (search: Record<string, unknown>) => S };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- route hooks the portal doesn't run
type RouteHook = (ctx: any) => unknown;
type Options<S> = { validateSearch?: Validator<S>; beforeLoad?: RouteHook; loader?: RouteHook } & Record<string, unknown>;

const validate = <S,>(v: Validator<S>, raw: Record<string, unknown>): S => (typeof v === "function" ? v(raw) : v.parse(raw));

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
        return options.validateSearch ? validate(options.validateSearch, raw) : (raw as S);
      }, [searchStr]);
    },
    useRouteContext(): LegalRouteContext {
      return useLegalContext();
    },
    useNavigate() {
      return useLegalNavigate();
    },
  };
}
