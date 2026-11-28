import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, Lock } from "lucide-react";
import { legalDb } from "@/lib/legal/client";
import { useLegalLive } from "@/legal/runtime/trial";
import { BUSINESS_COLOR } from "@/lib/business";

export type LegalSessionState = { ready: boolean; session: Session | null };

export function useLegalSession(): LegalSessionState {
  const [state, setState] = useState<LegalSessionState>({ ready: false, session: null });
  const { live } = useLegalLive();
  useEffect(() => {
    // After switch-over legalDb() is the portal connection, so this is the portal session.
    const db = legalDb();
    let alive = true;
    db.auth.getSession().then(({ data }) => {
      if (alive) setState({ ready: true, session: data.session });
    });
    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      if (alive) setState({ ready: true, session });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [live]);
  return state;
}

// Native Legal views read the Legal database with your Legal staff login.
// Sign in once here; the browser keeps you connected.
export function LegalConnectCard({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = BUSINESS_COLOR.legal;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await legalDb().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message === "Invalid login credentials" ? "That Legal email or password didn't match." : err.message);
  };

  return (
    <form
      onSubmit={submit}
      className={compact ? "rounded-lg p-4" : "mx-auto my-10 max-w-sm rounded-xl p-6"}
      style={{ background: "#ffffff", border: `1px solid ${c.border}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: c.bg, color: c.fg }}>
          <Lock className="h-3.5 w-3.5" />
        </span>
        <div>
          <div className="text-sm font-semibold" style={{ color: "#111" }}>Connect Legal Group</div>
          <div className="text-xs" style={{ color: "#6b6b68" }}>Sign in with your Legal portal login. Only needed once.</div>
        </div>
      </div>
      <input
        type="email"
        autoComplete="username"
        required
        placeholder="Legal email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-2 w-full rounded-md px-3 py-2 text-sm outline-none"
        style={{ border: "1px solid #e6e6e3" }}
      />
      <input
        type="password"
        autoComplete="current-password"
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-3 w-full rounded-md px-3 py-2 text-sm outline-none"
        style={{ border: "1px solid #e6e6e3" }}
      />
      {error && <div className="mb-2 text-xs" style={{ color: "#b83232" }}>{error}</div>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: c.fg }}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Connect
      </button>
    </form>
  );
}

// Renders children once a Legal session exists, otherwise the connect card.
export function RequireLegal({ children, compact }: { children: ReactNode; compact?: boolean }) {
  const { ready, session } = useLegalSession();
  if (!ready) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm" style={{ color: "#6b6b68" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Connecting to Legal…
      </div>
    );
  }
  if (!session) return <LegalConnectCard compact={compact} />;
  return <>{children}</>;
}
