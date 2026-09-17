import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProduct } from "../api/products";
import { useCart } from "../features/cart/CartProvider";
import type { ProductDetail } from "../types/models";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import Price from "../components/ui/Price";
import QtyStepper from "../components/ui/QtyStepper";
import Breadcrumbs from "../components/ui/Breadcrumbs";

export async function loader() {
  return null;
}

export function Component() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProduct(slug!);
        if (!cancelled) {
          setProduct(data);
          setQty(data.minimum_order_quantity || 1);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Product not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, qty);
    } catch {
      // silently fail — cart provider handles errors
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, qty);
      navigate("/cart");
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <Spinner />;
  if (error || !product) return <div className="mx-auto max-w-7xl px-6 py-10"><ErrorBanner message={error || "Product not found"} /></div>;

  const hasDiscount = product.discount_percent && parseFloat(product.discount_percent) > 0;
  const disabled = !product.in_stock || product.available_quantity <= 0;
  const allImages = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
  const displayImages = allImages.length > 0
    ? allImages
    : product.primary_image
      ? [{ secure_url: product.primary_image.secure_url, alt_text: product.primary_image.alt_text, id: 0, public_id: "", width: 0, height: 0, is_primary: true, sort_order: 0 }]
      : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: product.category.name, to: `/category/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-card bg-ink-soft/5">
            {displayImages.length > 0 ? (
              <img
                src={displayImages[selectedImage]?.secure_url}
                alt={displayImages[selectedImage]?.alt_text || product.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-faint">No image</div>
            )}
            {hasDiscount && (
              <span className="absolute top-3 left-3 rounded-pill bg-brand-600 px-3 py-1 text-xs font-bold text-white">
                {product.discount_percent}% OFF
              </span>
            )}
          </div>
          {displayImages.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {displayImages.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`shrink-0 size-16 overflow-hidden rounded-btn border-2 transition-colors ${
                    i === selectedImage ? "border-brand-600" : "border-transparent hover:border-ink-soft/30"
                  }`}
                >
                  <img
                    src={img.secure_url}
                    alt={img.alt_text}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{product.category.name}</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{product.name}</h1>

          {product.brand && (
            <p className="mt-1 text-sm text-ink-soft">by {product.brand}</p>
          )}

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <Price amount={product.effective_price} className="font-display text-3xl font-bold text-brand-700" />
            {hasDiscount && (
              <>
                <Price amount={product.mrp} className="text-lg text-ink-faint line-through" />
                <span className="rounded-pill bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">
                  {product.discount_percent}% off
                </span>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{product.short_description}</p>
          )}

          {/* Stock status */}
          <div className="mt-4">
            {product.in_stock && product.available_quantity > 0 ? (
              <span className="text-sm font-medium text-green-700">In Stock</span>
            ) : (
              <span className="text-sm font-medium text-red-600">Out of Stock</span>
            )}
          </div>

          {/* Qty + Actions */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <QtyStepper
                value={qty}
                onChange={setQty}
                min={product.minimum_order_quantity || 1}
                max={Math.min(product.maximum_order_quantity || 99, product.available_quantity)}
                disabled={disabled}
              />
              {product.minimum_order_quantity > 1 && (
                <span className="text-xs text-ink-faint">
                  Min. order: {product.minimum_order_quantity} {product.unit}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={disabled || adding}
                className="btn-primary rounded-btn px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add to Cart"}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={disabled || adding}
                className="rounded-btn border-2 border-brand-600 px-6 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy Now
              </button>
            </div>
          </div>

          {/* Highlights */}
          {product.highlights && product.highlights.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">Highlights</h3>
              <ul className="mt-3 space-y-1.5">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink">
                    <svg className="mt-0.5 size-4 shrink-0 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">Specifications</h3>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <tr key={key} className="border-b border-ink-soft/10 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-ink-soft">{key}</td>
                      <td className="py-2.5 text-ink">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-8">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">Description</h3>
              <div
                className="mt-3 text-sm leading-relaxed text-ink prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
