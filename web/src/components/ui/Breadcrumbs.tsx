import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink-soft">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-ink-faint">/</span>}
            {isLast || !item.to ? (
              <span className="font-medium text-ink">{item.label}</span>
            ) : (
              <Link to={item.to} className="transition-colors hover:text-brand-600">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
