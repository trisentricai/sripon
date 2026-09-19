import { useAdminResourceObject } from "../services/admin-api";
import type { AnalyticsPayload } from "../types/api";
import {
  Card,
  EmptyState,
  PageHeader,
  StatusPill,
  formatINR,
} from "../components/ui";

export function Component() {
  const { data, loading, error } = useAdminResourceObject<AnalyticsPayload>(
    "/admin/analytics/",
  );

  const summary = data?.summary;

  const payload = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Sales trend and status breakdown${
          data ? ` (last ${data.days} days)` : ""
        }`}
      />
      {loading ? (
        <p className="text-sm text-ink-faint">Loading analytics...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : !payload ? (
        <p className="text-sm text-ink-faint">No analytics data.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Orders", value: String(summary?.orders ?? "—") },
              { label: "Revenue", value: summary ? `₹${formatINR(summary.revenue)}` : "—" },
              { label: "Avg order value", value: summary ? `₹${formatINR(summary.aov)}` : "—" },
            ].map((item) => (
              <Card key={item.label} className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  {item.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold">{item.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-display text-lg font-bold">Order status</h2>
              {!payload.order_status_counts || payload.order_status_counts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No orders in window" />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {payload.order_status_counts.map((row) => (
                    <li
                      key={row.order_status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <StatusPill value={row.order_status} kind="order" />
                      </span>
                      <span className="font-semibold">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-lg font-bold">Payment status</h2>
              {!payload.payment_status_counts || payload.payment_status_counts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No payments in window" />
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {payload.payment_status_counts.map((row) => (
                    <li
                      key={row.payment_status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <StatusPill value={row.payment_status} kind="payment" />
                      </span>
                      <span className="font-semibold">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">Daily trend</h2>
            {!payload.trend || payload.trend.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No trend data" />
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5 text-right">Orders</th>
                      <th className="px-3 py-2.5 text-right">Revenue</th>
                      <th className="px-3 py-2.5 text-right">AOV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.trend.map((entry) => (
                      <tr key={entry.date ?? String(entry.orders)} className="border-b border-ink-soft/5 last:border-0">
                        <td className="px-3 py-2">{entry.date ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{entry.orders}</td>
                        <td className="px-3 py-2 text-right">₹{formatINR(entry.revenue)}</td>
                        <td className="px-3 py-2 text-right">₹{formatINR(entry.aov)}</td>
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
