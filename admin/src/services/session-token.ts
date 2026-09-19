/**
 * Module-level holder for the current admin Bearer token.
 *
 * The token is written by the auth provider whenever a Supabase session is
 * loaded or refreshed, and read synchronously by every HTTP transport
 * (`adminFetch` and the axios client) when building requests.
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Register a global handler invoked when an API request gets a 401.
 *  The auth provider uses this to sign out the admin session. */
export function registerUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Notify the auth layer that the current token is no longer accepted. */
export function triggerUnauthorized() {
  onUnauthorized?.();
}