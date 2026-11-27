// Ported from the Legal app (family-law-floater/src/routes/set-password.tsx). Re-run the port script to refresh.
import { BoldBrand } from "@/legal/components/firm-portal/BoldBrand";
import "@/legal/components/firm-portal/firm-portal.css";
import { useEffect, useState } from "react";
import { useNavigate } from "@/legal/runtime/router";
import { Loader2 } from "lucide-react";

import { supabase } from "@/legal/integrations/supabase/client";
import { landingPathFor, resolveRole } from "@/legal/lib/roles";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { SetPasswordPage as LegalPage };
export const Route = legalRoute({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set your password — Bold" },
      {
        name: "description",
        content: "Choose a password for your Bold partner portal account.",
      },
      { property: "og:title", content: "Set your password — Bold" },
      { property: "og:description", content: "Choose a password for your Bold account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      if (!data.session) setError("This link has expired. Ask Bold for a new invite.");
      setReady(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSession) return;
    if (password !== confirmPassword) {
      setError("The passwords don’t match. Please try again.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setBusy(false);
        return;
      }
      const role = await resolveRole();
      void navigate({ to: landingPathFor(role) ?? "/auth", replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bold-portal firm-portal-ui flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-8">
        <BoldBrand />
        <h1
          className="mt-3 text-2xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Set your password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a password to finish setting up your partner portal login.
        </p>

        {!ready ? (
          <div className="mt-8 flex justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !hasSession ? (
          <div className="mt-6 space-y-4">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <a
              href="/auth?redirect=%2Ffirm-portal"
              className="inline-flex min-h-11 items-center font-medium text-primary underline"
            >
              Back to sign in
            </a>
            <p className="text-sm text-muted-foreground">
              Use “Forgot password?” to request a fresh link.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="password" className="text-sm text-muted-foreground">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="text-sm text-muted-foreground">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-2 text-xs text-muted-foreground">Use at least 8 characters.</p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
