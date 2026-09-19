import { useState } from "react";
import { adminFetch, useAdminResource } from "../services/admin-api";
import type { AdminBanner, AdminBannerVariant } from "../types/api";
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

const PLACEMENTS = ["HOME_HERO", "HOME_SECONDARY", "HOME_MIDDLE", "HOME_BOTTOM", "CATEGORY_TOP", "PRODUCT_PROMOTION", "APP_HOME"];
const CTA_ACTIONS = ["NONE", "PRODUCT", "CATEGORY", "URL"];
const ALIGNMENTS = ["LEFT", "CENTER", "RIGHT"];
const VARIANTS = ["DESKTOP", "MOBILE", "IMAGE"];

const humanise = (value: string) =>
  value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type BannerForm = {
  title: string;
  subtitle: string;
  placement: string;
  cta_text: string;
  cta_action: string;
  link_product: string;
  link_category: string;
  custom_url: string;
  overlay_text_enabled: boolean;
  text_alignment: string;
  button_visible: boolean;
  display_priority: string;
  start_date: string;
  end_date: string;
  active: boolean;
};

const emptyForm: BannerForm = {
  title: "",
  subtitle: "",
  placement: "HOME_HERO",
  cta_text: "Shop now",
  cta_action: "NONE",
  link_product: "",
  link_category: "",
  custom_url: "",
  overlay_text_enabled: true,
  text_alignment: "LEFT",
  button_visible: true,
  display_priority: "0",
  start_date: "",
  end_date: "",
  active: true,
};

