import { Link, NavLink } from "react-router-dom";
import { useCartCount } from "../features/cart/useCartCount";

const navItems = [
  { to: "/products", label: "Products" },
  { to: "/category/sparklers", label: "Categories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

/**
 * SriPon header shell. Search, auth-aware account menu, and category
 * navigation are layered in Phase 11; the shell already mirrors the final
 * layout contract (brand, primary nav, cart, account).
 */
export function Header() {
  const cartCount = useCartCount();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-soft/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 font-display text-lg font-bold text-white">
            S
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-ink">
            Sri<span className="text-brand-600">Pon</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-brand-600"
                    : "text-ink-soft hover:text-brand-600"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            className="relative rounded-btn px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-brand-600"
            aria-label="Cart"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-0.5 right-0 grid min-w-5 place-items-center rounded-pill bg-brand-600 px-1 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Link to="/login" className="btn-outline px-4 py-2 text-sm">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}