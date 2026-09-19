import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../services/admin-api";
import type { AdminUser } from "../types/api";
import {
  Card,
  InlineError,
  InlineSuccess,
  PageHeader,
  PrimaryButton,
} from "../components/ui";

const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "ORDER_MANAGER",
  "PRODUCT_MANAGER",
  "CONTENT_MANAGER",
  "ANALYST",
] as const;

type Role = (typeof ROLES)[number];

const roleLabel = (role: string) => role.replace(/_/g, " ").toLowerCase();

export function Component() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    supabase_uid: "",
    email: "",
    name: "",
    role: "ADMIN" as Role,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<{ data: AdminUser[] }>("/admin/admin-users/");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateUser = async (
    id: number,
    payload: Partial<Pick<AdminUser, "role" | "active" | "name">>,
  ) => {
    setError(null);
    setFlash(null);
    try {
      await adminFetch(`/admin/admin-users/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setFlash("Admin user updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update admin user.");
    }
  };

  const deactivateUser = async (id: number) => {
    setError(null);
    setFlash(null);
    try {
      await adminFetch(`/admin/admin-users/${id}/`, { method: "DELETE" });
      setFlash("Admin user deactivated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate admin user.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      await adminFetch("/admin/admin-users/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setFlash("Admin user created.");
      setForm({ supabase_uid: "", email: "", name: "", role: "ADMIN" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin users"
        subtitle="Manage who has access to the administration panel. You must be a super admin."
        action={
          !showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="btn btn-primary text-sm">
              Add admin user
            </button>
          )
        }
      />

      <InlineError message={error} />
      <InlineSuccess message={flash} />

      {showForm && (
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Add admin user</h2>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Supabase UID *</label>
              <input
                className="input font-mono text-xs"
                required
                placeholder="The user's Supabase Auth UUID"
                value={form.supabase_uid}
                onChange={(e) => setForm({ ...form, supabase_uid: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create admin user"}
              </PrimaryButton>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline text-sm">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-ink-faint">Loading admin users...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-faint">No admin users found.</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Active</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-soft/5 last:border-0 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-medium">{u.name}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <select
                      className="input w-auto text-xs"
                      value={u.role}
                      onChange={(e) => void updateUser(u.id, { role: e.target.value })}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`badge ${u.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                    >
                      {u.active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {u.active ? (
                      <button
                        type="button"
                        onClick={() => void deactivateUser(u.id)}
                        className="text-xs font-semibold text-error hover:underline"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void updateUser(u.id, { active: true })}
                        className="text-xs font-semibold text-success hover:underline"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}