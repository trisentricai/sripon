import { useAdminResource } from "../services/admin-api";
import type { AdminCoupon } from "../types/api";

const discountLabel = (c: AdminCoupon) =>
  c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : `₹${c.discount_value}`;

export function Component() {
  const { data, loading, error } = useAdminResource<AdminCoupon>("/admin/coupons/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Coupons</h1>
      <p className="text-sm text-ink-faint">Manage discounts and promotions.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading coupons...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No coupons found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Code</th>
                <th className="text-left px-3 py-2.5 font-semibold">Value</th>
                <th className="text-left px-3 py-2.5 font-semibold">Expiry</th>
                <th className="text-left px-3 py-2.5 font-semibold">Usage</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-mono text-xs">{c.code}</td>
                  <td className="px-3 py-2.5">{discountLabel(c)}</td>
                  <td className="px-3 py-2.5 text-ink-soft">
                    {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{c.usage_count}</td>
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