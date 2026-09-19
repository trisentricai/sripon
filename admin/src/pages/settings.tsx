import { useEffect, useState } from "react";
import { adminFetch, useAdminResource } from "../services/admin-api";
import type { AdminSetting } from "../types/api";
import {
  Card,
  EmptyState,
  InlineError,
  InlineSuccess,
  Modal,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SkeletonLines,
} from "../components/ui";

const GROUPS = ["GENERAL", "SHOPPING", "LEGAL", "SOCIAL", "PAYMENT"];
const GROUP_LABELS: Record<string, string> = {
  GENERAL: "General",
  SHOPPING: "Shopping",
  LEGAL: "Legal",
  SOCIAL: "Social",
  PAYMENT: "Payment",
};

type SettingForm = {
  key: string;
  group: string;
  valueText: string;
};

const emptyForm: SettingForm = { key: "", group: "GENERAL", valueText: "" };

const stringify = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));

const parseValue = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
};

export function Component() {
  const { data, loading, error, refetch } = useAdminResource<AdminSetting>("/admin/settings/");
  const [flash, setFlash] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminSetting | null>(null);
  const [form, setForm] = useState<SettingForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeGroup && data.length > 0) setActiveGroup(data[0].group);
  }, [data, activeGroup]);

  const grouped = data.filter((s) => !activeGroup || s.group === activeGroup);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (setting: AdminSetting) => {
    setEditing(setting);
    setForm({
      key: setting.key,
      group: setting.group,
      valueText: stringify(setting.value ?? {}),
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.key.trim()) return setFormError("Key is required.");
    const value = parseValue(form.valueText);
    const payload = { key: form.key.trim(), group: form.group, value };
    setSaving(true);
    setFormError(null);
    setFlash(null);
    try {
      if (editing) {
        await adminFetch(`/admin/settings/${encodeURIComponent(editing.key)}/`, { method: "PATCH", body: JSON.stringify(payload) });
        setFlash("Setting updated.");
      } else {
        await adminFetch("/admin/settings/", { method: "POST", body: JSON.stringify(payload) });
        setFlash("Setting created.");
      }
      setShowForm(false);
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save setting.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (setting: AdminSetting) => {
    if (!window.confirm(`Delete setting "${setting.key}"?`)) return;
    setFlash(null);
    try {
      await adminFetch(`/admin/settings/${encodeURIComponent(setting.key)}/`, { method: "DELETE" });
      setFlash("Setting deleted.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to delete setting.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Store configuration key/value store."
        action={
          <PrimaryButton onClick={openCreate} disabled={loading}>
            Add setting
          </PrimaryButton>
        }
      />

      <InlineError message={error} />
      <InlineSuccess message={flash} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveGroup("")}
          className={`badge cursor-pointer px-3 py-1 ${!activeGroup ? "bg-brand-600 text-white" : "bg-ink/5 text-ink-soft hover:bg-ink/10"}`}
        >
          All
        </button>
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setActiveGroup(g)}
            className={`badge cursor-pointer px-3 py-1 ${activeGroup === g ? "bg-brand-600 text-white" : "bg-ink/5 text-ink-soft hover:bg-ink/10"}`}
          >
            {GROUP_LABELS[g] ?? g}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-5">
          <SkeletonLines count={5} />
        </Card>
      ) : grouped.length === 0 ? (
        <EmptyState title="No settings in this group" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Key</th>
                <th className="px-3 py-2.5 text-left font-semibold">Group</th>
                <th className="px-3 py-2.5 text-left font-semibold">Value</th>
                <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((s) => (
                <tr key={s.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold">{s.key}</td>
                  <td className="px-3 py-2.5">
                    <span className="badge bg-ink/5 text-ink-soft">{GROUP_LABELS[s.group] ?? s.group}</span>
                  </td>
                  <td className="max-w-md truncate px-3 py-2.5 font-mono text-xs text-ink-soft">{stringify(s.value)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button onClick={() => openEdit(s)} className="text-brand-600 hover:text-brand-700">Edit</button>
                      <button onClick={() => void handleDelete(s)} className="text-error hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && (
        <Modal title={editing ? `Edit ${editing.key}` : "Add setting"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={formError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Key *</label>
                <input className="input font-mono" placeholder="delivery_fee" disabled={!!editing} value={form.key} onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))} />
              </div>
              <div>
                <label className="label">Group</label>
                <select className="input" value={form.group} onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}>
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>{GROUP_LABELS[g] ?? g}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Value <span className="ml-1 text-xs font-normal text-ink-faint">JSON or plain string</span></label>
                <textarea className="input font-mono text-xs" rows={7} value={form.valueText} onChange={(e) => setForm((p) => ({ ...p, valueText: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <OutlineButton type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</OutlineButton>
              <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Add setting"}</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}