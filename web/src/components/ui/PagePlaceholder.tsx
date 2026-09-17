interface PagePlaceholderProps {
  title: string;
  description: string;
}

/**
 * Temporary stand-in rendered by every route until its dedicated page ships.
 * Used exclusively during the Phase 1 scaffold; each page component below
 * will be replaced by its full implementation in Phase 11.
 */
export default function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
      <span className="badge bg-brand-50 text-brand-700">Route scaffolded</span>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-ink-soft">{description}</p>
      <div className="mt-8 rounded-card border border-dashed border-ink-soft/25 bg-surface px-6 py-10 text-center text-sm text-ink-faint">
        This page is registered in the router and will be fully implemented in
        Phase 11.
      </div>
    </section>
  );
}