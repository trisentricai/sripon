import { useState } from "react";
import { adminFetch, useAdminResource } from "../services/admin-api";
import type { AdminBanner } from "../types/api";
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
  toLocalDateTime,
} from "../components/ui";

const CTA_ACTIONS = ["NONE", "PRODUCT", "CATEGORY", "URL"];
const VARIANTS = ["DESKTOP", "MOBILE"];

const humanise = (value: string) =>
  value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type PosterForm = {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_action: string;
  link_product: string;
  link_category: string;
  custom_url: string;
  display_priority: string;
  start_date: string;
  end_date: string;
  active: boolean;
};

const emptyForm: PosterForm = {
  title: "",
  subtitle: "",
  cta_text: "View offer",
  cta_action: "NONE",
  link_product: "",
  link_category: "",
  custom_url: "",
  display_priority: "0",
  start_date: "",
  end_date: "",
  active: true,
};

type PosterRow = AdminBanner;

export function Component() {
  const { data, loading, error, refetch } = useAdminResource<PosterRow>("/admin/posters/");
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PosterRow | null>(null);
  const [form, setForm] = useState<PosterForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, start_date: toLocalDateTime(new Date().toISOString()) });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (poster: PosterRow) => {
    setEditing(poster);
    setForm({
      title: poster.title,
      subtitle: poster.subtitle ?? "",
      cta_text: poster.cta_text ?? "",
      cta_action: poster.cta_action ?? "NONE",
      link_product: poster.link_product ? String(poster.link_product) : "",
      link_category: poster.link_category ? String(poster.link_category) : "",
      custom_url: poster.custom_url ?? "",
      display_priority: String(poster.display_priority ?? 0),
      start_date: toLocalDateTime(poster.start_date),
      end_date: toLocalDateTime(poster.end_date),
      active: poster.active,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      subtitle: form.subtitle,
      cta_text: form.cta_text,
      cta_action: form.cta_action,
      link_product: form.link_product ? Number(form.link_product) : null,
      link_category: form.link_category ? Number(form.link_category) : null,
      custom_url: form.custom_url,
      display_priority: Number(form.display_priority) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      active: form.active,
    };
    setSaving(true);
    setFormError(null);
    setFlash(null);
    try {
      if (editing) {
        await adminFetch(`/admin/posters/${editing.id}/`, { method: "PATCH", body: JSON.stringify(payload) });
        setFlash("Poster updated.");
      } else {
        await adminFetch("/admin/posters/", { method: "POST", body: JSON.stringify(payload) });
        setFlash("Poster created. Add artwork below.");
      }
      setShowForm(false);
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save poster.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (poster: PosterRow) => {
    setFlash(null);
    try {
      await adminFetch(`/admin/posters/${poster.id}/`, { method: "PATCH", body: JSON.stringify({ active: !poster.active }) });
      setFlash(poster.active ? "Poster deactivated." : "Poster activated.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to update poster.");
    }
  };

  const handleDelete = async (poster: PosterRow) => {
    if (!window.confirm(`Delete poster "${poster.title || `#${poster.id}`}"?`)) return;
    setFlash(null);
    try {
      await adminFetch(`/admin/posters/${poster.id}/`, { method: "DELETE" });
      setFlash("Poster deleted.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to delete poster.");
    }
  };

  const handleUpload = async (poster: PosterRow, variant: string, file: File | null) => {
    if (!file) return;
    setUploadingVariant(variant);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("variant", variant);
      await adminFetch(`/admin/posters/${poster.id}/images/`, { method: "POST", body });
      setFlash(`${variant} artwork uploaded.`);
      void refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      setFlash(null);
    } finally {
      setUploadingVariant(null);
    }
  };

  const removeImage = async (poster: PosterRow, variant: string) => {
    if (!window.confirm(`Remove the ${humanise(variant)} artwork?`)) return;
    setFlash(null);
    try {
      await adminFetch(`/admin/posters/${poster.id}/images/${variant}/`, { method: "DELETE" });
      setFlash(`${variant} artwork removed.`);
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to remove artwork.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posters"
        subtitle="Standalone promotional creatives across the store."
        action={
          <PrimaryButton onClick={openCreate} disabled={loading}>
            New poster
          </PrimaryButton>
        }
      />

      <InlineError message={error} />
      <InlineSuccess message={flash} />

      {loading ? (
        <Card className="p-5">
          <SkeletonLines count={5} />
        </Card>
      ) : data.length === 0 ? (
        <EmptyState title="No posters yet" description="Create your first promotional poster." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((poster) => {
            const hero = poster.images.find((i) => i.variant === "DESKTOP") ?? poster.images[0];
            return (
              <Card key={poster.id} className="flex flex-col overflow-hidden">
                <div className="relative h-32 bg-ink/5">
                  {hero?.url && (
                    <img src={hero.url} alt={poster.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <span className={`absolute left-2 top-2 badge ${poster.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {poster.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="font-display text-base font-bold">{poster.title || `Poster #${poster.id}`}</p>
                  {poster.subtitle && <p className="text-xs text-ink-faint">{poster.subtitle}</p>}
                  <p className="mt-auto pt-1 text-xs text-ink-faint">
                    Priority {poster.display_priority ?? 0} · CTA: {poster.cta_action ?? "NONE"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {poster.images.map((img) => (
                      <span key={img.variant} className="badge bg-brand-50 text-brand-700">
                        {img.variant.toLowerCase()} ✓
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-end gap-3 pt-1 text-xs font-semibold">
                    <button onClick={() => openEdit(poster)} className="text-brand-600 hover:text-brand-700">Edit</button>
                    <button onClick={() => void toggleActive(poster)} className="text-ink-soft hover:text-ink">
                      {poster.active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => void handleDelete(poster)} className="text-error hover:underline">Delete</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? `Edit "${editing.title}"` : "New poster"}
          onClose={() => setShowForm(false)}
          wide
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <InlineError message={formError} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="label">CTA action</label>
                  <select className="input" value={form.cta_action} onChange={(e) => setForm((p) => ({ ...p, cta_action: e.target.value }))}>
                    {CTA_ACTIONS.map((a) => (
                      <option key={a} value={a}>{a === "NONE" ? "No action" : `Link to ${a.toLowerCase()}`}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Subtitle</label>
                  <input className="input" value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
                </div>
                <div>
                  <label className="label">CTA text</label>
                  <input className="input" maxLength={40} value={form.cta_text} onChange={(e) => setForm((p) => ({ ...p, cta_text: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Display priority</label>
                  <input className="input" type="number" min="0" value={form.display_priority} onChange={(e) => setForm((p) => ({ ...p, display_priority: e.target.value }))} />
                </div>
                {form.cta_action === "PRODUCT" && (
                  <div>
                    <label className="label">Product ID</label>
                    <input className="input" type="number" value={form.link_product} onChange={(e) => setForm((p) => ({ ...p, link_product: e.target.value }))} />
                  </div>
                )}
                {form.cta_action === "CATEGORY" && (
                  <div>
                    <label className="label">Category ID</label>
                    <input className="input" type="number" value={form.link_category} onChange={(e) => setForm((p) => ({ ...p, link_category: e.target.value }))} />
                  </div>
                )}
                {form.cta_action === "URL" && (
                  <div>
                    <label className="label">Custom URL</label>
                    <input className="input" value={form.custom_url} onChange={(e) => setForm((p) => ({ ...p, custom_url: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="label">Start date</label>
                  <input className="input" type="datetime-local" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End date</label>
                  <input className="input" type="datetime-local" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-brand-600" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
                Active
              </label>
              <div className="flex items-center justify-end gap-3 pt-2">
                <OutlineButton type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</OutlineButton>
                <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Create poster"}</PrimaryButton>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Artwork</h3>
              {editing ? (
                <div className="space-y-2">
                  {VARIANTS.map((variant) => {
                    const img = editing.images.find((i) => i.variant === variant) as { url?: string } | undefined;
                    return (
                      <div key={variant} className="rounded-card border border-ink-soft/10 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{humanise(variant)}</span>
                          {img?.url ? (
                            <button onClick={() => void removeImage(editing, variant)} className="text-xs text-error hover:underline">Remove</button>
                          ) : null}
                        </div>
                        {img?.url ? (
                          <img src={img.url} alt={variant} className="mt-2 h-16 w-full rounded-btn object-cover" />
                        ) : (
                          <label className="mt-2 block cursor-pointer rounded-btn border border-dashed border-ink-soft/20 p-2 text-center text-xs text-ink-faint hover:bg-ink/5">
                            {uploadingVariant === variant ? "Uploading..." : "Choose artwork"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => void handleUpload(editing, variant, e.target.files?.[0] ?? null)}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                  <InlineError message={uploadError} />
                </div>
              ) : (
                <p className="text-xs text-ink-faint">Save the poster first to upload artwork.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}