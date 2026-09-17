import { Link } from "react-router-dom";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; to: string };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-ink-soft/5 mb-4">
        <svg
          className="size-8 text-ink-faint"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {action && (
        <Link to={action.to} className="btn-primary mt-6 rounded-btn px-6 py-2.5 text-sm">
          {action.label}
        </Link>
      )}
    </div>
  );
}
