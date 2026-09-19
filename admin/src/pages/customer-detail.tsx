import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminFetch } from "../services/admin-api";
import type { AdminCustomer, AdminOrder } from "../types/api";
import {
  Card,
  Field,
  InlineError,
  PageHeader,
  StatusPill,
  formatINR,
} from "../components/ui";

interface CustomerDetail extends AdminCustomer {
  recent_orders?: AdminOrder[];
  addresses?: {
    id: number;
    full_name?: string;
    phone?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    is_default?: boolean;
  }[];
}

export function Component() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<{ data: CustomerDetail }>(
        `/admin/customers/${id}/`,
      );
      setCustomer(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load customer.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-ink-faint">Loading customer...</p>;
  if (error || !customer) return <p className="text-sm text-error">{error ?? "Customer not found."}</p>;

  const orders = customer.recent_orders ?? [];
  const addresses = customer.addresses ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle={customer.email}
        action={
          <Link to="/customers" className="btn btn-outline text-sm">
            Back to customers
          </Link>
        }
      />

      <InlineError message={error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <Field label="Phone">{customer.phone || "—"}</Field>
        </Card>
        <Card className="p-4">
          <Field label="Orders">{customer.order_count}</Field>
        </Card>
        <Card className="p-4">
          <Field label="Total spent">₹{formatINR(customer.total_spent)}</Field>
        </Card>
        <Card className="p-4">
          <Field label="Status">
            <span className={`badge ${customer.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {customer.active ? "Active" : "Inactive"}
            </span>
          </Field>
        </Card>
      </div>

      {addresses.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Addresses</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-btn border border-ink-soft/10 p-3 text-sm"
              >
                <p className="font-medium">
                  {addr.full_name ?? ""}
                  {addr.is_default && (
                    <span className="ml-2 badge bg-brand-50 text-brand-700">Default</span>
                  )}
                </p>
                <p className="text-ink-soft">{addr.address_line_1}, {addr.city} {addr.pincode}</p>
                <p className="text-ink-faint">{addr.phone}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2.5">Number</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-ink-soft/5 last:border-0">
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="font-mono text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill value={o.order_status} kind="order" />
                    </td>
                    <td className="px-3 py-2.5">₹{formatINR(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}