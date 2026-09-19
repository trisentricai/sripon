import { useAdminResource } from "../services/admin-api";
import type { AdminBanner } from "../types/api";

export function Component() {
  const { data, loading, error } = useAdminResource<AdminBanner>("/admin/banners/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Posters</h1>
      <p className="text-sm text-ink-faint">Promotional posters across the site.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading posters...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No posters found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Title</th>
                <th className="text-left px-3 py-2.5 font-semibold">Placement</th>
                <th className="text-left px-3 py-2.5 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-medium">{p.title}</td>
                  <td className="px-3 py-2.5">
                    <span className="badge bg-brand-50 text-brand-700">{p.placement}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${p.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {p.active ? "Active" : "Inactive"}
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