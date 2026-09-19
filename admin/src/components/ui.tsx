/* Shared admin UI primitives. */

export function formatINR(value: string | number | undefined | null): string {
  const num = Number(value ?? 0);
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-faint">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-ink-soft/10 bg-surface shadow-sm ${className}`}>{children}</div>;
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

const orderStatusColors: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-indigo-50 text-indigo-700",
  PACKED: "bg-violet-50 text-violet-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  OUT_FOR_DELIVERY: "bg-brand-50 text-brand-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURN_REQUESTED: "bg-orange-50 text-orange-700",
  RETURNED: "bg-gray-100 text-gray-700",
};

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
  REFUNDED: "bg-blue-50 text-blue-700",
  PARTIALLY_REFUNDED: "bg-purple-50 text-purple-700",
};

export function StatusPill({ value, kind = "order" }: { value: string; kind?: "order" | "payment" }) {
  const colors = kind === "order" ? orderStatusColors : paymentStatusColors;
  const label = value.replace(/_/g, " ").toLowerCase();
  return (
    <span className={`badge ${colors[value] ?? "bg-gray-100 text-gray-700"}`}>
      {label}
    </span>
  );
}

/** Order status transition map (mirrors backend constants.TRANSITIONS). */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "CANCELLED"],
  CANCELLED: [],
  RETURNED: [],
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return Requested",
  RETURNED: "Returned",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially Refunded",
};

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-btn bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

export function InlineSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-btn bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>;
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-ink/5" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-card border border-dashed border-ink-soft/20 bg-surface p-10 text-center">
      <p className="font-display text-lg font-bold text-ink-faint">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
    </div>
  );
}

export function DangerButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn btn-danger ${props.className ?? ""}`}>{children}</button>;
}

export function OutlineButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn btn-outline ${props.className ?? ""}`}>{children}</button>;
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn btn-primary ${props.className ?? ""}`}>{children}</button>;
}

export function GhostButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn btn-ghost ${props.className ?? ""}`}>{children}</button>;
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-card border border-ink-soft/10 bg-surface shadow-lg`}>
        <div className="flex items-center justify-between border-b border-ink-soft/10 px-5 py-3">
          <h2 className="font-display text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-1.5 text-ink-faint hover:bg-ink/5"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Convert a backend ISO datetime to the value an <input type="datetime-local"> expects. */
export function toLocalDateTime(iso?: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}