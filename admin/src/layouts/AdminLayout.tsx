import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../features/auth/AdminAuth";

interface NavItem {
  to: string;
  label: string;
  permission?: string;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Catalogue",
    items: [
      { to: "/products", label: "Products", permission: "products" },
      { to: "/categories", label: "Categories", permission: "categories" },
      { to: "/inventory", label: "Inventory", permission: "inventory" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { to: "/orders", label: "Orders", permission: "orders" },
      { to: "/customers", label: "Customers", permission: "customers" },
      { to: "/coupons", label: "Coupons", permission: "coupons" },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/banners", label: "Banners", permission: "banners" },
      { to: "/posters", label: "Posters", permission: "banners" },
      { to: "/homepage", label: "Homepage", permission: "homepage" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/analytics", label: "Analytics", permission: "analytics" },
      { to: "/settings", label: "Settings", permission: "settings" },
      { to: "/admin-users", label: "Admin Users", permission: "admin_users" },
    ],
  },
];

const PATH_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  "products/new": "New product",
  categories: "Categories",
  inventory: "Inventory",
  orders: "Orders",
  customers: "Customers",
  coupons: "Coupons",
  banners: "Banners",
  posters: "Posters",
  homepage: "Homepage",
  analytics: "Analytics",
  settings: "Settings",
  "admin-users": "Admin Users",
  forbidden: "Access denied",
};

function breadcrumbsFor(pathname: string): { label: string; to: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; to: string }[] = [];
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    let label: string | undefined =
      PATH_LABELS[acc] ?? PATH_LABELS[segment];
    if (!label) {
      label = /^\d+$/.test(segment)
        ? "Detail"
        : segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    crumbs.push({ label, to: acc });
  }
  return crumbs;
}

/**
 * Admin shell: sidebar (collapsible on desktop, drawer on mobile), header with
 * breadcrumbs + profile menu, and the route outlet. Navigation items are
 * filtered by the signed-in admin's role permissions.
 */
export function AdminLayout() {
  const { session, me, signOut, hasPermission } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    closeDrawer();
    await signOut();
    navigate("/login", { replace: true });
  };

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.permission || hasPermission(item.permission),
    ),
  })).filter((section) => section.items.length > 0);

  const crumbs = breadcrumbsFor(location.pathname);

  const sidebar = (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-ink-soft/10 bg-surface transition-transform duration-200 md:static md:translate-x-0 ${
        collapsed ? "md:w-20" : "w-64"
      } ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex h-16 items-center justify-between border-b border-ink-soft/10 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 font-display text-base font-bold text-white">
            S
          </span>
          {!collapsed && (
            <span className="truncate font-display text-lg font-bold">
              Sri<span className="text-brand-600">Pon</span>{" "}
              <span className="text-xs font-semibold text-ink-faint">Admin</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="hidden rounded-btn p-1.5 text-ink-faint hover:bg-ink/5 md:block"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
        >
          {collapsed ? "»" : "«"}
        </button>
        <button
          type="button"
          onClick={closeDrawer}
          className="rounded-btn p-2 text-ink-faint hover:bg-ink/5 md:hidden"
          aria-label="Close menu"
        >
          ×
        </button>
      </div>

      <nav
        className="flex-1 space-y-6 overflow-y-auto p-3"
        aria-label="Admin"
      >
        {visibleSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/dashboard"}
                    onClick={closeDrawer}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `block rounded-btn px-2.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                      } ${collapsed ? "text-center" : ""}`
                    }
                  >
                    {collapsed ? item.label.charAt(0) : item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-soft/10 p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="btn-outline w-full py-2 text-sm"
        >
          {collapsed ? "⇤" : "Sign out"}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 md:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      {sidebar}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-soft/10 bg-surface/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-btn p-2 text-ink-soft hover:bg-ink/5 md:hidden"
              aria-label="Open menu"
            >
              ☰
            </button>
            <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
              {crumbs.map((crumb, index) => (
                <span key={crumb.to} className="flex min-w-0 items-center gap-1.5">
                  {index > 0 && <span className="text-ink-faint">/</span>}
                  <span
                    className={
                      index === crumbs.length - 1
                        ? "truncate font-medium text-ink"
                        : "truncate text-ink-faint"
                    }
                  >
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-btn border border-ink-soft/10 px-3 py-1.5 text-sm hover:bg-ink/5"
              aria-label="Account menu"
            >
              <span className="grid size-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {(me?.name ?? session?.name ?? "A").charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[140px] truncate font-medium sm:block">
                {me?.name ?? session?.name ?? session?.email ?? "Admin"}
              </span>
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-card border border-ink-soft/10 bg-surface p-2 shadow-lg">
                  <p className="truncate px-2 py-1 text-sm font-medium">
                    {me?.name ?? "Admin"}
                  </p>
                  <p className="truncate px-2 pb-2 text-xs text-ink-faint">
                    {me?.email ?? session?.email}
                  </p>
                  {me?.role && (
                    <span className="badge mx-2 mb-2 bg-brand-50 text-brand-700">
                      {me.role.replace(/_/g, " ").toLowerCase()}
                    </span>
                  )}
                  <div className="border-t border-ink-soft/10 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full rounded-btn px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}