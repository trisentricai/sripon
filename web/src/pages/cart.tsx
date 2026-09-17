import { useState } from "react";
import { Link } from "react-router-dom";
import { toApiError } from "../api/client";
import { useCart } from "../features/cart/CartProvider";
import Price from "../components/ui/Price";
import QtyStepper from "../components/ui/QtyStepper";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Spinner from "../components/ui/Spinner";

export async function loader() {
  return null;
}

export function Component() {
  const { items, summary, loading, removeItem, updateQuantity, clearCart, applyCoupon } = useCart();
  const [coupon, setCoupon] = useState("");
  const [applying, setApplying] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    setCouponMessage(null);
    setCouponError(null);
    try {
      const result = await applyCoupon(coupon.trim(), parseFloat(summary?.subtotal ?? "0"));
      const discount = parseFloat(result.discount ?? "0");
      setCouponMessage(
        result.message ||
          (discount > 0
            ? `Coupon ${coupon.trim().toUpperCase()} applied — you save ₹${discount.toFixed(2)}`
            : "Coupon accepted"),
      );
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || toApiError(err).message);
    } finally {
      setApplying(false);
    }
  };

  const hasItems = items.length > 0;
  const subtotal = summary ? parseFloat(summary.subtotal) : items.reduce((s, i) => s + parseFloat(i.line_total || "0"), 0);
  const discount = summary ? parseFloat(summary.discount_total) : items.reduce((s, i) => s + parseFloat(i.mrp_line_total || "0") - parseFloat(i.line_total || "0"), 0);
  const tax = summary ? parseFloat(summary.tax_total) : 0;
  const total = summary ? parseFloat(summary.total) : Math.max(0, subtotal - discount + tax);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Shopping Cart" }]} />
      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">Shopping Cart</h1>

      {loading ? (
        <Spinner />
      ) : !hasItems ? (
        <EmptyState
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Explore our collection and find something you love."
          action={{ label: "Continue Shopping", to: "/products" }}
        />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="border-b border-ink-soft/10 bg-ink-soft/5 text-xs uppercase tracking-wide text-ink-faint">
                    <tr>
                      <th className="px-5 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-soft/10">
                    {items.map((item) => (
                      <tr key={item.id} className={item.is_available ? "" : "opacity-70"}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <div className="size-16 shrink-0 overflow-hidden rounded-btn bg-ink-soft/5">
                              {item.product.primary_image ? (
                                <img
                                  src={item.product.primary_image.secure_url}
                                  alt={item.product.primary_image.alt_text || item.product.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-ink-faint">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/products/${item.product.slug}`}
                                className="line-clamp-2 font-medium text-ink transition-colors hover:text-brand-600"
                              >
                                {item.product.name}
                              </Link>
                              <p className="mt-0.5 text-xs text-ink-faint">
                                {item.product.unit || item.product.sku}
                              </p>
                              {!item.is_available && (
                                <span className="badge mt-1 bg-red-50 text-red-700">Unavailable</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-ink">
                          <Price amount={item.unit_price} />
                        </td>
                        <td className="px-4 py-4">
                          <QtyStepper
                            value={item.quantity}
                            onChange={(q) => updateQuantity(item.id, q)}
                            min={item.product.minimum_order_quantity || 1}
                            max={Math.min(
                              item.product.maximum_order_quantity || 99,
                              item.product.available_quantity || 99,
                            )}
                            disabled={!item.is_available}
                          />
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-ink">
                          <Price amount={item.line_total} />
                        </td>
                        <td className="px-2 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={`Remove ${item.product.name}`}
                            className="rounded-btn p-2 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <button
                  type="button"
                  onClick={clearCart}
                  className="btn-ghost rounded-btn px-4 py-2 text-sm"
                >
                  Clear Cart
                </button>
                <Link to="/products" className="btn-outline rounded-btn px-4 py-2 text-sm">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card p-5">
              <h2 className="font-display text-lg font-semibold text-ink">Order Summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Subtotal</dt>
                  <dd className="font-medium text-ink">
                    <Price amount={subtotal.toFixed(2)} />
                  </dd>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-soft">Discount</dt>
                    <dd className="font-medium text-green-600">
                      −<Price amount={discount.toFixed(2)} />
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Tax</dt>
                  <dd className="font-medium text-ink">
                    <Price amount={tax.toFixed(2)} />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Delivery</dt>
                  <dd className="text-ink-faint">Calculated at checkout</dd>
                </div>
                <div className="flex items-center justify-between border-t border-ink-soft/10 pt-3">
                  <dt className="font-semibold text-ink">Total</dt>
                  <dd className="font-display text-xl font-bold text-brand-700">
                    <Price amount={total.toFixed(2)} />
                  </dd>
                </div>
              </dl>
              <Link
                to="/checkout"
                className={`btn-primary mt-5 block w-full rounded-btn px-6 py-3 text-center text-sm font-semibold ${items.some((i) => !i.is_available) ? "pointer-events-none opacity-50" : ""}`}
              >
                Proceed to Checkout
              </Link>
              {items.some((i) => !i.is_available) && (
                <p className="mt-2 text-center text-xs text-red-600">
                  Remove unavailable items to continue.
                </p>
              )}
            </div>

            <div className="card p-5">
              <h2 className="font-display text-lg font-semibold text-ink">Apply Coupon</h2>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Enter coupon code"
                  className="input w-full rounded-btn px-3 py-2 text-sm uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={applying || !coupon.trim()}
                  className="btn-outline shrink-0 rounded-btn px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying ? "Applying…" : "Apply"}
                </button>
              </div>
              {couponMessage && (
                <p className="mt-3 rounded-btn bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                  {couponMessage}
                </p>
              )}
              {couponError && (
                <p className="mt-3 rounded-btn bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {couponError}
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default Component;