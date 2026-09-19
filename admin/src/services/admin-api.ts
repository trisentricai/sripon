import { QueryClient, useQuery } from "@tanstack/react-query";
import { getAccessToken, triggerUnauthorized } from "./session-token";

/**
 * Centralised admin API client.
 *
 * - Resolves the API base for dev (Vite proxy) and production (same origin).
 * - Attaches the Supabase access token as `Authorization: Bearer`.
 * - Normalises network / HTTP failures into `AdminApiError`.
 * - Fires the global "unauthorized" hook on any 401 so the auth layer can
 *   sign the admin out and bounce to the login screen.
 *
 * All data hooks are backed by TanStack Query (caching, retry, invalidation).
 */

export interface AdminApiError extends Error {
  status?: number;
  errors?: Record<string, string[]>;
}

export function apiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    (location.origin === "http://localhost:5174" ||
    location.origin === "http://localhost:5173"
      ? "http://localhost:8000/api/v1"
      : "/api/v1")
  );
}

function toAdminApiError(
  message: string,
  status?: number,
  errors?: Record<string, string[]>,
): AdminApiError {
  const error = new Error(message) as AdminApiError;
  error.status = status;
  error.errors = errors ?? {};
  return error;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unable to load data. Please try again.";
}

export async function adminFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...((init?.headers ?? {}) as Record<string, string>),
    Accept: "application/json",
  };
  if (init?.body !== undefined && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw toAdminApiError(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  const body = (await res.json().catch(() => null)) as {
    message?: string;
    errors?: Record<string, string[]>;
  } | null;

  if (!res.ok) {
    if (res.status === 401) triggerUnauthorized();
    throw toAdminApiError(
      body?.message ?? `Admin API error: ${res.status}`,
      res.status,
      body?.errors ?? {},
    );
  }
  return body as T;
}

export async function adminPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await adminFetch<{ data: T }>(path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
  return res?.data as T;
}

export async function adminPatch<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await adminFetch<{ data: T }>(path, {
    method: "PATCH",
    body: JSON.stringify(body ?? {}),
  });
  return res?.data as T;
}

export async function adminDelete(path: string): Promise<void> {
  await adminFetch(path, { method: "DELETE" });
}

/** Retry only server/network failures (5xx) — never 4xx authorisation errors. */
function adminRetry(failureCount: number, error: unknown): boolean {
  const status = (error as AdminApiError)?.status;
  if (typeof status === "number" && status < 500) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: adminRetry,
      refetchOnWindowFocus: false,
    },
  },
});

export const adminKey = (path: string) => ["admin", path];

/** Invalidate cached admin queries after a mutation. */
export function invalidateAdmin(paths: string[]) {
  paths.forEach((path) => {
    void queryClient.invalidateQueries({ queryKey: adminKey(path) });
  });
}

export interface AdminResourceResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

/** List resource backed by TanStack Query (caching + retry + invalidation). */
export function useAdminResource<T>(
  path: string,
  options?: { enabled?: boolean },
): AdminResourceResult<T> {
  const query = useQuery<{ data: T[] }>({
    queryKey: adminKey(path),
    queryFn: () => adminFetch<{ data: T[] }>(path),
    enabled: options?.enabled,
  });
  return {
    data: Array.isArray(query.data?.data) ? (query.data as { data: T[] }).data : [],
    loading: query.isPending,
    error: query.error ? errorMessage(query.error) : null,
    refetch: query.refetch,
  };
}

export interface AdminResourceObjectResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

/** Single object resource (e.g. dashboard payload) backed by TanStack Query. */
export function useAdminResourceObject<T>(
  path: string,
  options?: { enabled?: boolean },
): AdminResourceObjectResult<T> {
  const query = useQuery<{ data: T }>({
    queryKey: adminKey(path),
    queryFn: () => adminFetch<{ data: T }>(path),
    enabled: options?.enabled,
  });
  return {
    data: (query.data as { data: T } | undefined)?.data ?? null,
    loading: query.isPending,
    error: query.error ? errorMessage(query.error) : null,
    refetch: query.refetch,
  };
}