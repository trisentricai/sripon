import { Link } from "react-router-dom";
import { useAdminResource } from "../services/admin-api";
import type { AdminOrder } from "../types/api";
import { formatINR } from "../components/ui";

export function Component() {
  const { data, loading, error } = useAdminResource<AdminOrder>("/admin/orders/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Orders</h1>
      <p className="text-sm text-ink-faint">Manage orders and delivery status.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading orders...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No orders found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Number</th>
                <th className="text-left px-3 py-2.5 font-semibold">Customer</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold">Payment</th>
                <th className="text-left px-3 py-2.5 font-semibold">Items</th>
                <th className="text-left px-3 py-2.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5">
                    <Link to={`/orders/${o.id}`} className="font-mono text-xs font-semibold text-brand-600 hover:text-brand-700">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{o.customer?.name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${o.order_status === "DELIVERED" ? "bg-green-50 text-green-700" : o.order_status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {o.order_status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${o.payment_status === "PAID" ? "bg-green-50 text-green-700" : o.payment_status === "FAILED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {o.payment_status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{o.item_count}</td>
                  <td className="px-3 py-2.5">₹{formatINR(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}