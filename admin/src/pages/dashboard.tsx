import { Link } from "react-router-dom";
import { useAdminResourceObject } from "../services/admin-api";
import type { DashboardPayload } from "../types/api";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusPill,
  formatINR,
} from "../components/ui";

export function Component() {
  const { data, loading, error } = useAdminResourceObject<DashboardPayload>(
    "/admin/dashboard/",
  );

  const s = data?.stats;

  const statCards = [
    { label: "Total revenue", value: s ? `₹${formatINR(s.total_revenue)}` : "—" },
    { label: "Orders", value: String(s?.total_orders ?? "—") },
    { label: "Today's revenue", value: s ? `₹${formatINR(s.today_revenue)}` : "—" },
    { label: "Today's orders", value: String(s?.today_orders ?? "—") },
    { label: "Customers", value: String(s?.total_customers ?? "—") },
    { label: "Products", value: String(s?.total_products ?? "—") },
    { label: "Pending orders", value: String(s?.pending_orders ?? "—") },
    { label: "Low / out of stock", value: `${String(s?.low_stock_products ?? "—")} / ${String(s?.out_of_stock_products ?? "—")}` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of store performance" />
      {loading ? (
        <p className="text-sm text-ink-faint">Loading dashboard...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : !data ? (
        <p className="text-sm text-ink-faint">No dashboard data.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((item) => (
              <Card key={item.label} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  {item.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold">{item.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Recent orders</h2>
            {!data.recent_orders || data.recent_orders.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No recent orders" />
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2.5">Number</th>
                      <th className="px-3 py-2.5">Customer</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_orders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-ink-soft/5 last:border-0 hover:bg-ink/[0.03]"
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            to={`/orders/${o.id}`}
                            className="font-mono text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            {o.order_number}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">{o.customer?.name ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <StatusPill value={o.order_status} kind="order" />
                        </td>
                        <td className="px-3 py-2.5">₹{formatINR(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Sales trend (14 days)</h2>
            {!data.sales_trend || data.sales_trend.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No sales data" />
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5 text-right">Orders</th>
                      <th className="px-3 py-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales_trend.map((entry) => (
                      <tr
                        key={entry.date}
                        className="border-b border-ink-soft/5 last:border-0"
                      >
                        <td className="px-3 py-2">{entry.date}</td>
                        <td className="px-3 py-2 text-right">{entry.orders}</td>
                        <td className="px-3 py-2 text-right">₹{formatINR(entry.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}