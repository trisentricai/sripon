import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { env, isFirebaseConfigured } from "../../config/env";

let firebaseApp: FirebaseApp | null = null;

/** Lazily-initialised Firebase Auth instance; null when not configured. */
export let auth: Auth | null = null;

export function initFirebase(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (firebaseApp) return firebaseApp;
  firebaseApp = initializeApp({
    apiKey: env.firebaseApiKey,
    authDomain: env.firebaseAuthDomain,
    projectId: env.firebaseProjectId,
    storageBucket: env.firebaseStorageBucket,
    messagingSenderId: env.firebaseMessagingSenderId,
    appId: env.firebaseAppId,
  });
  auth = getAuth(firebaseApp);
  return firebaseApp;
}