/**
 * Typed access to Vite environment variables.
 *
 * Values are read from the built-in `import.meta.env`. Unknown or empty
 * variables surface as `undefined` so the app can degrade gracefully during
 * local development instead of crashing.
 */

interface WebEnv {
  apiBaseUrl: string;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  enableGoogleSignIn: boolean;
  enablePhoneAuth: boolean;
}

const read = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const readFlag = (key: string, fallback = false): boolean => {
  const value = read(key);
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

/** The full Firebase config object built from individual env vars. */
export const firebaseConfig = {
  apiKey: read("VITE_FIREBASE_API_KEY"),
  authDomain: read("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: read("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: read("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: read("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: read("VITE_FIREBASE_APP_ID"),
};

export const env: WebEnv = {
  apiBaseUrl: read("VITE_API_BASE_URL") ?? "http://localhost:8000/api/v1",
  firebaseApiKey: read("VITE_FIREBASE_API_KEY"),
  firebaseAuthDomain: read("VITE_FIREBASE_AUTH_DOMAIN"),
  firebaseProjectId: read("VITE_FIREBASE_PROJECT_ID"),
  firebaseStorageBucket: read("VITE_FIREBASE_STORAGE_BUCKET"),
  firebaseMessagingSenderId: read("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  firebaseAppId: read("VITE_FIREBASE_APP_ID"),
  enableGoogleSignIn: readFlag("VITE_ENABLE_GOOGLE_SIGN_IN", true),
  enablePhoneAuth: readFlag("VITE_ENABLE_PHONE_AUTH", false),
};

/** True when the Firebase Web SDK can be initialised. */
export const isFirebaseConfigured = (): boolean =>
  Boolean(
    env.firebaseApiKey &&
      env.firebaseAuthDomain &&
      env.firebaseProjectId &&
      env.firebaseAppId,
  );