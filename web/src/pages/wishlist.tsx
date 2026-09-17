import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RequireAuth } from "../features/auth";
import { getWishlist, removeWishlist, moveToCart } from "../api/wishlist";
import { toApiError } from "../api/client";
import { useCart } from "../features/cart/CartProvider";
import type { WishlistItem } from "../types/models";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumbs from "../components/ui/Breadcrumbs";

export async function loader() {
  return null;
}

function WishlistContent() {
  const { refreshCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await getWishlist());
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (item: WishlistItem) => {
    setBusyId(item.id);
    try {
      await removeWishlist(item.product.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      setError(err?.response?.data?.message || toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    setBusyId(item.id);
    try {
      await moveToCart(item.product.id);
      await refreshCart();
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      setError(err?.response?.data?.message || toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  if (!items.length) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        description="Save products you like here and move them to your cart anytime."
        action={{ label: "Explore Products", to: "/products" }}
      />
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const product = item.product;
        const hasDiscount = product.discount_percent && parseFloat(product.discount_percent) > 0;
        return (
          <div key={item.id} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lift">
            <Link to={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-ink-soft/5">
              {product.primary_image ? (
                <img
                  src={product.primary_image.secure_url}
                  alt={product.primary_image.alt_text || product.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink-faint">No image</div>
              )}
              {hasDiscount && (
                <span className="absolute top-2 left-2 rounded-pill bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  {product.discount_percent}% OFF
                </span>
              )}
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link to={`/products/${product.slug}`} className="line-clamp-2 font-display text-sm font-semibold text-ink transition-colors hover:text-brand-600">
                {product.name}
              </Link>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-lg font-bold text-brand-700">
                  ₹{parseFloat(product.effective_price ?? "0").toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-ink-faint line-through">₹{parseFloat(product.mrp ?? "0").toFixed(2)}</span>
                )}
              </div>
              <div className="mt-4 flex gap-2 pt-auto">
                <button
                  type="button"
                  onClick={() => handleMoveToCart(item)}
                  disabled={busyId === item.id || !product.in_stock}
                  className="btn-primary flex-1 rounded-btn px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === item.id ? "Moving…" : "Move to Cart"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={busyId === item.id}
                  aria-label={`Remove ${product.name} from wishlist`}
                  className="btn-outline rounded-btn px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Component() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Wishlist" }]} />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">Wishlist</h1>
        <WishlistContent />
      </div>
    </RequireAuth>
  );
}

export default Component;