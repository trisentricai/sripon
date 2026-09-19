import { useState } from "react";
import { adminFetch, useAdminResource } from "../services/admin-api";
import type { AdminHomeSection } from "../types/api";
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

const SECTION_TYPES = [
  "HERO",
  "CATEGORIES",
  "FEATURED",
  "BEST_SELLERS",
  "NEW_ARRIVALS",
  "OFFERS",
  "PROMOTIONAL_POSTER",
  "CUSTOM_COLLECTION",
];

const CONTENT_TYPES = ["NONE", "PRODUCTS", "CATEGORIES", "BANNER"];

const humanise = (value: string) =>
  value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type SectionForm = {
  section_type: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  content_type: string;
  linked_banner: string;
  linked_products: string;
  linked_categories: string;
  max_items: string;
};

const emptyForm: SectionForm = {
  section_type: "FEATURED",
  title: "",
  subtitle: "",
  enabled: true,
  content_type: "PRODUCTS",
  linked_banner: "",
  linked_products: "",
  linked_categories: "",
  max_items: "12",
};

const toIdList = (text: string): number[] =>
  text
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

export function Component() {
  const { data, loading, error, refetch } = useAdminResource<AdminHomeSection>("/admin/home/");
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminHomeSection | null>(null);
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const sorted = [...data].sort((a, b) => a.display_order - b.display_order);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (section: AdminHomeSection) => {
    setEditing(section);
    setForm({
      section_type: section.section_type,
      title: section.title,
      subtitle: section.subtitle ?? "",
      enabled: section.enabled,
      content_type: section.content_type,
      linked_banner: section.linked_banner ? String(section.linked_banner) : "",
      linked_products: (section.linked_products ?? []).join(", "),
      linked_categories: (section.linked_categories ?? []).join(", "),
      max_items: section.max_items != null ? String(section.max_items) : "12",
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      section_type: form.section_type,
      title: form.title.trim(),
      subtitle: form.subtitle,
      enabled: form.enabled,
      content_type: form.content_type,
      linked_banner: form.linked_banner ? Number(form.linked_banner) : null,
      linked_products: toIdList(form.linked_products),
      linked_categories: toIdList(form.linked_categories),
      max_items: Number(form.max_items) || 12,
    };
    setSaving(true);
    setFormError(null);
    setFlash(null);
    try {
      if (editing) {
        await adminFetch(`/admin/home/${editing.id}/`, { method: "PATCH", body: JSON.stringify(payload) });
        setFlash("Section updated.");
      } else {
        await adminFetch("/admin/home/", { method: "POST", body: JSON.stringify(payload) });
        setFlash("Section created.");
      }
      setShowForm(false);
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save section.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (section: AdminHomeSection) => {
    setFlash(null);
    try {
      await adminFetch(`/admin/home/${section.id}/`, { method: "PATCH", body: JSON.stringify({ enabled: !section.enabled }) });
      setFlash(section.enabled ? "Section hidden." : "Section enabled.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to update section.");
    }
  };

  const handleDelete = async (section: AdminHomeSection) => {
    if (!window.confirm(`Delete the "${section.title || humanise(section.section_type)}" section?`)) return;
    setFlash(null);
    try {
      await adminFetch(`/admin/home/${section.id}/`, { method: "DELETE" });
      setFlash("Section deleted.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to delete section.");
    }
  };

  const move = async (section: AdminHomeSection, direction: -1 | 1) => {
    const currentIndex = sorted.findIndex((s) => s.id === section.id);
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const next = [...sorted];
    const [item] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, item);
    setFlash(null);
    try {
      await adminFetch("/admin/home/reorder/", { method: "POST", body: JSON.stringify({ ids: next.map((s) => s.id) }) });
      setFlash("Sections reordered.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to reorder sections.");
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Homepage"
        subtitle="CMS sections rendered on the customer homepage."
        action={
          <PrimaryButton onClick={openCreate} disabled={loading}>
            Add section
          </PrimaryButton>
        }
      />

      <InlineError message={error} />
      <InlineSuccess message={flash} />

      {loading ? (
        <Card className="p-5">
          <SkeletonLines count={6} />
        </Card>
      ) : sorted.length === 0 ? (
        <EmptyState title="No sections yet" description="Build the homepage by adding CMS sections." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Order</th>
                <th className="px-3 py-2.5 text-left font-semibold">Title</th>
                <th className="px-3 py-2.5 text-left font-semibold">Type</th>
                <th className="px-3 py-2.5 text-left font-semibold">Content</th>
                <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((section, index) => (
                <tr key={section.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-faint">{section.display_order}</td>
                  <td className="px-3 py-2.5 font-medium">{section.title || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="badge bg-brand-50 text-brand-700">{humanise(section.section_type)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{humanise(section.content_type)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${section.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {section.enabled ? "Enabled" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                      <button onClick={() => void move(section, -1)} disabled={index === 0} className="text-ink-soft hover:text-ink disabled:opacity-30">
                        ↑
                      </button>
                      <button onClick={() => void move(section, 1)} disabled={index === sorted.length - 1} className="text-ink-soft hover:text-ink disabled:opacity-30">
                        ↓
                      </button>
                      <button onClick={() => openEdit(section)} className="text-brand-600 hover:text-brand-700">
                        Edit
                      </button>
                      <button onClick={() => void toggleEnabled(section)} className="text-ink-soft hover:text-ink">
                        {section.enabled ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => void handleDelete(section)} className="text-error hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && (
        <Modal
          title={editing ? `Edit "${editing.title || humanise(editing.section_type)}"` : "Add section"}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={formError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Section type *</label>
                <select className="input" value={form.section_type} onChange={(e) => setForm((p) => ({ ...p, section_type: e.target.value }))}>
                  {SECTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {humanise(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Content type</label>
                <select className="input" value={form.content_type} onChange={(e) => setForm((p) => ({ ...p, content_type: e.target.value }))}>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {humanise(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Subtitle</label>
                <input className="input" value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
              </div>
              {form.content_type === "BANNER" && (
                <div>
                  <label className="label">Linked banner ID *</label>
                  <input
                    className="input"
                    type="number"
                    required
                    value={form.linked_banner}
                    onChange={(e) => setForm((p) => ({ ...p, linked_banner: e.target.value }))}
                  />
                </div>
              )}
              {form.content_type === "PRODUCTS" && (
                <div>
                  <label className="label">Product IDs (comma separated)</label>
                  <input
                    className="input"
                    placeholder="3, 7, 12"
                    value={form.linked_products}
                    onChange={(e) => setForm((p) => ({ ...p, linked_products: e.target.value }))}
                  />
                </div>
              )}
              {form.content_type === "CATEGORIES" && (
                <div>
                  <label className="label">Category IDs (comma separated)</label>
                  <input
                    className="input"
                    placeholder="1, 5"
                    value={form.linked_categories}
                    onChange={(e) => setForm((p) => ({ ...p, linked_categories: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="label">Max items</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.max_items}
                  onChange={(e) => setForm((p) => ({ ...p, max_items: e.target.value }))}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-brand-600"
                  checked={form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                />
                Enabled
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <OutlineButton type="button" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </OutlineButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create section"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}