import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth";
import { toApiError } from "../api/client";
import { isFirebaseConfigured } from "../config/env";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import Breadcrumbs from "../components/ui/Breadcrumbs";

export async function loader() {
  return null;
}

function firebaseErrorMessage(err: any): string {
  const code = err?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return err?.message ? err.message.replace(/^Firebase:\s*/i, "").replace(/\(auth\/[^)]*\)/, "").trim() : "Sign in failed. Please try again.";
  }
}

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, navigate, redirect]);

  useEffect(() => {
    setError(null);
  }, [email, password]);

  if (loading || user) return <Spinner />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(redirect, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || firebaseErrorMessage(err) || toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate(redirect, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || firebaseErrorMessage(err) || toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Sign In" }]} />
      <div className="mt-6 card p-8">
        <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-soft">Sign in to continue shopping with SriPon.</p>

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input mt-1 w-full rounded-btn px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="login-password">Password</label>
              <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input mt-1 w-full rounded-btn px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full rounded-btn px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {isFirebaseConfigured() && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-ink-soft/10" />
              OR
              <span className="h-px flex-1 bg-ink-soft/10" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className="btn-outline w-full rounded-btn px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="mr-2 inline size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5.04c1.76 0 3.34.61 4.58 1.8l3.42-3.42C18.24 1.42 15.34 0 12 0 7.31 0 3.25 2.69 1.27 6.61l3.98 3.09C5.99 7.18 8.77 5.04 12 5.04z" />
                <path d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.41 3.58v3.02h3.86c2.26-2.09 3.57-5.16 3.57-8.84z" fill="#4285F4" />
                <path d="M5.25 14.3c-.26-.77-.41-1.6-.41-2.47s.15-1.7.41-2.47L5.27 6.27 1.27 3.29C.46 4.68 0 6.3 0 8c0 1.7.46 3.32 1.27 4.71l3.98-2.41z" fill="#FBBC05" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.86-3.06c-1.07.72-2.44 1.15-3.42 1.15-3.23 0-6.01-2.14-6.75-5.4l-3.98 1.75C3.25 21.31 7.31 23 12 23z" fill="#34A853" />
                <path d="M5.25 9.47c.74-3.26 3.52-5.4 6.75-5.4 1.13 0 2.33.29 3.42.86l3.13-3.13C18.24.87 15.34 0 12 0 6.69 0 2.31 2.46.67 6.61l4.58 3.55 0-.69z" />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-ink-soft">
          New to SriPon?{" "}
          <Link className="font-semibold text-brand-600 hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Component;