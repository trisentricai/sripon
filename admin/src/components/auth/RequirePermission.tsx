import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../../features/auth/AdminAuth";

/**
 * Route-level permission gate. Renders children only when the signed-in admin
 * has the requested permission code (mirrors backend enforcement).
 *
 * - While the identity is still loading (session present, `me` not fetched) we
 *   show a brief "Checking permissions..." state instead of flashing the 403.
 * - When the role lacks the permission we redirect to the /forbidden page.
 *
 * The backend remains the source of truth — this only improves the UX.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { session, me, meLoading, hasPermission } = useAdminAuth();

  if (!session) return <Navigate to="/login" replace />;

  if (meLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <p className="text-sm text-ink-faint">Checking permissions...</p>
      </div>
    );
  }

  if (!me || !hasPermission(permission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}