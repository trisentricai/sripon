import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { adminEnv, isSupabaseConfigured } from "../config/env";

/**
 * Supabase client used exclusively for ADMIN authentication.
 *
 * The dashboard never issues business queries to Supabase directly - all
 * application data flows through the Django API, which is the source of
 * truth. Supabase only provides sign-in/session identity (Phase 12 wires the
 * auth UI and session handling).
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  if (!client) {
    client = createClient(adminEnv.supabaseUrl!, adminEnv.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}