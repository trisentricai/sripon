import { useAdminResource } from "../services/admin-api";
import type { AdminSetting } from "../types/api";

export function Component() {
  const { data, loading, error } = useAdminResource<AdminSetting>("/admin/settings/");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="text-sm text-ink-faint">Store settings managed via the backend settings endpoint.</p>
      {loading ? (
        <p className="text-sm text-ink-faint">Loading settings...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-faint">No settings found.</p>
      ) : (
        <div className="rounded-card overflow-hidden border border-ink-soft/10 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">Key</th>
                <th className="text-left px-3 py-2.5 font-semibold">Group</th>
                <th className="text-left px-3 py-2.5 font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-mono text-xs">{s.key}</td>
                  <td className="px-3 py-2.5">
                    <span className="badge bg-ink/5 text-ink-soft">{s.group}</span>
                  </td>
                  <td className="px-3 py-2.5 max-w-md truncate text-xs text-ink-soft">
                    {String(s.value ?? "")}
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