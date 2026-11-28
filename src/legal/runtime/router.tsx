// Legal app code imports its router helpers from here instead of
// @tanstack/react-router (the port script rewrites the import). Everything is
// the real router, except that links and redirects to Legal app addresses go
// to the matching portal section on its Legal side, and anything the portal
// doesn't have yet opens in the Legal app itself.
import { forwardRef, useCallback, useMemo, type AnchorHTMLAttributes, type ReactNode } from "react";
import * as Router from "@tanstack/react-router";
import { LEGAL_APP_ORIGIN } from "@/lib/legal/client";
import { useLegalContext, type LegalRouteContext } from "./context";
import { legalTrialOn, TRIAL_PATHS } from "./trial";

export * from "@tanstack/react-router";

/** Legal app path -> portal path (shown with the Legal switch on). */
const PORTAL_PATHS: Record<string, string> = {
  "/dashboard": "/",
  "/transcripts": "/my-recordings",
  "/my-recordings": "/my-recordings",
  "/sales-call": "/sales-call",
  "/booked-appointments": "/booked-appointments",
  "/inbox": "/inbox",
  "/leads": "/leads",
  "/numbers": "/numbers",
  "/leaderboard": "/leaderboard",
  "/pitch-deck": "/pitch-deck",
  "/firms": "/crm",
  "/crm": "/crm",
  "/settings": "/settings",
  "/auth": "/login",
};

/** Extra address parts for Legal screens that live inside a portal page. */
const PORTAL_SEARCH: Record<string, Record<string, string>> = {
  "/firms": { tab: "firms" },
  "/settings": { section: "legal" },
};

export type LegalTarget = { href: string; external: boolean };

/** Where a Legal app address goes inside the portal (or out to the Legal app). */
export function legalTarget(to: unknown, search?: unknown): LegalTarget {
  const path = typeof to === "string" ? to : "";
  const params = new URLSearchParams();
  if (search && typeof search === "object")
    for (const [k, v] of Object.entries(search as Record<string, unknown>))
      if (v !== undefined && v !== null) params.set(k, String(v));
  const trial = legalTrialOn();
  // While trying screens on copied records, training modules and Legal-only
  // screens open inside the portal too.
  const portal =
    PORTAL_PATHS[path] ??
    (trial && TRIAL_PATHS.has(path) ? path : undefined) ??
    (trial && TRIAL_PATHS.has(`/legal${path}`) ? `/legal${path}` : undefined);
  if (!path.startsWith("/") || path === "/") return { href: path || ".", external: false };
  if (portal) {
    for (const [k, v] of Object.entries(PORTAL_SEARCH[path] ?? {})) params.set(k, v);
    // Legal-only screens (/legal/...) and Legal tabs inside a portal page need no business switch.
    if (portal !== "/login" && !portal.startsWith("/legal/") && !PORTAL_SEARCH[path]) params.set("biz", "legal");
    // Keep the "try on copied records" test switch while clicking around (before switch-over only).
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("legalData") === "portal")
      params.set("legalData", "portal");
    const q = params.toString();
    return { href: `${portal}${q ? `?${q}` : ""}`, external: false };
  }
  const q = params.toString();
  return { href: `${LEGAL_APP_ORIGIN}${path}${q ? `?${q}` : ""}`, external: true };
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to?: unknown;
  search?: unknown;
  params?: unknown;
  hash?: string;
  replace?: boolean;
  preload?: unknown;
  activeProps?: unknown;
  inactiveProps?: unknown;
  activeOptions?: unknown;
  children?: ReactNode | ((state: { isActive: boolean }) => ReactNode);
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function LegalLink(
  { to, search, params: _params, hash, replace, preload: _p, activeProps: _a, inactiveProps: _i, activeOptions: _o, children, ...rest },
  ref,
) {
  const { href, external } = legalTarget(to, typeof search === "function" ? undefined : search);
  const content = typeof children === "function" ? children({ isActive: false }) : children;
  if (external)
    return (
      <a ref={ref} href={`${href}${hash ? `#${hash}` : ""}`} target="_blank" rel="noreferrer" {...rest}>
        {content}
      </a>
    );
  return (
    <Router.Link ref={ref} {...(rest as object)} to={href.split("?")[0] as never} search={searchOf(href) as never} hash={hash} replace={replace}>
      {content}
    </Router.Link>
  );
});

function searchOf(href: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(href.split("?")[1] ?? ""));
}

type NavigateOptions = { to?: unknown; search?: unknown; replace?: boolean; hash?: string; params?: unknown };

export function useNavigate(_opts?: unknown) {
  const navigate = Router.useNavigate();
  // Stable across renders, like the real useNavigate: Legal pages list it in
  // effect dependencies, and a new function each render would re-run them forever.
  return useCallback(
    (options: NavigateOptions = {}) => {
      if (options.to === undefined) {
        // Search-only update on the current page: keep the Legal switch.
        const current = new URLSearchParams(window.location.search);
        const next = typeof options.search === "function" ? options.search(Object.fromEntries(current)) : options.search;
        // The portal's own address parts (business switch, CRM/settings tab)
        // stay as they are; the Legal page only changes its own.
        const keep: Record<string, string> = {};
        for (const k of ["legalData", "biz", "tab", "section"]) {
          const v = current.get(k);
          if (v) keep[k] = v;
        }
        return navigate({ search: { ...(next as object), ...keep } as never, replace: options.replace });
      }
      const { href, external } = legalTarget(options.to, typeof options.search === "function" ? undefined : options.search);
      if (external) {
        window.open(href, "_blank", "noopener");
        return Promise.resolve();
      }
      return navigate({ to: href.split("?")[0] as never, search: searchOf(href) as never, replace: options.replace });
    },
    [navigate],
  );
}

export function Navigate(props: NavigateOptions) {
  const { href } = legalTarget(props.to, props.search);
  return <Router.Navigate to={href.split("?")[0] as never} search={searchOf(href) as never} replace={props.replace} />;
}

export function redirect(options: NavigateOptions) {
  const { href } = legalTarget(options.to, options.search);
  return Router.redirect({ to: href.split("?")[0] as never, search: searchOf(href) as never });
}

/** Legal pages read { user, role } from the Legal staff route's context. */
export function useRouteContext(_opts?: unknown): LegalRouteContext {
  return useLegalContext();
}

export function getRouteApi(_id: string) {
  return {
    useRouteContext: (): LegalRouteContext => useLegalContext(),
    useSearch: function useLegalRouteSearch() {
      const searchStr = Router.useLocation().searchStr;
      return useMemo(() => Object.fromEntries(new URLSearchParams(searchStr)) as Record<string, string>, [searchStr]);
    },
    useNavigate: () => useNavigate(),
  };
}

// File routes are not registered when Legal pages run inside the portal;
// the port script turns them into components (see scripts/legal-port/port.py).
export function createFileRoute(_path: string) {
  return <T,>(options: T) => options;
}
