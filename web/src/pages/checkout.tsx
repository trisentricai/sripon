import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RequireAuth } from "../features/auth";
import { toApiError } from "../api/client";
import { useCart } from "../features/cart/CartProvider";
import { getAddresses, createAddress } from "../api/addresses";
import { placeOrder } from "../api/orders";
import { validateCoupon } from "../api/coupons";
import type { Address, CouponValidation } from "../types/models";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import Price from "../components/ui/Price";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumbs from "../components/ui/Breadcrumbs";

export async function loader() {
  return null;
}

interface AddressFormData {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark: string;
  is_default: boolean;
}

const emptyForm: AddressFormData = {
  full_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  landmark: "",
  is_default: false,
};

function CheckoutContent() {
  const navigate = useNavigate();
  const { items, summary, loading, clearCart } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [savingAddress, setSavingAddress] = useState(false);

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAddressesLoading(true);
        const data = await getAddresses();
        if (!cancelled) {
          setAddresses(data);
          const def = data.find((a) => a.is_default);
          if (def) setSelectedId(def.id);
          else if (data.length > 0) setSelectedId(data[0].id);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load addresses");
      } finally {
        if (!cancelled) setAddressesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateField = (key: keyof AddressFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSaveAddress = async () => {
    setSavingAddress(true);
    setError(null);
    try {
      const created = await createAddress(form);
      setAddresses((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setShowForm(false);
      setForm(emptyForm);
    } catch (err: any) {
      setError(toApiError(err).message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplyingCoupon(true);
    setCouponError(null);
    setAppliedCoupon(null);
    try {
      const result = await validateCoupon(coupon.trim(), summary?.subtotal ?? "0");
      setAppliedCoupon(result);
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || toApiError(err).message);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedId) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      const order = await placeOrder({
        address_id: selectedId,
        coupon_code: appliedCoupon?.code,
      });
      await clearCart();
      navigate(`/orders/${order.id}`, { state: { success: true } });
    } catch (err: any) {
      setPlaceError(err?.response?.data?.message || toApiError(err).message);
      setPlacing(false);
    }
  };

  if (loading || addressesLoading) return <Spinner />;

  if (!items.length) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add products to your cart before checking out."
        action={{ label: "Continue Shopping", to: "/products" }}
      />
    );
  }

  const subtotal = parseFloat(summary?.subtotal ?? "0");
  const discount = appliedCoupon ? parseFloat(appliedCoupon.discount ?? "0") : 0;
  const totalValue = Math.max(0, subtotal - discount);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Cart", to: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">Checkout</h1>
      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Delivery Address</h2>
              {!showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="btn-outline rounded-btn px-4 py-2 text-sm font-semibold"
                >
                  Add New Address
                </button>
              )}
            </div>

            {addresses.length > 0 && !showForm && (
              <div className="mt-4 space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 rounded-btn border-2 p-4 transition-colors cursor-pointer ${
                      selectedId === addr.id
                        ? "border-brand-600 bg-brand-600/5"
                        : "border-ink-soft/15 hover:border-ink-soft/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedId === addr.id}
                      onChange={() => setSelectedId(addr.id)}
                      className="mt-1 size-4 accent-brand-600"
                    />
                    <div className="text-sm">
                      <p className="font-semibold text-ink">
                        {addr.full_name}
                        {addr.is_default && (
                          <span className="badge ml-2 bg-accent-400/20 text-ink">Default</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-ink-soft">
                        {[addr.address_line_1, addr.address_line_2].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-ink-soft">
                        {[addr.city, addr.district, addr.state, addr.pincode].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-ink-faint">{addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {addresses.length === 0 && !showForm && (
              <p className="mt-4 text-sm text-ink-soft">
                No saved addresses yet. Add one to continue with checkout.
              </p>
            )}

            {(showForm || addresses.length === 0) && (
              <div className="mt-4 space-y-4 rounded-btn border border-ink-soft/15 bg-paper p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="co-full-name">Full Name</label>
                    <input id="co-full-name" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="co-phone">Phone</label>
                    <input id="co-phone" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="co-line-1">Address Line 1</label>
                    <input id="co-line-1" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.address_line_1} onChange={(e) => updateField("address_line_1", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="co-line-2">Address Line 2 (optional)</label>
                    <input id="co-line-2" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.address_line_2} onChange={(e) => updateField("address_line_2", e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="co-city">City</label>
                    <input id="co-city" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="co-district">District</label>
                    <input id="co-district" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.district} onChange={(e) => updateField("district", e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="co-state">State</label>
                    <input id="co-state" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="co-pincode">Pincode</label>
                    <input id="co-pincode" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="co-landmark">Landmark</label>
                    <input id="co-landmark" className="input mt-1 w-full rounded-btn px-3 py-2 text-sm" value={form.landmark} onChange={(e) => updateField("landmark", e.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={form.is_default} onChange={(e) => updateField("is_default", e.target.checked)} className="size-4 accent-brand-600" />
                  Set as default address
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={handleSaveAddress} disabled={savingAddress} className="btn-primary rounded-btn px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
                    {savingAddress ? "Saving…" : "Save Address"}
                  </button>
                  {addresses.length > 0 && (
                    <button type="button" onClick={() => setShowForm(false)} className="btn-ghost rounded-btn px-5 py-2.5 text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Coupon</h2>
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
                disabled={applyingCoupon || !coupon.trim() || !!appliedCoupon}
                className="btn-outline shrink-0 rounded-btn px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applyingCoupon ? "Checking…" : "Apply"}
              </button>
            </div>
            {appliedCoupon && (
              <p className="mt-3 rounded-btn bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                Coupon {appliedCoupon.code.toUpperCase()} applied — you save{" "}
                <Price amount={appliedCoupon.discount} />
              </p>
            )}
            {couponError && (
              <p className="mt-3 rounded-btn bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {couponError}
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Order Summary</h2>
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-btn bg-ink-soft/5">
                    {item.product.primary_image ? (
                      <img src={item.product.primary_image.secure_url} alt={item.product.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-ink-faint">No image</div>
                    )}
                    <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-ink">{item.product.name}</span>
                  <span className="font-medium text-ink">
                    <Price amount={item.line_total} />
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-ink-soft/10 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-medium text-ink">
                  <Price amount={summary?.subtotal ?? subtotal.toFixed(2)} />
                </dd>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">Coupon Discount</dt>
                  <dd className="font-medium text-green-600">
                    −<Price amount={discount.toFixed(2)} />
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Tax</dt>
                <dd className="font-medium text-ink">
                  <Price amount={summary?.tax_total ?? "0"} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="text-ink-faint">Calculated at checkout</dd>
              </div>
              <div className="flex items-center justify-between border-t border-ink-soft/10 pt-3">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="font-display text-xl font-bold text-brand-700">
                  <Price amount={totalValue.toFixed(2)} />
                </dd>
              </div>
            </dl>
            {placeError && <div className="mt-3"><ErrorBanner message={placeError} /></div>}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={!selectedId || placing}
              className="btn-primary mt-5 w-full rounded-btn px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {placing ? "Placing Order…" : selectedId ? "Place Order" : "Select an Address"}
            </button>
            <p className="mt-3 text-center text-xs text-ink-faint">
              By placing this order you agree to our{" "}
              <Link to="/terms" className="text-brand-600 hover:underline">Terms</Link> and{" "}
              <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function Component() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}

export default Component;