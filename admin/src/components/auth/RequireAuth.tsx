import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../features/auth/AdminAuth";

/**
 * Route guard for the admin application. Everything under the admin layout is
 * protected; unauthenticated visitors are redirected to the login screen.
 */
export function RequireAuth() {
  const { session, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-ink-faint">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}