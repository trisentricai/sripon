import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminFetch } from "../services/admin-api";
import type { AdminCategory, AdminProduct } from "../types/api";
import {
  Card,
  InlineError,
  InlineSuccess,
  PageHeader,
  PrimaryButton,
} from "../components/ui";

type AdminProductImage = {
  id: number;
  public_id?: string;
  secure_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  is_primary?: boolean;
  sort_order?: number;
};

type PersistProduct = {
  category?: number | null;
  sku: string;
  product_code?: string;
  name: string;
  slug?: string;
  brand?: string;
  description?: string;
  short_description?: string;
  mrp: string;
  price: string;
  discount_price?: string | null;
  tax: string;
  stock_quantity?: number;
  minimum_order_quantity?: number;
  maximum_order_quantity?: number;
  weight?: number;
  unit: string;
  specifications?: unknown;
  highlights?: unknown;
  meta?: unknown;
  is_featured?: boolean;
  is_best_seller?: boolean;
  is_new?: boolean;
  is_active?: boolean;
};

const initialForm: PersistProduct = {
  category: null,
  sku: "",
  product_code: "",
  name: "",
  slug: "",
  brand: "",
  description: "",
  short_description: "",
  mrp: "0",
  price: "0",
  discount_price: null,
  tax: "0",
  stock_quantity: 0,
  minimum_order_quantity: 1,
  maximum_order_quantity: undefined,
  weight: undefined,
  unit: "",
  specifications: {},
  highlights: [],
  meta: {},
  is_featured: false,
  is_best_seller: false,
  is_new: false,
  is_active: true,
};

