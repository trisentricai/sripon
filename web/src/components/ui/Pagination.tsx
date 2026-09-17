interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-btn px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink-soft/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-2 py-2 text-sm text-ink-faint">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-9 rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
              p === page
                ? "bg-brand-600 text-white"
                : "text-ink-soft hover:bg-ink-soft/10"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-btn px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink-soft/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
