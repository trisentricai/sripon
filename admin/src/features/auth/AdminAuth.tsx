import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "../../services/supabase";
import { isSupabaseConfigured } from "../../config/env";
import {
  registerUnauthorizedHandler,
  setAccessToken,
} from "../../services/session-token";
import { adminFetch } from "../../services/admin-api";

/** Public-ish projection of the Supabase session used across pages. */
export interface AdminSession {
  id: string;
  email: string | null;
  name?: string;
}

/** Admin identity + role permissions fetched from /auth/admin/verify/. */
export interface AdminMe {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  permissions: string[];
}

export interface AdminAuthState {
  session: AdminSession | null;
  me: AdminMe | null;
  loading: boolean;
  meLoading: boolean;
  error: string | null;
}

interface AdminAuthContextValue extends AdminAuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  hasPermission: (code: string) => boolean;
  isSuperAdmin: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const toSession = (session: Session | null): AdminSession | null => {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name:
      (session.user.user_metadata?.name as string | undefined) ??
      (session.user.email ?? "").split("@")[0] ??
      undefined,
  };
};

/**
 * Wraps the Supabase admin session lifecycle.
 *
 * - Loads the persisted session on mount and keeps it in React state.
 * - Fetches the admin identity + role permissions (`/auth/admin/verify/`).
 * - Mirrors the raw access token into the module-level token holder so every
 *   API request can attach `Authorization: Bearer <token>`.
 * - Registers the global 401 handler: an expired/rejected token signs the
 *   session out so `RequireAuth` bounces to the login screen.
 *
 * When Supabase is not configured (local scaffold without env vars) the
 * provider renders as "signed out" without erroring.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = session?.id ?? null;

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured()) {
      setAccessToken(null);
      setLoading(false);
      return () => {
        active = false;
        registerUnauthorizedHandler(null);
      };
    }

    const supabase = getSupabase();

    const sync = (nextSession: Session | null, stillLoading: boolean) => {
      if (!active) return;
      setSession(toSession(nextSession));
      setLoading(stillLoading);
    };

    const handleUnauthorized = () => {
      setAccessToken(null);
      setMe(null);
      void supabase.auth.signOut();
    };
    registerUnauthorizedHandler(handleUnauthorized);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setAccessToken(data.session?.access_token ?? null);
        sync(data.session, false);
      })
      .catch(() => {
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAccessToken(nextSession?.access_token ?? null);
      sync(nextSession, false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      registerUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setMe(null);
      setMeLoading(false);
      return;
    }
    let active = true;
    setMeLoading(true);
    adminFetch<{ data: AdminMe }>("/auth/admin/verify/")
      .then((res) => {
        if (active) setMe(res.data);
      })
      .catch(() => {
        if (active) setMe(null);
      })
      .finally(() => {
        if (active) setMeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return false;
    }
    setError(null);
    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setAccessToken(null);
    setMe(null);
    if (isSupabaseConfigured()) {
      await getSupabase().auth.signOut();
    }
    // The onAuthStateChange callback clears the session + token.
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return false;
    }
    setError(null);
    const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(
      email.trim(),
    );
    if (resetError) {
      setError(resetError.message);
      return false;
    }
    return true;
  }, []);

  const hasPermission = useCallback(
    (code: string) => (me?.permissions?.includes(code) ?? false),
    [me],
  );

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        me,
        loading,
        meLoading,
        error,
        signIn,
        signOut,
        resetPassword,
        hasPermission,
        isSuperAdmin: me?.role === "SUPER_ADMIN",
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const value = useContext(AdminAuthContext);
  if (!value) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider.");
  }
  return value;
}