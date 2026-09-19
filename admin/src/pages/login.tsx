import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../features/auth/AdminAuth";

export function Component() {
  const { signIn, session, error } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const ok = await signIn(email, password);
      if (ok) {
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-10 place-items-center rounded-lg bg-brand-600 font-display text-lg font-bold text-white">
            S
          </span>
          <span className="font-display text-2xl font-bold">
            Sri<span className="text-brand-600">Pon</span>{" "}
            <span className="text-sm font-semibold text-ink-faint">Admin</span>
          </span>
        </div>

        <div className="rounded-card border border-ink-soft/10 bg-surface p-6 shadow-card">
          <h1 className="font-display text-xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Access the SriPon admin dashboard with your Supabase account.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {(formError || error) && (
              <p className="rounded-btn bg-brand-50 px-3 py-2 text-sm text-brand-700">
                {formError ?? error}
              </p>
            )}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary w-full py-2.5">
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-soft">
            <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}