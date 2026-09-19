import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../services/admin-api";
import type { AdminCategory } from "../types/api";
import {
  Card,
  EmptyState,
  InlineError,
  InlineSuccess,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SkeletonLines,
} from "../components/ui";

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  parent: number | null;
  sort_order: number;
  active: boolean;
  image: unknown;
  banner: unknown;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  parent: null,
  sort_order: 0,
  active: true,
  image: {},
  banner: {},
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function JsonInput({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
  rows?: number;
}) {
  const [text, setText] = useState(
    value === undefined ? "" : JSON.stringify(value, null, 2),
  );
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(value === undefined ? "" : JSON.stringify(value, null, 2));
  }, [value]);

  const handleBlur = () => {
    if (!text.trim()) {
      onChange({});
      setInvalid(false);
      return;
    }
    try {
      onChange(JSON.parse(text));
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };

  return (
    <div>
      <label className="label">
        {label} <span className="ml-1 text-xs font-normal text-ink-faint">JSON</span>
      </label>
      <textarea
        className="input font-mono text-xs"
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        onBlur={handleBlur}
      />
      {invalid && <p className="mt-1 text-xs text-error">Invalid JSON - not applied.</p>}
    </div>
  );
}

export function Component() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<{ data: AdminCategory[] }>("/admin/categories/");
      setCategories(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const depthById = useMemo(() => {
    const depth = new Map<number, number>();
    const visit = (id: number, level: number): number => {
      if (depth.has(id)) return depth.get(id)!;
      depth.set(id, level);
      const cat = categories.find((c) => c.id === id);
      if (cat?.parent) {
        const parentDepth = visit(cat.parent, level + 1);
        depth.set(id, parentDepth);
      }
      return depth.get(id)!;
    };
    categories.forEach((c) => visit(c.id, 0));
    return depth;
  }, [categories]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (activeOnly && !c.active) return false;
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.slug.toLowerCase().includes(term) ||
        (c.parent ? (nameById.get(c.parent) ?? "").toLowerCase().includes(term) : false)
      );
    });
  }, [categories, search, activeOnly, nameById]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      parent: cat.parent ?? null,
      sort_order: cat.sort_order,
      active: cat.active,
      image: cat.image ?? {},
      banner: cat.banner ?? {},
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: (form.slug.trim() || toSlug(form.name)).toLowerCase(),
      description: form.description,
      parent: form.parent ?? null,
      sort_order: Number(form.sort_order) || 0,
      active: form.active,
      image: form.image ?? {},
      banner: form.banner ?? {},
    };
    setSaving(true);
    setFormError(null);
    setError(null);
    setFlash(null);
    try {
      if (editing) {
        await adminFetch(`/admin/categories/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setFlash("Category updated.");
      } else {
        await adminFetch("/admin/categories/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFlash("Category created.");
      }
      setShowForm(false);
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: AdminCategory) => {
    setError(null);
    setFlash(null);
    try {
      const res = await adminFetch<{ data: AdminCategory; message?: string }>(
        `/admin/categories/${cat.id}/`,
        { method: "PATCH", body: JSON.stringify({ active: !cat.active }) },
      );
      setFlash(res.message ?? (cat.active ? "Category deactivated." : "Category activated."));
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category.");
    }
  };

  const handleDelete = async (cat: AdminCategory) => {
    if (!window.confirm(`Delete "${cat.name}"? Categories with products are deactivated instead.`)) return;
    setError(null);
    setFlash(null);
    try {
      const res = await adminFetch<{ data: null; message?: string }>(
        `/admin/categories/${cat.id}/`,
        { method: "DELETE" },
      );
      setFlash(res.message ?? "Category deleted.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Product categories and taxonomy."
        action={
          <PrimaryButton onClick={openCreate} disabled={loading}>
            Add category
          </PrimaryButton>
        }
      />

      <InlineError message={error} />
      <InlineSuccess message={flash} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input flex-1"
            placeholder="Search by name, slug or parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-brand-600"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active only
          </label>
        </div>
      </Card>

      {loading ? (
        <Card className="p-5">
          <SkeletonLines count={6} />
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState
          title={categories.length === 0 ? "No categories yet" : "No matching categories"}
          description={
            categories.length === 0 ? "Add your first category to organise products." : "Try a different search or filter."
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold">Slug</th>
                <th className="px-3 py-2.5 text-left font-semibold">Parent</th>
                <th className="px-3 py-2.5 text-right font-semibold">Products</th>
                <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const depth = depthById.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                    <td className="px-3 py-2.5 font-medium">
                      <span style={depth > 0 ? { paddingLeft: `${depth * 1.25}rem` } : undefined}>
                        {depth > 0 && (
                          <span className="mr-1.5 text-ink-faint" aria-hidden>
                            └
                          </span>
                        )}
                        {c.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-faint">{c.slug}</td>
                    <td className="px-3 py-2.5 text-ink-soft">
                      {c.parent ? nameById.get(c.parent) ?? "—" : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">{c.product_count}</td>
                    <td className="px-3 py-2.5">
                      <span className={`badge ${c.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {c.active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
                        <button onClick={() => openEdit(c)} className="text-brand-600 hover:text-brand-700">
                          Edit
                        </button>
                        <button onClick={() => void handleToggleActive(c)} className="text-ink-soft hover:text-ink">
                          {c.active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => void handleDelete(c)} className="text-error hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog">
          <Card className="w-full max-w-lg p-6">
            <h2 className="font-display text-lg font-bold">
              {editing ? `Edit "${editing.name}"` : "Add category"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <InlineError message={formError} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Name *</label>
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input
                    className="input"
                    placeholder="auto-from-name if blank"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Parent</label>
                  <select
                    className="input"
                    value={form.parent ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        parent: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  >
                    <option value="">None (top level)</option>
                    {categories
                      .filter((c) => c.id !== editing?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="label">Sort order</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <JsonInput
                    label="Image"
                    value={form.image}
                    onChange={(next) => setForm((prev) => ({ ...prev, image: next }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <JsonInput
                    label="Banner"
                    value={form.banner}
                    onChange={(next) => setForm((prev) => ({ ...prev, banner: next }))}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand-600"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <OutlineButton type="button" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </OutlineButton>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save changes" : "Create category"}
                </PrimaryButton>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}