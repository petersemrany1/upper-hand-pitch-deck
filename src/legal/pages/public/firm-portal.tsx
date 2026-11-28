// Ported from the Legal app (family-law-floater/src/routes/firm-portal.tsx). Re-run the port script to refresh.
import { useEffect, useState } from "react";
import { redirect, useNavigate } from "@/legal/runtime/router";
import { ArrowLeft, LayoutDashboard, Loader2, LogOut } from "lucide-react";

import { StaffFirmPortal } from "@/legal/components/firm-portal/StaffFirmPortal";
import { BoldBrand } from "@/legal/components/firm-portal/BoldBrand";
import { FirmAdminList } from "@/legal/components/firm-portal/FirmAdminList";
import { FirmPortalView } from "@/legal/components/firm-portal/FirmPortalView";
import { supabase } from "@/legal/integrations/supabase/client";
import { landingPathFor, roleMayOpen, resolveRole } from "@/legal/lib/roles";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { FirmPortalPage as LegalPage };
export const Route = legalRoute({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { redirect: "/firm-portal" } });
    const role = await resolveRole();
    if (!roleMayOpen(role, "/firm-portal")) {
      const home = landingPathFor(role);
      if (home) throw redirect({ to: home });
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { reason: "no-access" } });
    }
    return { role };
  },
  validateSearch: (search: Record<string, unknown>): { firmId?: string } =>
    typeof search["firmId"] === "string" ? { firmId: search["firmId"] as string } : {},
  head: () => ({
    meta: [
      { title: "Firm Partner Portal — Bold" },
      {
        name: "description",
        content:
          "Partner firms manage their consultations, availability and pack credit with Bold.",
      },
      { property: "og:title", content: "Firm Partner Portal — Bold" },
      {
        property: "og:description",
        content: "Consultations, availability and pack credit for Bold partner firms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FirmPortalPage,
});

type Resolved = { firmId: string; firmName: string; isAdmin: boolean };

function FirmPortalPage() {
  const { role } = Route.useRouteContext();
  return role.isStaff && !role.isAdmin ? (
    <StaffFirmPortal role={role} />
  ) : (
    <ManagedFirmPortalPage />
  );
}

function ManagedFirmPortalPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [state, setState] = useState<Resolved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdminList, setShowAdminList] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setError(null);
    setShowAdminList(false);
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          void navigate({ to: "/auth", search: { redirect: "/firm-portal" }, replace: true });
          return;
        }
        const role = await resolveRole();
        const firmId = role.isAdmin && search.firmId ? search.firmId : role.firmId;
        if (!firmId) {
          if (cancelled) return;
          if (role.isStaff) {
            setShowAdminList(true);
          } else {
            setError("This account isn't linked to a partner firm yet.");
          }
          return;
        }

        const { data: firm, error: firmError } = await supabase
          .from("firms")
          .select("firm_name")
          .eq("id", firmId)
          .maybeSingle();
        if (firmError) throw firmError;
        if (!firm) throw new Error("This firm could not be found or you do not have access.");
        if (cancelled) return;
        setState({
          firmId,
          firmName: firm?.firm_name ?? "Your firm",
          isAdmin: role.isAdmin,
        });
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your portal. Please refresh and try again.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, search.firmId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  // Inside the portal's Partner Portal page (admins), the portal already has
  // its own menu and sign-out, so only the "All firms" button is kept.
  const embedded = typeof window !== "undefined" && window.location.pathname.startsWith("/partner-clinics");

  return (
    <div className={`bold-portal firm-portal-ui ${embedded ? "" : "min-h-screen"} bg-background text-foreground`}>
      {embedded ? (
        state?.isAdmin && (
          <div className="mx-auto flex max-w-6xl px-6 pt-4">
            <button
              type="button"
              onClick={() => void navigate({ to: "/firm-portal", search: {}, replace: true })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All firms
            </button>
          </div>
        )
      ) : (
      <header className="portal-header">
        <div className="portal-header-inner">
          <BoldBrand />
          <div className="flex flex-wrap items-center gap-2">
            {state?.isAdmin && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/firm-portal", search: {}, replace: true })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> All firms
              </button>
            )}
            {(state?.isAdmin || showAdminList) && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/dashboard" })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      )}

      {showAdminList ? (
        <FirmAdminList
          onOpenPortal={(firmId: string) => {
            setShowAdminList(false);
            void navigate({ to: "/firm-portal", search: { firmId } });
          }}
        />
      ) : error ? (
        <div className="mx-auto mt-16 max-w-lg rounded-xl border border-border bg-card p-8">
          <p className="text-center text-[15px] font-semibold">Nothing to show yet</p>
          <p className="mt-2 text-center text-sm text-muted-foreground">{error}</p>
        </div>
      ) : !state ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <FirmPortalView
          key={state.firmId}
          firmId={state.firmId}
          firmName={state.firmName}
          isAdmin={state.isAdmin}
        />
      )}
    </div>
  );
}
