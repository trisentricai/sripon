import { Link } from "react-router-dom";
import { useAdminResource } from "../services/admin-api";
import type { AdminProduct } from "../types/api";
import { formatINR } from "../components/ui";

export function Component() {
  const { data, loading, error } = useAdminResource<AdminProduct>("/admin/products/");

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Products</h1>
          <p className="text-sm text-ink-faint">Manage the product catalogue.</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">Add product</Link>
      </div>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading products...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No products found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Product</th>
                <th className="text-left px-3 py-2.5 font-semibold">Category</th>
                <th className="text-left px-3 py-2.5 font-semibold">SKU</th>
                <th className="text-left px-3 py-2.5 font-semibold">Price</th>
                <th className="text-left px-3 py-2.5 font-semibold">Stock</th>
                <th className="text-left px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-ink-soft/5 hover:bg-ink/[0.03]"
                >
                  <td className="px-3 py-2.5">
                    <Link to={`/admin/products/${p.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{p.category?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-faint">{p.sku}</td>
                  <td className="px-3 py-2.5">
                    ₹{formatINR(p.effective_price ?? p.price)}
                    {p.discount_percent && p.discount_percent !== "0" && (
                      <span className="ml-1 text-xs text-success">
                        ({p.discount_percent}% off)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{p.available_quantity}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className={`badge ${p.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {p.is_active ? "Active" : "Inactive"}
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