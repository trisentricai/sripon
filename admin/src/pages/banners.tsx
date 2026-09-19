import { useAdminResource } from "../services/admin-api";
import type { AdminBanner } from "../types/api";

export function Component() {
  const { data, loading, error } = useAdminResource<AdminBanner>("/admin/banners/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Banners</h1>
      <p className="text-sm text-ink-faint">Manage promotional posters and homepage banners.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading banners...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No banners found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Title</th>
                <th className="text-left px-3 py-2.5 font-semibold">Placement</th>
                <th className="text-left px-3 py-2.5 font-semibold">CTA</th>
                <th className="text-left px-3 py-2.5 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-medium">{b.title}</td>
                  <td className="px-3 py-2.5">
                    <span className="badge bg-brand-50 text-brand-700">{b.placement}</span>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">
                    {b.cta_action !== "NONE" ? (b.cta_text || b.cta_action) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${b.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {b.active ? "Active" : "Inactive"}
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