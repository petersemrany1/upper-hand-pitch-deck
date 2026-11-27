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
import { LegalUserContext } from "./bridge/route";
import "./legal.css";

// Legal pages that now run natively inside the portal, keyed by the portal
// section path. Sections not listed here still open the Legal app in a frame.
const NATIVE: Record<string, () => Promise<{ LegalPage: ComponentType }>> = {
  "/leads": () => import("./pages/leads"),
  "/pitch-deck": () => import("./pages/pitch-deck"),
  "/leaderboard": () => import("./pages/leaderboard"),
  "/my-recordings": () => import("./pages/transcripts"),
};

const pages = new Map<string, ComponentType>();
function pageFor(path: string): ComponentType | null {
  const load = NATIVE[path];
  if (!load) return null;
  if (!pages.has(path))
    pages.set(
      path,
      lazy(() => load().then((m) => ({ default: m.LegalPage }))),
    );
  return pages.get(path)!;
}

export function hasNativeLegalPage(path: string): boolean {
  return path in NATIVE;
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

// Legal pages read the signed-in Legal user from their route context.
function LegalUser({ children }: { children: ReactNode }) {
  const { session } = useLegalSession();
  if (!session) return null;
  return (
    <LegalUserContext.Provider value={session.user}>
      {children}
    </LegalUserContext.Provider>
  );
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
  // One query cache per Legal view, as in the Legal app.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  if (!Page) return null;
  return (
    <div
      className={`legal-scope flex min-h-0 flex-1 flex-col ${fullscreen ? "h-screen" : "min-h-full"}`}
    >
      <RequireLegal>
        <LegalUser>
          <QueryClientProvider client={client}>
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
        </LegalUser>
      </RequireLegal>
    </div>
  );
}
