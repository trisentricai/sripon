import { useState } from "react";
import { adminFetch, useAdminResource } from "../services/admin-api";
import type { AdminInventoryEntry } from "../types/api";
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

interface InventoryTransaction {
  id: number;
  product_id: number;
  quantity_change: number;
  reason: string;
  reference: string;
  admin_name: string | null;
  created_at: string;
}

type Filter = "" | "low" | "out";

const REASONS = [
  { value: "ADJUSTMENT", label: "Manual adjustment" },
  { value: "PURCHASE", label: "Stock purchase" },
  { value: "RETURN", label: "Return" },
];

const FILTERS: [Filter, string][] = [
  ["", "All"],
  ["low", "Low stock"],
  ["out", "Out of stock"],
];

export function Component() {
  const [filter, setFilter] = useState<Filter>("");
  const [flash, setFlash] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminResource<AdminInventoryEntry>(
    `/admin/inventory/?page_size=100${filter ? `&state=${filter}` : ""}`,
  );

  const [adjusting, setAdjusting] = useState<AdminInventoryEntry | null>(null);
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("ADJUSTMENT");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [history, setHistory] = useState<AdminInventoryEntry | null>(null);
  const [historyRows, setHistoryRows] = useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const openAdjust = (entry: AdminInventoryEntry) => {
    setAdjusting(entry);
    setQuantityChange("");
    setReason("ADJUSTMENT");
    setReference("");
    setFormError(null);
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjusting) return;
    const change = Number(quantityChange);
    if (!Number.isInteger(change) || change === 0) {
      return setFormError("Quantity change must be a non-zero whole number.");
    }
    setSaving(true);
    setFormError(null);
    setFlash(null);
    try {
      await adminFetch(`/admin/inventory/${adjusting.product_id}/`, {
        method: "PATCH",
        body: JSON.stringify({ quantity_change: change, reason, reference }),
      });
      setFlash("Stock adjusted.");
      setAdjusting(null);
      void refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to adjust stock.");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (entry: AdminInventoryEntry) => {
    setHistory(entry);
    setHistoryRows([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const res = await adminFetch<{
        data: { inventory: AdminInventoryEntry; transactions: InventoryTransaction[] };
      }>(`/admin/inventory/${entry.product_id}/`);
      setHistoryRows(res.data.transactions);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setHistoryLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Stock levels, reservations and adjustments." />

      <InlineError message={error} />
      <InlineSuccess message={flash} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`badge cursor-pointer px-3 py-1 ${
              filter === value ? "bg-brand-600 text-white" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-5">
          <SkeletonLines count={6} />
        </Card>
      ) : data.length === 0 ? (
        <EmptyState
          title={filter ? "No matching stock" : "No inventory yet"}
          description={filter ? "Try a different filter." : "Stock rows are created alongside products."}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-soft/10 bg-ink/5">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">SKU</th>
                <th className="px-3 py-2.5 text-left font-semibold">Product</th>
                <th className="px-3 py-2.5 text-right font-semibold">Stock</th>
                <th className="px-3 py-2.5 text-right font-semibold">Reserved</th>
                <th className="px-3 py-2.5 text-right font-semibold">Available</th>
                <th className="px-3 py-2.5 text-left font-semibold">State</th>
                <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-ink-soft/5 hover:bg-ink/[0.03]">
                  <td className="px-3 py-2.5 font-mono text-xs">{row.product_sku ?? "—"}</td>
                  <td className="px-3 py-2.5 font-medium">{row.product_name}</td>
                  <td className="px-3 py-2.5 text-right">{row.stock_quantity}</td>
                  <td className="px-3 py-2.5 text-right">{row.reserved_quantity}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{row.available_quantity}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`badge ${
                        row.is_out_of_stock
                          ? "bg-red-50 text-red-700"
                          : row.is_low_stock
                            ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-green-700"
                      }`}
                    >
                      {row.is_out_of_stock ? "Out of stock" : row.is_low_stock ? "Low stock" : "In stock"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button onClick={() => openHistory(row)} className="text-ink-soft hover:text-ink">
                        History
                      </button>
                      <button onClick={() => openAdjust(row)} className="text-brand-600 hover:text-brand-700">
                        Adjust
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {adjusting && (
        <Modal title={`Adjust stock - ${adjusting.product_name}`} onClose={() => setAdjusting(null)}>
          <form onSubmit={submitAdjust} className="space-y-4">
            <InlineError message={formError} />
            <p className="rounded-card bg-ink/5 px-3 py-2 text-sm text-ink-soft">
              Current stock: <span className="font-semibold text-ink">{adjusting.stock_quantity}</span> · Available:{" "}
              <span className="font-semibold text-ink">{adjusting.available_quantity}</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Quantity change *</label>
                <input
                  className="input"
                  type="number"
                  required
                  placeholder="+10 or -3"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Reason</label>
                <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Reference</label>
                <input
                  className="input"
                  placeholder="e.g. invoice #1089"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <OutlineButton type="button" onClick={() => setAdjusting(null)} disabled={saving}>
                Cancel
              </OutlineButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "Saving..." : "Apply adjustment"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {history && (
        <Modal title={`Stock history - ${history.product_name}`} onClose={() => setHistory(null)} wide>
          {historyLoading ? (
            <SkeletonLines count={4} />
          ) : historyError ? (
            <InlineError message={historyError} />
          ) : historyRows.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-ink-soft/10 bg-ink/5">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Change</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Reason</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Reference</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Admin</th>
                  <th className="px-3 py-2.5 text-left font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((t) => (
                  <tr key={t.id} className="border-b border-ink-soft/5 last:border-0">
                    <td className="px-3 py-2.5 font-semibold">
                      <span className={t.quantity_change >= 0 ? "text-green-700" : "text-red-700"}>
                        {t.quantity_change >= 0 ? "+" : ""}
                        {t.quantity_change}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{t.reason.toLowerCase()}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{t.reference || "—"}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{t.admin_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-ink-soft">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  );
}