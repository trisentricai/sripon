import { useAdminResource } from "../services/admin-api";
import type { AdminInventoryEntry } from "../types/api";

export function Component() {
  const { data, loading, error } = useAdminResource<AdminInventoryEntry>("/admin/inventory/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Inventory</h1>
      <p className="text-sm text-ink-faint">Stock levels and reservations.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading inventory...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No inventory found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">SKU</th>
                <th className="text-left px-3 py-2.5 font-semibold">Product</th>
                <th className="text-left px-3 py-2.5 font-semibold">Stock</th>
                <th className="text-left px-3 py-2.5 font-semibold">Reserved</th>
                <th className="text-left px-3 py-2.5 font-semibold">Available</th>
                <th className="text-left px-3 py-2.5 font-semibold">State</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-mono text-xs">{r.product_sku ?? "—"}</td>
                  <td className="px-3 py-2.5">{r.product_name ?? "—"}</td>
                  <td className="px-3 py-2.5">{r.stock_quantity}</td>
                  <td className="px-3 py-2.5">{r.reserved_quantity}</td>
                  <td className="px-3 py-2.5 font-medium">{r.available_quantity}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${r.is_out_of_stock ? "bg-red-50 text-red-700" : r.is_low_stock ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                      {r.is_out_of_stock ? "Out of stock" : r.is_low_stock ? "Low stock" : "In stock"}
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