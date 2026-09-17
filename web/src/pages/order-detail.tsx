import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { RequireAuth } from "../features/auth";
import { getOrder, cancelOrder } from "../api/orders";
import { toApiError } from "../api/client";
import type { OrderDetail, StatusHistory } from "../types/models";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import Price from "../components/ui/Price";
import Breadcrumbs from "../components/ui/Breadcrumbs";

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

function paymentStyles(status: string): string {
  switch (status) {
    case "PAID": return "bg-green-50 text-green-700 ring-green-200";
    case "PENDING": return "bg-amber-50 text-amber-700 ring-amber-200";
    case "FAILED": return "bg-red-50 text-red-700 ring-red-200";
    case "REFUNDED": return "bg-sky-50 text-sky-700 ring-sky-200";
    default: return "bg-ink-soft/10 text-ink-soft ring-ink-soft/20";
  }
}

const addressLabels: Record<string, string> = {
  full_name: "Name",
  phone: "Phone",
  address_line_1: "Address Line 1",
  address_line_2: "Address Line 2",
  city: "City",
  district: "District",
  state: "State",
  pincode: "Pincode",
  landmark: "Landmark",
};

function OrderContent() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const orderId = Number.parseInt(id ?? "", 10);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const flash = (location.state as { success?: boolean } | null)?.success;
  const paymentPending = (location.state as { paymentPending?: boolean } | null)?.paymentPending;

  const load = useCallback(async () => {
    if (Number.isNaN(orderId)) {
      setError("Invalid order");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not load this order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelOrder(order.id);
      await load();
    } catch (err: any) {
      setCancelError(toApiError(err).message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Spinner />;
  if (error || !order) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <ErrorBanner message={error || "Order not found"} />
      </div>
    );
  }

  const canCancel = order.order_status === "PENDING" || order.order_status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "My Orders", to: "/orders" },
          { label: `Order #${order.order_number}` },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Order #{order.order_number}</h1>
        <div className="flex items-center gap-3">
          <span className={`badge rounded-pill px-3 py-1 text-xs font-semibold ring-1 ${statusStyles(order.order_status)}`}>
            {order.order_status.charAt(0) + order.order_status.slice(1).toLowerCase()}
          </span>
          <span className={`badge rounded-pill px-3 py-1 text-xs font-semibold ring-1 ${paymentStyles(order.payment_status)}`}>
            Payment: {order.payment_status.charAt(0) + order.payment_status.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {flash && (
        <div className="mt-5 rounded-btn bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Your order was placed successfully. Track it from here.
        </div>
      )}
      {paymentPending && (
        <div className="mt-5 rounded-btn bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Your order is confirmed but awaiting payment. Complete the payment from your
          payment provider to confirm it.
        </div>
      )}
      {cancelError && (
        <div className="mt-5">
          <ErrorBanner message={cancelError} />
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Status Timeline</h2>
            {order.status_history.length > 0 ? (
              <ol className="mt-5 space-y-0">
                {order.status_history.map((step, i) => (
                  <TimelineStep key={i} step={step} isLast={i === order.status_history.length - 1} isCurrent={i === order.status_history.length - 1 && step.to_status === order.order_status} />
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">No status updates yet.</p>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Items</h2>
            <ul className="mt-4 divide-y divide-ink-soft/10">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  {item.product ? (
                    <Link to={`/products/${item.product.slug}`} className="flex-1 font-medium text-ink hover:text-brand-600">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="flex-1 font-medium text-ink">{item.name}</span>
                  )}
                  <span className="text-sm text-ink-soft">
                    {item.quantity} × <Price amount={item.unit_price} />
                  </span>
                  <span className="min-w-20 text-right font-semibold text-ink">
                    <Price amount={item.line_total} />
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-ink-soft/10 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-medium text-ink"><Price amount={order.subtotal} /></dd>
              </div>
              {parseFloat(order.discount ?? "0") > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Discount</dt>
                  <dd className="font-medium text-green-600">−<Price amount={order.discount} /></dd>
                </div>
              )}
              {order.coupon_code && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Coupon</dt>
                  <dd className="font-mono text-xs font-semibold uppercase text-ink">{order.coupon_code}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Tax</dt>
                <dd className="font-medium text-ink"><Price amount={order.tax} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="font-medium text-ink"><Price amount={order.delivery_fee} /></dd>
              </div>
              <div className="flex items-center justify-between border-t border-ink-soft/10 pt-3">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="font-display text-xl font-bold text-brand-700"><Price amount={order.total} /></dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Delivery Address</h2>
            <div className="mt-4 space-y-2 text-sm">
              {Object.entries(order.address_snapshot).map(([key, value]) => (
                <p key={key} className="text-ink">
                  <span className="mr-2 text-ink-faint">{addressLabels[key] ?? key}:</span>
                  {value}
                </p>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Payment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Status</dt>
                <dd className={`badge rounded-pill px-3 py-1 text-xs font-semibold ring-1 ${paymentStyles(order.payment_status)}`}>
                  {order.payment_status.charAt(0) + order.payment_status.slice(1).toLowerCase()}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Amount</dt>
                <dd className="font-semibold text-ink"><Price amount={order.total} /></dd>
              </div>
            </dl>
            {order.notes && (
              <p className="mt-4 rounded-btn bg-ink-soft/5 px-3 py-2 text-xs text-ink-soft">
                Notes: {order.notes}
              </p>
            )}
          </section>

          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-danger w-full rounded-btn px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling ? "Cancelling…" : "Cancel Order"}
            </button>
          )}
          <Link to="/orders" className="btn-outline block w-full rounded-btn px-6 py-3 text-center text-sm font-semibold">
            Back to My Orders
          </Link>
        </aside>
      </div>
    </div>
  );
}

function TimelineStep({ step, isLast, isCurrent }: { step: StatusHistory; isLast: boolean; isCurrent: boolean }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-full ring-2 ${
            isCurrent ? "bg-brand-600 ring-brand-600" : "bg-surface ring-ink-soft/20"
          }`}
        >
          {isCurrent ? (
            <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <span className="size-1.5 rounded-full bg-ink-soft/40" />
          )}
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-ink-soft/15" />}
      </div>
      <div className="pb-1">
        <p className="text-sm font-semibold text-ink">
          {step.to_status.charAt(0) + step.to_status.slice(1).toLowerCase()}
        </p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {new Date(step.created_at).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {step.note && <p className="mt-1 text-xs text-ink-soft">{step.note}</p>}
      </div>
    </li>
  );
}

export function Component() {
  return (
    <RequireAuth>
      <OrderContent />
    </RequireAuth>
  );
}

export default Component;