import { Link } from "react-router-dom";
import type { ProductListItem } from "../../types/models";
import Price from "./Price";

interface ProductCardProps {
  product: ProductListItem;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount =
    product.discount_percent && parseFloat(product.discount_percent) > 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="card group block overflow-hidden transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-ink-soft/5">
        {product.primary_image ? (
          <img
            src={product.primary_image.secure_url}
            alt={product.primary_image.alt_text || product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-faint text-sm">
            No image
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-pill bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
            {product.discount_percent}% OFF
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {product.category.name}
        </p>
        <h3 className="mt-1 font-display text-sm font-semibold leading-snug text-ink line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <Price
            amount={product.effective_price}
            className="font-display text-lg font-bold text-brand-700"
          />
          {hasDiscount && (
            <Price
              amount={product.mrp}
              className="text-sm text-ink-faint line-through"
            />
          )}
        </div>
      </div>
    </Link>
  );
}
