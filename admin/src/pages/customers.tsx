import { useAdminResource } from "../services/admin-api";
import type { AdminCustomer } from "../types/api";
import { formatINR } from "../components/ui";

export function Component() {
  const { data, loading, error } = useAdminResource<AdminCustomer>("/admin/customers/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Customers</h1>
      <p className="text-sm text-ink-faint">Customer accounts and order totals.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading customers...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No customers found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Name</th>
                <th className="text-left px-3 py-2.5 font-semibold">Email</th>
                <th className="text-left px-3 py-2.5 font-semibold">Phone</th>
                <th className="text-left px-3 py-2.5 font-semibold">Orders</th>
                <th className="text-left px-3 py-2.5 font-semibold">Total spent</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-medium">{c.name}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{c.email}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{c.phone || "—"}</td>
                  <td className="px-3 py-2.5">{c.order_count}</td>
                  <td className="px-3 py-2.5">₹{formatINR(c.total_spent)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${c.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}