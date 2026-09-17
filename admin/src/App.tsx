import type { RouteObject } from "react-router-dom";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout";

/** Route definitions - final URL contract, pages shipped in Phase 12. */
const routes: RouteObject[] = [
  { index: true, element: <Navigate to="/admin/dashboard" replace /> },
  { path: "login", lazy: () => import("./pages/login") },
  { path: "forgot-password", lazy: () => import("./pages/forgot-password") },
  {
    element: <AdminLayout />,
    children: [
      { path: "dashboard", lazy: () => import("./pages/dashboard") },
      { path: "products", lazy: () => import("./pages/products") },
      { path: "products/new", lazy: () => import("./pages/product-editor") },
      { path: "products/:id", lazy: () => import("./pages/product-editor") },
      { path: "categories", lazy: () => import("./pages/categories") },
      { path: "inventory", lazy: () => import("./pages/inventory") },
      { path: "orders", lazy: () => import("./pages/orders") },
      { path: "orders/:id", lazy: () => import("./pages/order-detail") },
      { path: "customers", lazy: () => import("./pages/customers") },
      { path: "coupons", lazy: () => import("./pages/coupons") },
      { path: "banners", lazy: () => import("./pages/banners") },
      { path: "posters", lazy: () => import("./pages/posters") },
      { path: "homepage", lazy: () => import("./pages/homepage") },
      { path: "analytics", lazy: () => import("./pages/analytics") },
      { path: "settings", lazy: () => import("./pages/settings") },
      { path: "admin-users", lazy: () => import("./pages/admin-users") },
      { path: "*", lazy: () => import("./pages/not-found") },
    ],
  },
];

export const router = createBrowserRouter(routes);