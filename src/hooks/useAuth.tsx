import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Lightweight auth context. Three user types share Supabase Auth:
//   - admin: row in sales_reps with role='admin'
//   - rep:   row in sales_reps with any other role
//   - clinic: row in clinic_portal_users (partner clinic login)
//
// `ready` is true once getSession() has resolved at least once. Consumers MUST
// gate Supabase queries on `ready` so we don't fire requests before the JWT
// is attached to the client.

export type Role = "admin" | "rep";
export type UserType = "admin" | "rep" | "clinic" | "unknown";

type AuthState = {
  session: Session | null;
  user: User | null;
  role: Role;
  userType: UserType;
  clinicId: string | null;
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
  const [userType, setUserType] = useState<UserType>("unknown");
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
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

  // Resolve user type whenever the session changes.
  useEffect(() => {
    const uid = session?.user?.id ?? null;
    const email = session?.user?.email ?? null;
    if (!uid || !email) {
      setRole("rep");
      setUserType("unknown");
      setClinicId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Check sales_reps first (admin/rep)
      const { data: rep } = await supabase
        .from("sales_reps")
        .select("role")
        .ilike("email", email)
        .maybeSingle();
      if (cancelled) return;
      if (rep) {
        const r: Role = rep.role === "admin" ? "admin" : "rep";
        setRole(r);
        setUserType(r);
        setClinicId(null);
        return;
      }
      // Then check clinic_portal_users
      const { data: clinic } = await supabase
        .from("clinic_portal_users")
        .select("clinic_id")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (clinic) {
        setRole("rep");
        setUserType("clinic");
        setClinicId(clinic.clinic_id);
        return;
      }
      setRole("rep");
      setUserType("unknown");
      setClinicId(null);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, session?.user?.email]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    role,
    userType,
    clinicId,
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
