/**
 * Typed access to Vite environment variables used by the admin dashboard.
 */

export interface AdminEnv {
  apiBaseUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const read = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export const adminEnv: AdminEnv = {
  apiBaseUrl: read("VITE_API_BASE_URL") ?? "http://localhost:8000/api/v1",
  supabaseUrl: read("VITE_SUPABASE_URL"),
  supabaseAnonKey:
    read("VITE_SUPABASE_ANON_KEY") ?? read("VITE_SUPABASE_PUBLISHABLE_KEY"),
};

/** True when Supabase credentials are present and the admin client can boot. */
export const isSupabaseConfigured = (): boolean =>
  Boolean(adminEnv.supabaseUrl && adminEnv.supabaseAnonKey);