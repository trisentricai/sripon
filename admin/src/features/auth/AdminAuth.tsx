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
import { setAccessToken } from "../../services/session-token";

/** Public-ish projection of the Supabase session used across pages. */
export interface AdminSession {
  id: string;
  email: string | null;
  name?: string;
}

export interface AdminAuthState {
  session: AdminSession | null;
  loading: boolean;
  error: string | null;
}

interface AdminAuthContextValue extends AdminAuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
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
 * - Mirrors the raw access token into the module-level token holder so every
 *   API request (fetch + axios) can attach `Authorization: Bearer <token>`.
 * - Exposes sign-in / sign-out / password-reset helpers.
 *
 * When Supabase is not configured (local scaffold without env vars) the
 * provider renders as "signed out" without erroring.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured()) {
      setAccessToken(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const supabase = getSupabase();

    const sync = (nextSession: Session | null, stillLoading: boolean) => {
      if (!active) return;
      setSession(toSession(nextSession));
      setLoading(stillLoading);
    };

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
    };
  }, []);

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

  return (
    <AdminAuthContext.Provider
      value={{ session, loading, error, signIn, signOut, resetPassword }}
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