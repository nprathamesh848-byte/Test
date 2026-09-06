import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyRole, type AppRole } from "./roles";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  currentUser: User | null;
  session: Session | null;
  currentRole: AppRole | null;
  profile: Profile | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadIdentity(userId: string) {
  const [role, profileRes] = await Promise.all([
    fetchMyRole(),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  return { role, profile: (profileRes.data as Profile | null) ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const lastUserId = useRef<string | null>(null);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next?.user) {
      setRole(null);
      setProfile(null);
      lastUserId.current = null;
      return;
    }
    const { role, profile } = await loadIdentity(next.user.id);
    setRole(role);
    setProfile(profile);
    lastUserId.current = next.user.id;
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        await applySession(data.session);
      })
      .finally(() => !cancelled && setIsLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        setSession(next);
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY"
      ) {
        // Defer async work out of the auth callback
        setTimeout(() => {
          void applySession(next).then(() => {
            router.invalidate();
            if (event === "SIGNED_OUT") queryClient.clear();
          });
        }, 0);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applySession, router, queryClient]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setProfile(null);
    await router.navigate({ to: "/login", replace: true });
  }, [queryClient, router]);

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      isAuthenticated: !!session?.user,
      currentUser: session?.user ?? null,
      session,
      currentRole: role,
      profile,
      refresh,
      signOut,
    }),
    [isLoading, session, role, profile, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
