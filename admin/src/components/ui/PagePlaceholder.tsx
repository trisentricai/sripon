interface PagePlaceholderProps {
  title: string;
  description: string;
}

/**
 * Temporary stand-in for admin routes during the Phase 1 scaffold. Each page
 * is replaced by its full implementation in Phase 12.
 */
export default function PagePlaceholder({
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <div className="rounded-card border border-dashed border-ink-soft/25 bg-surface px-6 py-12 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">
        {description}
      </p>
      <span className="badge mt-4 bg-brand-50 text-brand-700">
        Route scaffolded
      </span>
    </div>
  );
}