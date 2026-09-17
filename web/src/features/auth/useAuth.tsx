import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import client, { registerAuthProvider } from "../../api/client";
import type { ApiResponse } from "../../types/api";
import type { UserProfile } from "../../types/models";
import { auth, initFirebase } from "./firebase";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (email: string, password: string, name: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function requireFirebase() {
  if (!auth) throw new Error("Firebase is not configured");
  return auth;
}

async function verifyToken(token: string | undefined, setProfile: (profile: UserProfile) => void) {
  const response = await client.post<ApiResponse<UserProfile>>("/auth/firebase/verify/", {
    token,
  });
  setProfile(response.data.data);
  return response.data.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initFirebase();
    registerAuthProvider(async () => auth?.currentUser?.getIdToken() ?? null);

    const instance = auth;
    if (!instance) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(instance, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const response = await client.get<ApiResponse<UserProfile>>("/auth/me/");
          setProfile(response.data.data);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const instance = requireFirebase();
    await signInWithEmailAndPassword(instance, email, password);
    const token = await instance.currentUser?.getIdToken();
    return verifyToken(token, setProfile);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const instance = requireFirebase();
    const credential = await createUserWithEmailAndPassword(instance, email, password);
    await updateProfile(credential.user, { displayName: name });
    const token = await credential.user.getIdToken();
    return verifyToken(token, setProfile);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const instance = requireFirebase();
    const credential = await signInWithPopup(instance, new GoogleAuthProvider());
    const token = await credential.user.getIdToken();
    return verifyToken(token, setProfile);
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const response = await client.get<ApiResponse<UserProfile>>("/auth/me/");
    setProfile(response.data.data);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, signIn, signUp, signOut, refreshProfile, signInWithGoogle }),
    [user, profile, loading, signIn, signUp, signOut, refreshProfile, signInWithGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}