import { useState } from "react";
import { Link } from "react-router-dom";
import { auth, initFirebase } from "../features/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import ErrorBanner from "../components/ui/ErrorBanner";
import Breadcrumbs from "../components/ui/Breadcrumbs";

export async function loader() {
  return null;
}

export function Component() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setSending(true);
    setError(null);
    setSent(false);
    try {
      initFirebase();
      if (!auth) {
        setError("Password reset is not available right now.");
        setSending(false);
        return;
      }
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/user-not-found") setError("No account found with this email.");
      else if (code === "auth/invalid-email") setError("Please enter a valid email address.");
      else setError(err?.message?.replace(/^Firebase:\s*/i, "").replace(/\(auth\/[^)]*\)/, "").trim() || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Forgot Password" }]} />
      <div className="mt-6 card p-8">
        <h1 className="font-display text-2xl font-bold text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Enter your account email and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <div className="mt-6 rounded-btn bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Check your email. If an account exists for <span className="font-semibold">{email}</span>,
            a reset link is on its way.
          </div>
        ) : (
          <>
            {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input mt-1 w-full rounded-btn px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full rounded-btn px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-ink-soft">
          Remembered it?{" "}
          <Link className="font-semibold text-brand-600 hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Component;