function JsonInput({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
  rows?: number;
  hint?: string;
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
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-ink-faint">{hint}</span>}
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
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<PersistProduct>(initialForm);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [images, setImages] = useState<AdminProductImage[]>([]);
  const [pending, setPending] = useState<{ file: File; url: string }[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    void adminFetch<{ data: AdminCategory[] }>("/admin/categories/")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    const existingId = Number(id);
    if (!Number.isFinite(existingId)) {
      setError("Invalid product id.");
      setLoading(false);
      return;
    }
    adminFetch<{ data: AdminProduct }>(`/admin/products/${existingId}/`)
      .then((res) => {
        const p = res.data;
        setForm({
          category: p.category?.id ?? null,
          sku: p.sku,
          product_code: p.product_code ?? "",
          name: p.name,
          slug: p.slug,
          brand: p.brand ?? "",
          description: p.description ?? "",
          short_description: p.short_description ?? "",
          mrp: p.mrp,
          price: p.price,
          discount_price: p.discount_price ?? null,
          tax: p.tax,
          stock_quantity: p.stock_quantity ?? 0,
          minimum_order_quantity: p.minimum_order_quantity ?? 1,
          maximum_order_quantity: p.maximum_order_quantity ?? undefined,
          weight: p.weight ?? undefined,
          unit: p.unit,
          specifications: p.specifications ?? {},
          highlights: p.highlights ?? [],
          meta: p.meta ?? {},
          is_featured: p.is_featured,
          is_best_seller: p.is_best_seller,
          is_new: p.is_new,
          is_active: p.is_active,
        });
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load product."),
      )
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    adminFetch<{ data: AdminProductImage[] }>(`/admin/products/${id}/images/`)
      .then((res) => setImages(Array.isArray(res.data) ? res.data : []))
      .catch(() => setImages([]));
  }, [id, isEdit]);

  const setField = (key: keyof PersistProduct, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(
    () => () => {
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [],
  );

  const addPendingFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPending((prev) => [...prev, ...next]);
  };

  const removePending = (index: number) => {
    setPending((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFlash(null);
    const payload: PersistProduct = {
      ...form,
      category: form.category || null,
      discount_price: form.discount_price === "" ? null : form.discount_price,
      stock_quantity: Number(form.stock_quantity) || 0,
      minimum_order_quantity: Number(form.minimum_order_quantity) || 1,
      maximum_order_quantity: form.maximum_order_quantity
        ? Number(form.maximum_order_quantity)
        : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
    };
    let productId: number | undefined;
    try {
      if (isEdit && id) {
        await adminFetch(`/admin/products/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        productId = Number(id);
        setFlash("Product updated.");
      } else {
        const created = await adminFetch<{ data: AdminProduct }>(
          "/admin/products/",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        productId = created.data.id;
        setFlash("Product created.");
      }
      if (productId && pending.length > 0) {
        // Only the very first image of a brand new product is made primary.
        const firstBecomesPrimary = !isEdit && images.length === 0;
        for (let i = 0; i < pending.length; i += 1) {
          const body = new FormData();
          body.append("images", pending[i].file);
          if (i === 0 && firstBecomesPrimary) body.append("is_primary", "true");
          await adminFetch(`/admin/products/${productId}/images/`, {
            method: "POST",
            body,
          });
        }
      }
      setTimeout(() => navigate("/products"), 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save product.";
      if (productId) {
        setError(`${message} The product was saved; retry or manage its images on the edit screen.`);
        setTimeout(() => navigate(`/products/${productId}`), 1500);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const setPrimary = async (imageId: number) => {
    if (!id) return;
    setError(null);
    try {
      await adminFetch(`/admin/products/${id}/images/${imageId}/primary/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setImages((prev) =>
        prev.map((img) => ({ ...img, is_primary: img.id === imageId })),
      );
      setFlash("Primary image updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set primary image.");
    }
  };

  const deleteImage = async (imageId: number) => {
    if (!id) return;
    setError(null);
    try {
      await adminFetch(`/admin/products/${id}/images/${imageId}/`, {
        method: "DELETE",
      });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setFlash("Image deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete image.");
    }
  };

  if (loading) {
    return <p className="text-sm text-ink-faint">Loading product...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit product" : "Add product"}
        subtitle={isEdit ? "Update product details and images." : "Create a new catalogue product."}
        action={
          <Link to="/products" className="btn btn-outline text-sm">
            Back to products
          </Link>
        }
      />

      <InlineError message={error} />
      <InlineSuccess message={flash} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category ?? ""}
                onChange={(e) =>
                  setField("category", e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">SKU *</label>
              <input
                className="input"
                required
                value={form.sku}
                onChange={(e) => setField("sku", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Product code</label>
              <input
                className="input"
                value={form.product_code}
                onChange={(e) => setField("product_code", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                className="input"
                placeholder="lower-kebab-case (auto if left blank)"
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Brand</label>
              <input
                className="input"
                value={form.brand}
                onChange={(e) => setField("brand", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Short description</label>
              <textarea
                className="input"
                rows={2}
                value={form.short_description}
                onChange={(e) => setField("short_description", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={4}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Pricing & stock</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">MRP *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.mrp}
                onChange={(e) => setField("mrp", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Price *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Discount price</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.discount_price ?? ""}
                onChange={(e) =>
                  setField("discount_price", e.target.value === "" ? null : e.target.value)
                }
              />
            </div>
            <div>
              <label className="label">Tax (%)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={form.tax}
                onChange={(e) => setField("tax", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Stock quantity</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setField("stock_quantity", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <input
                className="input"
                placeholder="e.g. kg, pack, pcs"
                value={form.unit}
                onChange={(e) => setField("unit", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Min order quantity</label>
              <input
                className="input"
                type="number"
                min="1"
                value={form.minimum_order_quantity}
                onChange={(e) => setField("minimum_order_quantity", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Max order quantity</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.maximum_order_quantity ?? ""}
                onChange={(e) =>
                  setField("maximum_order_quantity", e.target.value === "" ? undefined : e.target.value)
                }
              />
            </div>
            <div>
              <label className="label">Weight</label>
              <input
                className="input"
                type="number"
                step="0.001"
                min="0"
                value={form.weight ?? ""}
                onChange={(e) =>
                  setField("weight", e.target.value === "" ? undefined : e.target.value)
                }
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Rich content</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <JsonInput
              label="Specifications"
              hint="Key/value pairs"
              value={form.specifications}
              onChange={(next) => setField("specifications", next)}
            />
            <JsonInput
              label="Highlights"
              hint="Array of strings"
              value={form.highlights}
              onChange={(next) => setField("highlights", next)}
            />
            <JsonInput
              label="Meta"
              hint="Optional metadata map"
              value={form.meta}
              onChange={(next) => setField("meta", next)}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Flags</h2>
          <div className="mt-4 flex flex-wrap gap-6">
            {(
              [
                ["is_featured", "Featured"],
                ["is_best_seller", "Best seller"],
                ["is_new", "New"],
                ["is_active", "Active"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-brand-600"
                  checked={Boolean(form[key])}
                  onChange={(e) => setField(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Images</h2>
          <p className="mt-1 text-sm text-ink-faint">
            {isEdit
              ? "Existing images save immediately. New selections upload when you save the product."
              : "Select one or more images. They upload after the product is created."}
          </p>
          <div className="mt-4">
            <label className="btn btn-outline text-sm">
              {pending.length > 0 ? "Add more images" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addPendingFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {images.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-ink-soft">Saved images</h3>
              <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img) => (
                  <div key={img.id} className="space-y-2 rounded-btn border border-ink-soft/10 p-3">
                    {img.secure_url ? (
                      <img
                        src={img.secure_url}
                        alt={img.alt_text || form.name}
                        className="h-32 w-full rounded-btn object-cover"
                      />
                    ) : (
                      <div className="grid h-32 w-full place-items-center rounded-btn bg-ink/5 text-xs text-ink-faint">
                        No preview
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-ink-faint">
                        {img.is_primary ? "Primary" : `Sort ${img.sort_order ?? "—"}`}
                      </span>
                      <div className="flex gap-2">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => void setPrimary(img.id)}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            Set primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteImage(img.id)}
                          className="text-xs font-semibold text-error hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {images.length === 0 && pending.length === 0 && (
            <p className="mt-4 text-sm text-ink-faint">No images yet.</p>
          )}

          {pending.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-ink-soft">
                To upload ({pending.length} file{pending.length === 1 ? "" : "s"})
              </h3>
              <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pending.map((item, index) => (
                  <div key={`${item.file.name}-${index}`} className="space-y-2 rounded-btn border border-ink-soft/10 p-3">
                    <img
                      src={item.url}
                      alt={item.file.name}
                      className="h-32 w-full rounded-btn object-cover"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-ink-faint" title={item.file.name}>
                        {item.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePending(index)}
                        className="text-xs font-semibold text-error hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <div className="flex items-center gap-3">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
          </PrimaryButton>
          <Link to="/products" className="btn btn-outline text-sm">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}