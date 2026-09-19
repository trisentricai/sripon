import { useAdminResource } from "../services/admin-api";
import type { AdminHomeSection } from "../types/api";

const sectionTypeLabel = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function Component() {
  const { data, loading, error } = useAdminResource<AdminHomeSection>("/admin/home/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Homepage</h1>
      <p className="text-sm text-ink-faint">Manage CMS sections and links.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading homepage...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No sections found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Order</th>
                <th className="text-left px-3 py-2.5 font-semibold">Title</th>
                <th className="text-left px-3 py-2.5 font-semibold">Type</th>
                <th className="text-left px-3 py-2.5 font-semibold">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 text-ink-faint">{s.display_order}</td>
                  <td className="px-3 py-2.5 font-medium">{s.title}</td>
                  <td className="px-3 py-2.5">{sectionTypeLabel(s.section_type)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${s.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {s.enabled ? "Enabled" : "Hidden"}
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