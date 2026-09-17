import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth";
import { toApiError } from "../api/client";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import Breadcrumbs from "../components/ui/Breadcrumbs";

export async function loader() {
  return null;
}

function firebaseErrorMessage(err: any): string {
  const code = err?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return err?.message ? err.message.replace(/^Firebase:\s*/i, "").replace(/\(auth\/[^)]*\)/, "").trim() : "Registration failed. Please try again.";
  }
}

export function Component() {
  const navigate = useNavigate();
  const { user, loading, signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    setError(null);
  }, [name, email, password]);

  if (loading || user) return <Spinner />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all the fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signUp(email, password, name);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || firebaseErrorMessage(err) || toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Create Account" }]} />
      <div className="mt-6 card p-8">
        <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-soft">Join SriPon for faster checkout and order tracking.</p>

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="input mt-1 w-full rounded-btn px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="label" htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input mt-1 w-full rounded-btn px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input mt-1 w-full rounded-btn px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full rounded-btn px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link className="font-semibold text-brand-600 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Component;