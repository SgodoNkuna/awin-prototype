import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  forcePasswordChange: boolean;
  clearForcePasswordChange: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    const loadRole = async (userId: string) => {
      const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("force_password_change")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      setIsAdmin(!!roleRow);
      setForcePasswordChange(!!profileRow?.force_password_change);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Keep loading true until the role check resolves so admin gates don't flash-redirect.
        setLoading(true);
        void loadRole(s.user.id).finally(() => setLoading(false));
      } else {
        setIsAdmin(false);
        setForcePasswordChange(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadRole(data.session.user.id).finally(() => setLoading(false));
      } else {
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
