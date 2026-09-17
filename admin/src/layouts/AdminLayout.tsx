import { NavLink, Outlet } from "react-router-dom";

/** Sidebar navigation mirroring the admin information architecture. */
const navSections: { label: string; items: { to: string; label: string }[] }[] =
  [
    {
      label: "Overview",
      items: [{ to: "/admin/dashboard", label: "Dashboard" }],
    },
    {
      label: "Catalogue",
      items: [
        { to: "/admin/products", label: "Products" },
        { to: "/admin/categories", label: "Categories" },
        { to: "/admin/inventory", label: "Inventory" },
      ],
    },
    {
      label: "Commerce",
      items: [
        { to: "/admin/orders", label: "Orders" },
        { to: "/admin/customers", label: "Customers" },
        { to: "/admin/coupons", label: "Coupons" },
      ],
    },
    {
      label: "Content",
      items: [
        { to: "/admin/banners", label: "Banners" },
        { to: "/admin/posters", label: "Posters" },
        { to: "/admin/homepage", label: "Homepage" },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/admin/analytics", label: "Analytics" },
        { to: "/admin/settings", label: "Settings" },
        { to: "/admin/admin-users", label: "Admin Users" },
      ],
    },
  ];

/**
 * Admin shell. Route guards + role-based access are wired in Phase 12; the
 * shell establishes the final layout contract (sidebar, header, outlet).
 */
export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-soft/10 bg-surface md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-ink-soft/10 px-4">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 font-display text-base font-bold text-white">
            S
          </span>
          <span className="font-display text-lg font-bold">
            Sri<span className="text-brand-600">Pon</span>{" "}
            <span className="text-xs font-semibold text-ink-faint">Admin</span>
          </span>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-3" aria-label="Admin">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/admin/dashboard"}
                      className={({ isActive }) =>
                        `block rounded-btn px-2.5 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-ink-soft/10 p-3">
          <button type="button" className="btn-outline w-full py-2 text-sm">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink-soft/10 bg-surface/95 px-4 backdrop-blur sm:px-6">
          <p className="font-display font-semibold">Admin</p>
          <div className="flex items-center gap-3 text-sm text-ink-faint">
            <span>Logged in as Admin</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}