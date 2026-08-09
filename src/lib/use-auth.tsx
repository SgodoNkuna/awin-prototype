import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  /** ThuthukaSA role — scoped access to LOA & Risk Profile submissions only. */
  isAdvisor: boolean;
  forcePasswordChange: boolean;
  clearForcePasswordChange: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    const loadRole = async (userId: string) => {
      const [{ data: roleRows }, { data: profileRow }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "advisor"]),
        supabase
          .from("profiles")
          .select("force_password_change")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      setIsAdmin(!!roleRows?.some((r) => r.role === "admin"));
      setIsAdvisor(!!roleRows?.some((r) => r.role === "advisor"));
      setForcePasswordChange(!!profileRow?.force_password_change);
    };

    // onAuthStateChange alone is sufficient — it fires an INITIAL_SESSION
    // event with the real (storage-restored) session as soon as the client
    // determines it, so a separate getSession() call is redundant. Calling
    // both raced two concurrent loadRole() calls against each other: one
    // could resolve (and flip loading to false) while the other was still
    // in flight, letting components briefly observe loading=false with
    // stale role/force-password-change state before the second call caught
    // up — which is exactly what silently skipped the forced password
    // change redirect for a freshly created account.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Keep loading true until the role check resolves so admin gates don't flash-redirect.
        setLoading(true);
        void loadRole(s.user.id).finally(() => setLoading(false));
      } else {
        setIsAdmin(false);
        setIsAdvisor(false);
        setForcePasswordChange(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isAdmin,
        isAdvisor,
        forcePasswordChange,
        clearForcePasswordChange: () => setForcePasswordChange(false),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
