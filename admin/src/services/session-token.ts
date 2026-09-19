/**
 * Module-level holder for the current admin Bearer token.
 *
 * The token is written by the auth provider whenever a Supabase session is
 * loaded or refreshed, and read synchronously by every HTTP transport
 * (`adminFetch` and the axios client) when building requests.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}