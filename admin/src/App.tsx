import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequirePermission } from "./components/auth/RequirePermission";
import { AdminLayout } from "./layouts/AdminLayout";

/**
 * Route definitions - final URL contract.
 *
 * `guarded(code, loader)` keeps code-splitting while wrapping the page in a
 * permission gate that mirrors the backend's role matrix. The backend remains
 * the source of truth for authorization.
 */
const guarded =
  (permissionCode: string, load: () => Promise<{ Component: ComponentType }>) =>
  async () => {
    const mod = await load();
    const Inner = mod.Component;
    return {
      Component: () => (
        <RequirePermission permission={permissionCode}>
          <Inner />
        </RequirePermission>
      ),
    };
  };

const page = (p: string) => async () => import(`./pages/${p}.tsx`);

const routes: RouteObject[] = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: "login", lazy: page("login") },
  { path: "forgot-password", lazy: page("forgot-password") },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: "dashboard", lazy: page("dashboard") },
          { path: "products", lazy: guarded("products", page("products")) },
          { path: "products/new", lazy: guarded("products", page("product-editor")) },
          { path: "products/:id", lazy: guarded("products", page("product-editor")) },
          { path: "categories", lazy: guarded("categories", page("categories")) },
          { path: "inventory", lazy: guarded("inventory", page("inventory")) },
          { path: "orders", lazy: guarded("orders", page("orders")) },
          { path: "orders/:id", lazy: guarded("orders", page("order-detail")) },
          { path: "customers", lazy: guarded("customers", page("customers")) },
          { path: "customers/:id", lazy: guarded("customers", page("customer-detail")) },
          { path: "coupons", lazy: guarded("coupons", page("coupons")) },
          { path: "banners", lazy: guarded("banners", page("banners")) },
          { path: "posters", lazy: guarded("banners", page("posters")) },
          { path: "homepage", lazy: guarded("homepage", page("homepage")) },
          { path: "analytics", lazy: guarded("analytics", page("analytics")) },
          { path: "settings", lazy: guarded("settings", page("settings")) },
          { path: "admin-users", lazy: guarded("admin_users", page("admin-users")) },
          { path: "forbidden", lazy: page("forbidden") },
          { path: "*", lazy: page("not-found") },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes, {
  basename: "/admin-portal",
});