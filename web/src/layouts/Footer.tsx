import { Link } from "react-router-dom";

const linkGroups: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { to: "/products", label: "All Products" },
      { to: "/search", label: "Search" },
      { to: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/orders", label: "My Orders" },
      { to: "/profile", label: "Profile" },
      { to: "/cart", label: "Cart" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About SriPon" },
      { to: "/contact", label: "Contact" },
      { to: "/terms", label: "Terms & Conditions" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund-policy", label: "Refund Policy" },
    ],
  },
];

/** SriPon footer shell - content is final, links resolve to real routes. */
export function Footer() {
  return (
    <footer className="mt-16 bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-600 font-display text-lg font-bold text-white">
                S
              </span>
              <span className="font-display text-xl font-bold">
                Sri<span className="text-accent-400">Pon</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-paper/70">
              Your trusted destination for premium crackers and fireworks.
              Celebrations made safe, easy and memorable.
            </p>
          </div>
          {linkGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-accent-400">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-paper/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 border-t border-paper/10 pt-6 text-center text-sm text-paper/50">
          <p>
            &copy; {new Date().getFullYear()} SriPon. Burning crackers in
            public places may be restricted by local law. Please follow safety
            and legal guidelines in your area.
          </p>
        </div>
      </div>
    </footer>
  );
}