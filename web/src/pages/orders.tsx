import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequireAuth } from "../features/auth";
import { getOrders } from "../api/orders";
import type { OrderSummary } from "../types/models";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Pagination from "../components/ui/Pagination";

export async function loader() {
  return null;
}

function statusStyles(status: string): string {
  switch (status) {
    case "PENDING": return "bg-amber-50 text-amber-700 ring-amber-200";
    case "CONFIRMED": return "bg-sky-50 text-sky-700 ring-sky-200";
    case "PROCESSING": return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "SHIPPED": return "bg-rose-50 text-rose-700 ring-rose-200";
    case "DELIVERED": return "bg-green-50 text-green-700 ring-green-200";
    case "CANCELLED": return "bg-red-50 text-red-700 ring-red-200";
    default: return "bg-ink-soft/10 text-ink-soft ring-ink-soft/20";
  }
}

function OrderCards() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getOrders({ page });
        if (!cancelled) {
          setOrders(result.orders);
          setTotalPages(result.pagination.total_pages);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  if (!orders.length) {
    return (
      <EmptyState
        title="No orders yet"
        description="When you place an order, it will show up here with live status updates."
        action={{ label: "Start Shopping", to: "/products" }}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="card block p-5 transition-shadow hover:shadow-lift"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-base font-semibold text-ink">#{order.order_number}</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  Placed on {order.placed_at
                    ? new Date(order.placed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <span className={`badge rounded-pill px-3 py-1 text-xs font-semibold ring-1 ${statusStyles(order.order_status)}`}>
                {order.order_status.charAt(0) + order.order_status.slice(1).toLowerCase()}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-soft/10 pt-4">
              <p className="text-sm text-ink-soft">
                {order.item_count} {order.item_count === 1 ? "item" : "items"}
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-brand-700">
                  ₹{parseFloat(order.total ?? "0").toFixed(2)}
                </span>
                <span className="text-sm font-medium text-brand-600">View details →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </>
  );
}

function OrdersContent() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "My Orders" }]} />
      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">My Orders</h1>
      <div className="mt-8">
        <OrderCards />
      </div>
    </div>
  );
}

export function Component() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}

export default Component;