import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  RequireLegal,
  useLegalSession,
} from "@/components/business/LegalConnect";
import { LegalContext, type LegalRouteContext } from "./runtime/context";
import { resolveRole } from "./lib/roles";
import { legalTrialOn } from "./runtime/trial";
import { setLegalDataMode, type LegalDataMode } from "./runtime/mode";
import { supabase as portalSupabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import "./legal.css";

// Legal pages that now run natively inside the portal, keyed by the portal
// section path. Sections not listed here still open the Legal app in a frame.
const NATIVE: Record<string, () => Promise<{ LegalPage: ComponentType }>> = {
  "/leads": () => import("./pages/leads"),
  "/pitch-deck": () => import("./pages/pitch-deck"),
  "/leaderboard": () => import("./pages/leaderboard"),
  "/my-recordings": () => import("./pages/transcripts"),
};

// Pages switched to the copied Legal records in this portal's database
// (docs/legal-move-plan.md, stage 5). Others still read the Legal app's
// database. Adding ?legalData=portal to the address tries any page on the
// copied records without switching it for everyone.
const PORTAL_DATA_PAGES = new Set<string>([]);

function dataModeFor(path: string): LegalDataMode {
  if (PORTAL_DATA_PAGES.has(path)) return "portal";
  // Screens not yet live only ever run on the copied records.
  if (legalTrialOn() || !(path in NATIVE)) return "portal";
  return "legal";
}

type PageModule = () => Promise<{ LegalPage: ComponentType }>;

// Legal screens still being moved: they open natively only with the
// "try on copied records" switch (?legalData=portal); everyone else keeps
// seeing the Legal app in a frame. Legal-only screens live under /legal/….
const TRIAL: Record<string, PageModule> = {
  "/sales-call": () => import("./pages/sales-call"),
  "/inbox": () => import("./pages/inbox"),
  "/booked-appointments": () => import("./pages/booked-appointments"),
  "/numbers": () => import("./pages/numbers"),
  "/training": () => import("./pages/training/index"),
  "/training/ai": () => import("./pages/training/ai"),
  "/training/audience": () => import("./pages/training/audience"),
  "/training/call-coaching": () => import("./pages/training/call-coaching"),
  "/training/consultation-videos": () => import("./pages/training/consultation-videos"),
  "/training/knowledge-quiz": () => import("./pages/training/knowledge-quiz"),
  "/training/platform": () => import("./pages/training/platform"),
  "/training/practice-call": () => import("./pages/training/practice-call"),
  "/training/product-knowledge": () => import("./pages/training/product-knowledge"),
  "/training/read-along": () => import("./pages/training/read-along"),
  "/training/sales-call-example": () => import("./pages/training/sales-call-example"),
  "/training/sales-framework": () => import("./pages/training/sales-framework"),
  "/legal/dashboard": () => import("./pages/dashboard"),
  "/legal/firms": () => import("./pages/firms"),
  "/legal/firm-cold-calling": () => import("./pages/firm-cold-calling"),
  "/legal/ad-briefing": () => import("./pages/ad-briefing"),
  "/legal/handover-check": () => import("./pages/handover-check"),
  "/legal/settings": () => import("./pages/settings"),
};

function moduleFor(path: string): PageModule | undefined {
  return NATIVE[path] ?? (legalTrialOn() ? TRIAL[path] : undefined);
}

const pages = new Map<string, ComponentType>();
function pageFor(path: string): ComponentType | null {
  const load = moduleFor(path);
  if (!load) return null;
  if (!pages.has(path))
    pages.set(
      path,
      lazy(() => load().then((m) => ({ default: m.LegalPage }))),
    );
  return pages.get(path)!;
}

export function hasNativeLegalPage(path: string): boolean {
  return !!moduleFor(path);
}

class LegalErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          className="m-6 rounded-lg p-4 text-sm"
          style={{ background: "#fdf0f0", color: "#b83232" }}
        >
          This Legal page hit an error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const LEGAL_FONTS =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;700&display=swap";

// The Legal pages use Outfit + DM Sans; load them once, only when a Legal view opens.
function useLegalFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${LEGAL_FONTS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEGAL_FONTS;
    document.head.appendChild(link);
  }, []);
}

// The signed-in portal user, for pages running on the copied Legal records.
function usePortalUser(enabled: boolean): User | null {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!enabled) return;
    portalSupabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = portalSupabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [enabled]);
  return user;
}

// Legal pages read the signed-in Legal user from their route context.
function LegalUser({ mode, children }: { mode: LegalDataMode; children: ReactNode }) {
  const { session } = useLegalSession();
  const portalUser = usePortalUser(mode === "portal");
  const [ctx, setCtx] = useState<LegalRouteContext | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const user = mode === "portal" ? portalUser : (session?.user ?? null);
  useEffect(() => {
    if (!user) return setCtx(null);
    let alive = true;
    // The Legal role (admin, rep, firm...) decides what Legal pages show.
    resolveRole().then(
      (role) => alive && setCtx({ user, role }),
      (e: unknown) => alive && setFailed(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, [user]);
  if (failed) return <div className="m-6 text-sm" style={{ color: "#b83232" }}>{failed}</div>;
  if (!ctx) return null;
  return <LegalContext.Provider value={ctx}>{children}</LegalContext.Provider>;
}

export function LegalView({
  path,
  fullscreen,
}: {
  path: string;
  fullscreen?: boolean;
}) {
  useLegalFonts();
  const Page = pageFor(path);
  const mode = dataModeFor(path);
  // Set before the page renders so its queries reach the right database.
  setLegalDataMode(mode);
  // One query cache per Legal view, as in the Legal app.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  if (!Page) return null;
  const body = (
    <QueryClientProvider client={client} key={mode}>
      <LegalErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center gap-2 p-6 text-sm opacity-70">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading Legal…
            </div>
          }
        >
          <Page />
        </Suspense>
      </LegalErrorBoundary>
    </QueryClientProvider>
  );
  return (
    <div
      className={`legal-scope flex min-h-0 flex-1 flex-col ${fullscreen ? "h-screen" : "min-h-full"}`}
    >
      {mode === "portal" ? (
        <LegalUser mode={mode}>{body}</LegalUser>
      ) : (
        <RequireLegal>
          <LegalUser mode={mode}>{body}</LegalUser>
        </RequireLegal>
      )}
    </div>
  );
}
