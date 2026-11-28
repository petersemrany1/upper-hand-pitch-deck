// Ported from the Legal app (family-law-floater/src/routes/firm-offer.tsx). Re-run the port script to refresh.
import { useCallback, useEffect, useState } from "react";
import {
  RecipientWorkspace,
  type RecipientOffer,
} from "@/legal/components/firm-offers/RecipientWorkspace";
// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { Page as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Your private workspace — Bold Marketing" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Page,
});
function Page() {
  const [token, setToken] = useState(""),
    [offer, setOffer] = useState<RecipientOffer>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    window.history.replaceState(null, "", "/firm-offer");
    let saved: { token: string; expires: number } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem("bold-offer-session") ?? "null");
    } catch {
      /* invalid local session */
    }
    if (fragment) {
      void fetch("/api/public/firm-offers/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fragment, action: "exchange" }),
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          sessionStorage.setItem(
            "bold-offer-session",
            JSON.stringify({ token: result.session, expires: Date.parse(result.expiresAt) }),
          );
          setToken(result.session);
          setOffer(result.offer);
        })
        .catch((e) => setError(e.message));
    } else if (saved && saved.expires > Date.now()) setToken(saved.token);
    else setError("Open the private link from your invitation to resume your workspace.");
  }, []);
  const action = useCallback(
    async (action: string, data: Record<string, unknown> = {}) => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/public/firm-offers/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action, ...data }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load the workspace");
        if (result.offer) setOffer(result.offer);
        return result;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [token],
  );
  useEffect(() => {
    if (token) void action("read").catch(() => {});
  }, [token, action]); // Token changes only on session initialization.
  return offer ? (
    <RecipientWorkspace offer={offer} onAction={action} busy={busy} error={error} />
  ) : (
    <div className="bold-offer">
      <div className="screen">
        <span className="brand">bold.</span>
        <h1>Your private workspace</h1>
        <p role="status">{error || "Loading your proposal…"}</p>
      </div>
    </div>
  );
}
