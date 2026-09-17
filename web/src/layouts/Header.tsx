import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth";
import { useCart } from "../features/cart/CartProvider";

const navItems = [
  { to: "/products", label: "Products" },
  { to: "/category/sparklers", label: "Categories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { summary } = useCart();
  const cartCount = summary?.item_count || 0;
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
      setMobileOpen(false);
    }
  };

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
                  isActive ? "text-brand-600" : "text-ink-soft hover:text-brand-600"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="hidden max-w-xs flex-1 md:block">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products…"
            className="input w-full py-2 text-sm"
          />
        </form>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/cart"
            className="relative rounded-btn px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-brand-600"
            aria-label="Cart"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-pill bg-brand-600 px-1 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-2 rounded-btn px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-brand-600"
              >
                <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <span className="hidden lg:inline">{profile?.name || "Account"}</span>
              </button>
              {accountOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1 w-48 rounded-card border border-ink-soft/10 bg-surface py-1 shadow-card">
                    <Link
                      to="/profile"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-ink-soft/5 hover:text-ink"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-ink-soft/5 hover:text-ink"
                    >
                      Orders
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-ink-soft/5 hover:text-ink"
                    >
                      Wishlist
                    </Link>
                    <hr className="my-1 border-ink-soft/10" />
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        signOut();
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-outline px-4 py-2 text-sm">
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-btn p-2 text-ink-soft md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-soft/10 bg-surface px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products…"
              className="input w-full py-2 text-sm"
            />
          </form>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-btn px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "text-brand-600" : "text-ink-soft hover:text-brand-600"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <hr className="my-3 border-ink-soft/10" />
          <div className="flex flex-col gap-2">
            <Link
              to="/cart"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-btn px-3 py-2.5 text-sm font-medium text-ink-soft"
            >
              Cart
              {cartCount > 0 && (
                <span className="rounded-pill bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-btn px-3 py-2.5 text-sm font-medium text-ink-soft"
                >
                  Profile
                </Link>
                <Link
                  to="/orders"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-btn px-3 py-2.5 text-sm font-medium text-ink-soft"
                >
                  Orders
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="rounded-btn px-3 py-2.5 text-left text-sm font-medium text-red-600"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-outline w-full px-4 py-2.5 text-center text-sm"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