function BannerPreview({ banner }: { banner: AdminBanner | null }) {
  if (!banner) return null;
  const desktop = banner.images.find((i) => i.variant === "DESKTOP") ?? banner.images[0];
  const align = { LEFT: "items-start text-left", CENTER: "items-center text-center", RIGHT: "items-end text-right" }[
    banner.text_alignment ?? "LEFT"
  ] ?? "items-start text-left";
  return (
    <div className="relative flex h-44 w-full items-center overflow-hidden rounded-card border border-ink-soft/10 bg-ink/5">
      {desktop?.url ? (
        <img src={desktop.url} alt={banner.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-xs text-ink-faint">No image uploaded</span>
      )}
      {banner.overlay_text_enabled !== false && (
        <div className={`relative z-10 flex h-full w-full flex-col justify-center gap-1 p-4 ${align}`}>
          <p className="font-display text-lg font-bold text-white drop-shadow">{banner.title || "Banner title"}</p>
          {banner.subtitle && <p className="text-xs text-white/90 drop-shadow">{banner.subtitle}</p>}
          {banner.button_visible !== false && banner.cta_action !== "NONE" && (
            <span className="mt-1 w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">
              {banner.cta_text || "Shop now"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Component() {
  const { data, loading, error, refetch } = useAdminResource<AdminBanner>("/admin/banners/");
  const [flash, setFlash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (banner: AdminBanner) => {
    setEditing(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      placement: banner.placement,
      cta_text: banner.cta_text ?? "",
      cta_action: banner.cta_action ?? "NONE",
      link_product: banner.link_product ? String(banner.link_product) : "",
      link_category: banner.link_category ? String(banner.link_category) : "",
      custom_url: banner.custom_url ?? "",
      overlay_text_enabled: banner.overlay_text_enabled ?? true,
      text_alignment: banner.text_alignment ?? "LEFT",
      button_visible: banner.button_visible ?? true,
      display_priority: String(banner.display_priority ?? 0),
      start_date: toLocalDateTime(banner.start_date),
      end_date: toLocalDateTime(banner.end_date),
      active: banner.active,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      subtitle: form.subtitle,
      placement: form.placement,
      cta_text: form.cta_text,
      cta_action: form.cta_action,
      link_product: form.link_product ? Number(form.link_product) : null,
      link_category: form.link_category ? Number(form.link_category) : null,
      custom_url: form.custom_url,
      overlay_text_enabled: form.overlay_text_enabled,
      text_alignment: form.text_alignment,
      button_visible: form.button_visible,
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
        await adminFetch(`/admin/banners/${editing.id}/`, { method: "PATCH", body: JSON.stringify(payload) });
        setFlash("Banner updated.");
      } else {
        await adminFetch("/admin/banners/", { method: "POST", body: JSON.stringify(payload) });
        setFlash("Banner created. Add images below.");
      }
      setShowForm(false);
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save banner.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: AdminBanner) => {
    setFlash(null);
    try {
      await adminFetch(`/admin/banners/${banner.id}/`, { method: "PATCH", body: JSON.stringify({ active: !banner.active }) });
      setFlash(banner.active ? "Banner deactivated." : "Banner activated.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to update banner.");
    }
  };

  const handleDelete = async (banner: AdminBanner) => {
    if (!window.confirm(`Delete banner "${banner.title || `#${banner.id}`}"?`)) return;
    setFlash(null);
    try {
      await adminFetch(`/admin/banners/${banner.id}/`, { method: "DELETE" });
      setFlash("Banner deleted.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to delete banner.");
    }
  };

  const handleDuplicate = async (banner: AdminBanner) => {
    setFlash(null);
    try {
      await adminFetch(`/admin/banners/${banner.id}/duplicate/`, { method: "POST", body: "{}" });
      setFlash("Banner duplicated (copy is inactive).");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to duplicate banner.");
    }
  };

  const handleUpload = async (banner: AdminBanner, variant: string, file: File | null) => {
    if (!file) return;
    setUploadingVariant(variant);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("variant", variant);
      await adminFetch(`/admin/banners/${banner.id}/images/`, { method: "POST", body });
      setFlash(`${variant} image uploaded.`);
      void refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      setFlash(null);
    } finally {
      setUploadingVariant(null);
    }
  };

  const handleRemoveImage = async (banner: AdminBanner, variant: string) => {
    if (!window.confirm(`Remove the ${humanise(variant)} image?`)) return;
    setFlash(null);
    try {
      await adminFetch(`/admin/banners/${banner.id}/images/${variant}/`, { method: "DELETE" });
      setFlash(`${variant} image removed.`);
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to remove image.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners"
        subtitle="Homepage and catalogue promotional banners."
        action={
          <PrimaryButton onClick={openCreate} disabled={loading}>
            New banner
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
        <EmptyState title="No banners yet" description="Create your first promotional banner." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((banner) => {
            const hero = banner.images.find((i) => i.variant === "DESKTOP") ?? banner.images[0];
            return (
              <Card key={banner.id} className="flex flex-col overflow-hidden">
                <div className="relative h-32 bg-ink/5">
                  {hero?.url && (
                    <img src={hero.url} alt={banner.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <span className={`absolute left-2 top-2 badge ${banner.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {banner.active ? "Active" : "Inactive"}
                  </span>
                  <span className="absolute right-2 top-2 badge bg-surface/90 text-ink-soft">{humanise(banner.placement)}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="font-display text-base font-bold">{banner.title || `Banner #${banner.id}`}</p>
                  {banner.subtitle && <p className="text-xs text-ink-faint">{banner.subtitle}</p>}
                  <p className="mt-auto pt-1 text-xs text-ink-faint">
                    Priority {banner.display_priority ?? 0} · CTA: {banner.cta_action ?? "NONE"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {banner.images.map((img) => (
                      <span key={img.variant} className="badge bg-brand-50 text-brand-700">
                        {img.variant.toLowerCase()} ✓
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-end gap-3 pt-1 text-xs font-semibold">
                    <button onClick={() => openEdit(banner)} className="text-brand-600 hover:text-brand-700">Edit</button>
                    <button onClick={() => void handleDuplicate(banner)} className="text-ink-soft hover:text-ink">Duplicate</button>
                    <button onClick={() => void handleToggleActive(banner)} className="text-ink-soft hover:text-ink">
                      {banner.active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => void handleDelete(banner)} className="text-error hover:underline">Delete</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? `Edit "${editing.title}"` : "New banner"} onClose={() => setShowForm(false)} wide>
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <InlineError message={formError} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Placement</label>
                  <select className="input" value={form.placement} onChange={(e) => setForm((p) => ({ ...p, placement: e.target.value }))}>
                    {PLACEMENTS.map((pl) => (
                      <option key={pl} value={pl}>{humanise(pl)}</option>
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
                  <label className="label">CTA action</label>
                  <select className="input" value={form.cta_action} onChange={(e) => setForm((p) => ({ ...p, cta_action: e.target.value }))}>
                    {CTA_ACTIONS.map((a) => (
                      <option key={a} value={a}>{a === "NONE" ? "No action" : `Link to ${a.toLowerCase()}`}</option>
                    ))}
                  </select>
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
                  <label className="label">Text alignment</label>
                  <select className="input" value={form.text_alignment} onChange={(e) => setForm((p) => ({ ...p, text_alignment: e.target.value }))}>
                    {ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>{humanise(a)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Display priority</label>
                  <input className="input" type="number" min="0" value={form.display_priority} onChange={(e) => setForm((p) => ({ ...p, display_priority: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Start date</label>
                  <input className="input" type="datetime-local" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End date</label>
                  <input className="input" type="datetime-local" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-brand-600" checked={form.overlay_text_enabled} onChange={(e) => setForm((p) => ({ ...p, overlay_text_enabled: e.target.checked }))} />
                  Text overlay
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-brand-600" checked={form.button_visible} onChange={(e) => setForm((p) => ({ ...p, button_visible: e.target.checked }))} />
                  Show button
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-brand-600" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
                  Active
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <OutlineButton type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</OutlineButton>
                <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Create banner"}</PrimaryButton>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Preview</h3>
              <BannerPreview banner={editing} />
              {editing && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Images</h4>
                  {VARIANTS.map((variant) => {
                    const img = editing.images.find((i) => i.variant === variant) as AdminBannerVariant | undefined;
                    return (
                      <div key={variant} className="rounded-card border border-ink-soft/10 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{humanise(variant)}</span>
                          {img?.url ? (
                            <button onClick={() => void handleRemoveImage(editing, variant)} className="text-xs text-error hover:underline">Remove</button>
                          ) : null}
                        </div>
                        {img?.url ? (
                          <img src={img.url} alt={variant} className="mt-2 h-14 w-full rounded-btn object-cover" />
                        ) : (
                          <label className="mt-2 block cursor-pointer rounded-btn border border-dashed border-ink-soft/20 p-2 text-center text-xs text-ink-faint hover:bg-ink/5">
                            {uploadingVariant === variant ? "Uploading..." : "Choose image"}
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
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}