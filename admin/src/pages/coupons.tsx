import { useState } from "react";
import { adminFetch, useAdminResource } from "../services/admin-api";
import type { AdminCoupon } from "../types/api";
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

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FIXED_AMOUNT", label: "Fixed amount" },
];

type CouponForm = {
  code: string;
  discount_type: string;
  discount_value: string;
  minimum_order_value: string;
  maximum_discount: string;
  start_date: string;
  expiry_date: string;
  usage_limit: string;
  per_customer_limit: string;
  active: boolean;
};

const emptyForm: CouponForm = {
  code: "",
  discount_type: "PERCENTAGE",
  discount_value: "10",
  minimum_order_value: "0",
  maximum_discount: "",
  start_date: "",
  expiry_date: "",
  usage_limit: "",
  per_customer_limit: "1",
  active: true,
};

const discountLabel = (c: AdminCoupon) =>
  c.discount_type === "PERCENTAGE"
    ? `${Number(c.discount_value)}%`
    : `₹${Number(c.discount_value).toFixed(2)}`;

export function Component() {
  const { data, loading, error, refetch } = useAdminResource<AdminCoupon>("/admin/coupons/");
  const [flash, setFlash] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      start_date: toLocalDateTime(new Date().toISOString()),
      expiry_date: toLocalDateTime(new Date(Date.now() + 30 * 86400_000).toISOString()),
    });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value ?? ""),
      minimum_order_value: String(coupon.minimum_order_value ?? "0"),
      maximum_discount:
        coupon.maximum_discount == null ? "" : String(coupon.maximum_discount),
      start_date: toLocalDateTime(coupon.start_date),
      expiry_date: toLocalDateTime(coupon.expiry_date),
      usage_limit: coupon.usage_limit == null ? "" : String(coupon.usage_limit),
      per_customer_limit: String(coupon.per_customer_limit ?? "1"),
      active: coupon.active,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return setFormError("Code is required.");
    const value = Number(form.discount_value);
    if (!Number.isFinite(value) || value <= 0) {
      return setFormError("Discount value must be greater than zero.");
    }
    if (form.start_date && form.expiry_date && form.start_date >= form.expiry_date) {
      return setFormError("Expiry date must be after the start date.");
    }
    const payload: Record<string, unknown> = {
      code: form.code,
      discount_type: form.discount_type,
      discount_value: value,
      minimum_order_value: form.minimum_order_value ? Number(form.minimum_order_value) : 0,
      maximum_discount: form.maximum_discount
        ? Number(form.maximum_discount)
        : null,
      start_date: form.start_date || null,
      expiry_date: form.expiry_date || null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_customer_limit: Number(form.per_customer_limit) || 1,
      active: form.active,
    };
    setSaving(true);
    setFormError(null);
    setFlash(null);
    try {
      if (editing) {
        await adminFetch(`/admin/coupons/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setFlash("Coupon updated.");
      } else {
        await adminFetch("/admin/coupons/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFlash("Coupon created.");
      }
      setShowForm(false);
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: AdminCoupon) => {
    setFlash(null);
    try {
      const res = await adminFetch<{ message?: string }>(`/admin/coupons/${coupon.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ active: !coupon.active }),
      });
      setFlash(res.message ?? (coupon.active ? "Coupon deactivated." : "Coupon activated."));
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to update coupon.");
    }
  };

  const handleDelete = async (coupon: AdminCoupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"? Coupons with redemptions are deactivated.`)) return;
    setFlash(null);
    try {
      const res = await adminFetch<{ message?: string }>(`/admin/coupons/${coupon.id}/`, {
        method: "DELETE",
      });
      setFlash(res.message ?? "Coupon deleted.");
      void refetch();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Failed to delete coupon.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        subtitle="Discount codes and promotions."
        action={
          <PrimaryButton onClick={openCreate} disabled={loading}>
            New coupon
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
        <EmptyState title="No coupons yet" description="Create your first discount code." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Code</th>
                <th className="px-3 py-2.5 text-left font-semibold">Value</th>
                <th className="px-3 py-2.5 text-right font-semibold">Min order</th>
                <th className="px-3 py-2.5 text-left font-semibold">Window</th>
                <th className="px-3 py-2.5 text-right font-semibold">Used</th>
                <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold">{c.code}</td>
                  <td className="px-3 py-2.5">{discountLabel(c)}</td>
                  <td className="px-3 py-2.5 text-right text-ink-soft">
                    ₹{Number(c.minimum_order_value ?? 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} →{" "}
                    {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {c.usage_count}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`badge ${c.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {c.active ? "Active" : "Inactive"}
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
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && (
        <Modal
          title={editing ? `Edit ${editing.code}` : "New coupon"}
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={formError} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Code *</label>
                <input
                  className="input font-mono uppercase"
                  required
                  maxLength={32}
                  placeholder="SAVE10"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="label">Discount type</label>
                <select
                  className="input"
                  value={form.discount_type}
                  onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value }))}
                >
                  {DISCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Discount value *</label>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.discount_value}
                  onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Minimum order value</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimum_order_value}
                  onChange={(e) => setForm((p) => ({ ...p, minimum_order_value: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Maximum discount</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Unlimited"
                  value={form.maximum_discount}
                  onChange={(e) => setForm((p) => ({ ...p, maximum_discount: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Usage limit</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.usage_limit}
                  onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Per-customer limit</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.per_customer_limit}
                  onChange={(e) => setForm((p) => ({ ...p, per_customer_limit: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Start date *</label>
                  <input
                    className="input"
                    type="datetime-local"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Expiry date *</label>
                  <input
                    className="input"
                    type="datetime-local"
                    required
                    value={form.expiry_date}
                    onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 accent-brand-600"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Active immediately
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <OutlineButton type="button" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </OutlineButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create coupon"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}