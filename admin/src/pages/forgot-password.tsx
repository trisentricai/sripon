import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../features/auth/AdminAuth";

export function Component() {
  const { resetPassword, error } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const ok = await resetPassword(email);
      if (ok) {
        setSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-4">
        <div className="w-full max-w-sm rounded-card border border-ink-soft/10 bg-surface p-6 text-center shadow-card">
          <h1 className="font-display text-xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-ink-soft">
            If an account exists for {email}, a password reset link is on its way.
          </p>
          <Link to="/login" className="btn btn-outline mt-6 w-full py-2.5">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="font-display text-xl font-bold">Reset password</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Enter your email and we will send you a reset link.
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
            <button type="submit" disabled={submitting} className="btn btn-primary w-full py-2.5">
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-soft">
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}