import { useEffect, useState } from "react";
import { getAccessToken } from "./session-token";

/** Shared admin data-fetching helper.
 *  No extra dependencies; uses the native `fetch` API with the admin bearer
 *  token from Supabase auth. Django returns `{success, data, pagination}`.
 */
export async function adminFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
const base =
    import.meta.env.VITE_API_BASE_URL ??
    (location.origin === "http://localhost:5174" || location.origin === "http://localhost:5173"
      ? "http://localhost:8000/api/v1"
      : "/api/v1");
  const url = `${base}${path}`;
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...((init?.headers ?? {}) as Record<string, string>),
    "Accept": "application/json",
  };
  if (init?.body !== undefined && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...init, headers });
  const body = (await res.json().catch(() => null)) as {
    message?: string;
    errors?: Record<string, string[]>;
    status?: number;
  } | null;
  if (!res.ok) {
    const message = body?.message ?? `Admin API error: ${res.status}`;
    const error = new Error(message) as Error & {
      status?: number;
      errors?: Record<string, string[]>;
    };
    error.status = res.status;
    error.errors = body?.errors ?? {};
    throw error;
  }
  return body as T;
}

/** Minimal data hook: loads an admin resource list on mount.
 *  Keeps loading/error/empty states without external dependencies.
 */
export function useAdminResource<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminFetch<{ data: T[] }>(path)
      .then((res) => {
        if (active) {
          const payload = res.data;
          setData(Array.isArray(payload) ? payload : []);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load data. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return { data, loading, error };
}

/** Minimal data hook: loads a single admin resource object on mount
 *  (endpoints whose `data` key carries an object, e.g. dashboard/analytics).
 */
export function useAdminResourceObject<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminFetch<{ data: T }>(path)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load data. Please try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return { data, loading, error };
}