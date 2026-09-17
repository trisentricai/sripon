import type { RouteObject } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";

/**
 * Application routes.
 *
 * Pages are lazy-loaded via `route.lazy` so each chunk is fetched on demand
 * (code-splitting). Full page implementations are shipped in Phase 11; every
 * route below already maps to its final URL contract.
 */
const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, lazy: () => import("./pages/home") },
      { path: "products", lazy: () => import("./pages/products") },
      { path: "products/:slug", lazy: () => import("./pages/product-detail") },
      { path: "category/:slug", lazy: () => import("./pages/category") },
      { path: "search", lazy: () => import("./pages/search") },
      { path: "cart", lazy: () => import("./pages/cart") },
      { path: "checkout", lazy: () => import("./pages/checkout") },
      { path: "orders", lazy: () => import("./pages/orders") },
      { path: "orders/:id", lazy: () => import("./pages/order-detail") },
      { path: "profile", lazy: () => import("./pages/profile") },
      { path: "login", lazy: () => import("./pages/login") },
      { path: "register", lazy: () => import("./pages/register") },
      { path: "forgot-password", lazy: () => import("./pages/forgot-password") },
      { path: "wishlist", lazy: () => import("./pages/wishlist") },
      { path: "contact", lazy: () => import("./pages/contact") },
      { path: "about", lazy: () => import("./pages/about") },
      { path: "terms", lazy: () => import("./pages/terms") },
      { path: "privacy", lazy: () => import("./pages/privacy") },
      { path: "refund-policy", lazy: () => import("./pages/refund-policy") },
      { path: "*", lazy: () => import("./pages/not-found") },
    ],
  },
];

export const router = createBrowserRouter(routes);