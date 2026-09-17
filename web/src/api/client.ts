import axios, { AxiosError } from "axios";
import type { ApiError } from "../types/api";
import { env } from "../config/env";

/**
 * Centralised HTTP client for the SriPon REST API.
 *
 * - Attaches the Firebase ID token (Phase 3) to every request via an
 *   auth token provider callback.
 * - Normalises backend error envelopes into a typed `ApiError`.
 */
const client = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/** Registered by features/auth when Firebase is ready. */
let onRequestAuth: (() => Promise<string | null>) | null = null;

export function registerAuthProvider(provider: () => Promise<string | null>) {
  onRequestAuth = provider;
}

client.interceptors.request.use(async (config) => {
  if (onRequestAuth) {
    const token = await onRequestAuth();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ApiError>>;
    const data = axiosError.response?.data;
    if (data && typeof data === "object" && "success" in data) {
      return {
        success: false,
        message: data.message ?? "Request failed",
        errors: data.errors ?? {},
        status: axiosError.response?.status,
      };
    }
    return {
      success: false,
      message:
        axiosError.code === "ECONNABORTED"
          ? "Request timed out. Please try again."
          : "Could not reach the server. Check your connection.",
      errors: {},
      status: axiosError.response?.status,
    };
  }
  return {
    success: false,
    message: "Something went wrong. Please try again.",
    errors: {},
  };
}

export default client;