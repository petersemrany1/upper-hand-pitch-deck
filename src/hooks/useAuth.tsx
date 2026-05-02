import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Lightweight auth context. The portal has a single tenant of internal users —
// no public signup. The login screen is the only entry point and `useAuth` is
// consumed by the dashboard layout to gate access.
//
// `ready` is true once getSession() has resolved at least once. Consumers MUST
// gate Supabase queries on `ready` so we don't fire requests before the JWT
// is attached to the client (which previously caused a wave of unauth retries).
//
// `role` is fetched from sales_reps (matched by email, case-insensitive) and
// defaults to 'rep' if no row is found. NEVER default to admin.

export type Role = "admin" | "rep";

type AuthState = {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>("rep");

  useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession to avoid missing the first event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch role whenever the session's email changes.
  useEffect(() => {
    const email = session?.user?.email ?? null;
    if (!email) {
      setRole("rep");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("role")
        .ilike("email", email)
        .maybeSingle();
      if (cancelled) return;
      const r = data?.role === "admin" ? "admin" : "rep";
      setRole(r);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.email]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    role,
    loading: !ready,
    ready,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
