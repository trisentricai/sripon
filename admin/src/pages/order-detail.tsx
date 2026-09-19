import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminFetch } from "../services/admin-api";
import type { AdminOrderDetail } from "../types/api";
import {
  Card,
  Field,
  InlineError,
  InlineSuccess,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PageHeader,
  PrimaryButton,
  StatusPill,
  formatINR,
} from "../components/ui";

type AddressSnapshot = {
  full_name?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
};

const actorTypeLabel = (type: string) =>
  type === "SYSTEM" ? "System" : type === "CUSTOMER" ? "Customer" : "Admin";

export function Component() {
  const { id } = useParams();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nextStatus, setNextStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<{ data: AdminOrderDetail }>(`/admin/orders/${id}/`);
      setOrder(res.data);
      setNextStatus("");
      setPaymentStatus(res.data.payment_status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !nextStatus) return;
    setSavingStatus(true);
    setFlashError(null);
    setFlash(null);
    try {
      const res = await adminFetch<{ data: AdminOrderDetail }>(
        `/admin/orders/${id}/status/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus, note: statusNote || "" }),
        },
      );
      setOrder(res.data);
      setNextStatus("");
      setStatusNote("");
      setFlash("Order status updated.");
    } catch (err) {
      setFlashError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const updatePayment = async () => {
    if (!id || !paymentStatus || paymentStatus === order?.payment_status) return;
    setSavingPayment(true);
    setFlashError(null);
    setFlash(null);
    try {
      const res = await adminFetch<{ data: AdminOrderDetail }>(
        `/admin/orders/${id}/payment-status/`,
        {
          method: "PATCH",
          body: JSON.stringify({ payment_status: paymentStatus, note: "" }),
        },
      );
      setOrder(res.data);
      setFlash("Payment status updated.");
    } catch (err) {
      setFlashError(err instanceof Error ? err.message : "Failed to update payment status.");
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-ink-faint">Loading order...</p>;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <InlineError message={error ?? "Order not found."} />
        <Link to="/orders" className="btn btn-outline text-sm">
          Back to orders
        </Link>
      </div>
    );
  }

  const address = (order.address_snapshot ?? {}) as AddressSnapshot;
  const allowedNext = ORDER_TRANSITIONS[order.order_status] ?? [];
  const timeline = [...order.status_history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.order_number}`}
        subtitle={`Placed ${new Date(order.placed_at).toLocaleString()}`}
        action={
          <Link to="/orders" className="btn btn-outline text-sm">
            Back to orders
          </Link>
        }
      />

      <InlineError message={flashError} />
      <InlineSuccess message={flash} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <Field label="Order status">
            <span className="inline-flex items-center gap-2">
              <StatusPill value={order.order_status} kind="order" />
            </span>
          </Field>
        </Card>
        <Card className="p-4">
          <Field label="Payment status">
            <StatusPill value={order.payment_status} kind="payment" />
          </Field>
        </Card>
        <Card className="p-4">
          <Field label="Items">
            <span className="font-semibold">{order.item_count}</span>
          </Field>
        </Card>
        <Card className="p-4">
          <Field label="Total">
            <span className="font-semibold">₹{formatINR(order.total)}</span>
          </Field>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Customer</h2>
          <div className="mt-3 space-y-2 text-sm text-ink-soft">
            <p className="font-semibold text-ink">{order.customer?.name ?? "—"}</p>
            <p>{order.customer?.email ?? "—"}</p>
            <p>{order.customer?.phone ?? "—"}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Delivery address</h2>
          <div className="mt-3 space-y-1 text-sm text-ink-soft">
            <p className="font-semibold text-ink">
              {[address.full_name, address.phone].filter(Boolean).join(" · ") || "—"}
            </p>
            <p>{[address.address_line_1, address.address_line_2].filter(Boolean).join(", ") || "—"}</p>
            <p>{[address.city, address.district, address.state].filter(Boolean).join(", ") || "—"}</p>
            <p>{address.pincode || ""}</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Summary</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd>₹{formatINR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Discount</dt>
              <dd className="text-success">-₹{formatINR(order.discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Tax</dt>
              <dd>₹{formatINR(order.tax)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery fee</dt>
              <dd>₹{formatINR(order.delivery_fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-ink-soft/10 pt-2 font-semibold">
              <dt>Total</dt>
              <dd>₹{formatINR(order.total)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Items</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-soft/10 text-left text-xs uppercase tracking-wider text-ink-faint">
                <th className="pb-2">Item</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2 text-right">Quantity</th>
                <th className="pb-2 text-right">Unit price</th>
                <th className="pb-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-ink-soft/5 last:border-0">
                  <td className="py-2.5">
                    {item.product?.id ? (
                      <Link
                        to={`/admin/products/${item.product.id}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-ink-faint">{item.sku}</td>
                  <td className="py-2.5 text-right">{item.quantity}</td>
                  <td className="py-2.5 text-right">₹{formatINR(item.unit_price)}</td>
                  <td className="py-2.5 text-right font-medium">₹{formatINR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Update order</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <form onSubmit={updateStatus} className="space-y-3">
            <p className="text-sm font-semibold text-ink-soft">Order status</p>
            {allowedNext.length === 0 ? (
              <p className="text-sm text-ink-faint">
                No further transitions available for this order.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {allowedNext.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNextStatus(s)}
                      className={`btn text-sm ${nextStatus === s ? "btn-primary" : "btn-outline"}`}
                    >
                      {ORDER_STATUS_LABELS[s] ?? s}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder="Optional note for the change"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
                <PrimaryButton type="submit" disabled={savingStatus || !nextStatus}>
                  {savingStatus ? "Updating..." : "Update status"}
                </PrimaryButton>
              </>
            )}
          </form>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-ink-soft">Payment status</p>
            <select
              className="input"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
            <PrimaryButton
              type="button"
              onClick={() => void updatePayment()}
              disabled={savingPayment || paymentStatus === order.payment_status}
            >
              {savingPayment ? "Updating..." : "Update payment status"}
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Timeline</h2>
        <ol className="mt-4 space-y-4 border-l border-ink-soft/15 pl-5">
          {timeline.map((entry, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.42rem] top-1 grid size-3 place-items-center rounded-full bg-brand-600 ring-4 ring-surface" />
              <p className="text-sm">
                <span className="font-semibold">
                  {ORDER_STATUS_LABELS[entry.to_status] ?? entry.to_status}
                </span>
                <span className="text-ink-faint">
                  {" "}by {actorTypeLabel(entry.actor_type)}{entry.actor ? ` (${entry.actor})` : ""}
                </span>
              </p>
              <p className="text-xs text-ink-faint">
                {new Date(entry.created_at).toLocaleString()}
              </p>
              {entry.note && <p className="mt-1 text-sm text-ink-soft">{entry.note}</p>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}