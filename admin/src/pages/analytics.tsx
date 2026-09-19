import { useState } from "react";
import { useAdminResource, useAdminResourceObject } from "../services/admin-api";
import type {
  AnalyticsPayload,
  CategorySalesRow,
  TopCustomerRow,
  TopProductRow,
} from "../types/api";
import {
  Card,
  EmptyState,
  PageHeader,
  formatINR,
} from "../components/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DAY_OPTIONS = [7, 30, 90];

function TrendCard({ payload }: { payload: AnalyticsPayload }) {
  const chartData = payload.trend.map((entry) => ({
    date: entry.date ? new Date(entry.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "—",
    orders: entry.orders,
    revenue: Number(entry.revenue),
  }));

  if (chartData.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Daily trend</h2>
        <div className="mt-4">
          <EmptyState title="No trend data" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-bold">Daily trend</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-ink/10" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-faint" />
            <YAxis yAxisId="revenue" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-faint" />
            <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-faint" />
            <Tooltip />
            <Legend />
            <Line yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#7c2d12" strokeWidth={2} dot={false} />
            <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#0f766e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StatusCounts({ payload }: { payload: AnalyticsPayload }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Orders by status</h2>
        {payload.order_status_counts.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No orders in window" />
          </div>
        ) : (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={payload.order_status_counts}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-ink/10" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="text-ink-faint" />
                <YAxis dataKey="order_status" type="category" width={150} tick={{ fontSize: 11 }} className="text-ink-faint" />
                <Tooltip />
                <Bar dataKey="count" name="Orders" fill="#0f766e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Orders by payment status</h2>
        {payload.payment_status_counts.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No payments in window" />
          </div>
        ) : (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={payload.payment_status_counts}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-ink/10" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="text-ink-faint" />
                <YAxis dataKey="payment_status" type="category" width={150} tick={{ fontSize: 11 }} className="text-ink-faint" />
                <Tooltip />
                <Bar dataKey="count" name="Orders" fill="#7c2d12" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function RankTable({
  title,
  columns,
  rows,
  render,
}: {
  title: string;
  columns: string[];
  rows: unknown[];
  render: (row: unknown, index: number) => React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No data yet" />
        </div>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="table-head">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2.5 text-left">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map((row, index) => render(row, index))}</tbody>
        </table>
      )}
    </Card>
  );
}
export function Component() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useAdminResourceObject<AnalyticsPayload>(
    `/admin/analytics/?days=${days}`,
  );
  const { data: topProducts } = useAdminResource<TopProductRow>("/admin/analytics/top-products/?limit=10");
  const { data: topCustomers } = useAdminResource<TopCustomerRow>("/admin/analytics/top-customers/?limit=10");
  const { data: categorySales } = useAdminResource<CategorySalesRow>("/admin/analytics/category-sales/");

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={data ? `Sales trends and breakdowns (last ${data.days} days)` : "Sales trends and breakdowns"}
        action={
          <div className="flex items-center gap-1 rounded-btn border border-ink-soft/10 p-1">
            {DAY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`rounded-btn px-3 py-1 text-xs font-semibold ${
                  days === option ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-ink/5"
                }`}
              >
                {option}d
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-ink-faint">Loading analytics...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : !data ? (
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
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{item.label}</p>
                <p className="mt-2 font-display text-3xl font-bold">{item.value}</p>
              </Card>
            ))}
          </div>

          <TrendCard payload={data} />
          <StatusCounts payload={data} />

          <div className="grid gap-6 lg:grid-cols-3">
            <RankTable
              title="Top products"
              columns={["Product", "Units", "Revenue"]}
              rows={topProducts}
              render={(row, index) => {
                const p = row as TopProductRow;
                return (
                  <tr key={p.id} className="border-b border-ink-soft/5 last:border-0">
                    <td className="px-3 py-2 text-ink-soft">{index + 1}.</td>
                    <td className="max-w-[180px] truncate px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-right">{p.units_sold}</td>
                    <td className="px-3 py-2 text-right">₹{formatINR(p.revenue)}</td>
                  </tr>
                );
              }}
            />
            <RankTable
              title="Top customers"
              columns={["Customer", "Orders", "Spent"]}
              rows={topCustomers}
              render={(row, index) => {
                const c = row as TopCustomerRow;
                return (
                  <tr key={`${c.customer_id}-${index}`} className="border-b border-ink-soft/5 last:border-0">
                    <td className="px-3 py-2 text-ink-soft">{index + 1}.</td>
                    <td className="max-w-[160px] truncate px-3 py-2 font-medium" title={c.email}>
                      {c.name || c.email || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{c.orders}</td>
                    <td className="px-3 py-2 text-right">₹{formatINR(c.spent)}</td>
                  </tr>
                );
              }}
            />
            <RankTable
              title="Sales by category"
              columns={["Category", "Units", "Revenue"]}
              rows={categorySales}
              render={(row, index) => {
                const cat = row as CategorySalesRow;
                return (
                  <tr key={`${cat.category_id}-${index}`} className="border-b border-ink-soft/5 last:border-0">
                    <td className="px-3 py-2 text-ink-soft">{index + 1}.</td>
                    <td className="max-w-[180px] truncate px-3 py-2 font-medium">{cat.category_name}</td>
                    <td className="px-3 py-2 text-right">{cat.units}</td>
                    <td className="px-3 py-2 text-right">₹{formatINR(cat.revenue)}</td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}