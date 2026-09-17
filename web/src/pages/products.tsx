import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts, getCategories } from "../api/products";
import type { ProductListItem, CategoryListItem } from "../types/models";
import type { Pagination as PaginationInfo } from "../types/api";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import ProductCard from "../components/ui/ProductCard";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";

export async function loader() {
  return null;
}

const ORDERING_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
  { value: "popularity", label: "Popularity" },
  { value: "-discount", label: "Biggest Discount" },
];

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const ordering = searchParams.get("ordering") || "";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string> = {};
        if (page > 1) params.page = String(page);
        if (search) params.search = search;
        if (category) params.category = category;
        if (ordering) params.ordering = ordering;
        if (minPrice) params.min_price = minPrice;
        if (maxPrice) params.max_price = maxPrice;

        const { products: items, pagination: pag } = await getProducts(params);
        if (!cancelled) {
          setProducts(items);
          setPagination(pag);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, search, category, ordering, minPrice, maxPrice]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        return next;
      });
    },
    [setSearchParams],
  );

  const toggleCategory = useCallback(
    (slug: string) => {
      updateParam("category", category === slug ? "" : slug);
    },
    [category, updateParam],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Products" }]} />

      <h1 className="mt-4 font-display text-3xl font-bold text-ink">Products</h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 space-y-6 lg:w-56">
          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Categories</h3>
            <div className="mt-3 space-y-1.5">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 text-sm transition-colors hover:bg-ink-soft/5"
                >
                  <input
                    type="checkbox"
                    checked={category === cat.slug}
                    onChange={() => toggleCategory(cat.slug)}
                    className="size-4 rounded border-ink-soft/30 text-brand-600 accent-brand-600"
                  />
                  <span className="text-ink">{cat.name}</span>
                  {cat.product_count > 0 && (
                    <span className="ml-auto text-xs text-ink-faint">({cat.product_count})</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Price Range</h3>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => updateParam("min_price", e.target.value)}
                className="input w-full rounded-btn border px-3 py-1.5 text-sm"
              />
              <span className="text-ink-faint">–</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => updateParam("max_price", e.target.value)}
                className="input w-full rounded-btn border px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Ordering */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Sort By</h3>
            <select
              value={ordering}
              onChange={(e) => updateParam("ordering", e.target.value)}
              className="input mt-3 w-full rounded-btn border px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              {ORDERING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : products.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your filters or search terms."
              action={{ label: "Clear Filters", to: "/products" }}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {pagination && (
                <div className="mt-10">
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.total_pages}
                    onPageChange={(p) => updateParam("page", p > 1 ? String(p) : "")}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
