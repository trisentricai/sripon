import { Link } from "react-router-dom";

export function Component() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-sm text-center">
        <p className="font-display text-6xl font-bold text-brand-600">403</p>
        <h1 className="mt-4 font-display text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-ink-faint">
          Your account does not have permission to view this page. Contact a
          super admin if you believe this is a mistake.
        </p>
        <Link to="/dashboard" className="btn btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}