import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../api/products";
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

export function Component() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [category, setCategory] = useState<CategoryListItem | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const cats = await getCategories();
        const found = cats.find((c) => c.slug === slug);
        if (!found) {
          if (!cancelled) {
            setError("Category not found");
            setLoading(false);
          }
          return;
        }
        if (!cancelled) setCategory(found);

        const params: Record<string, string> = { category: slug! };
        if (page > 1) params.page = String(page);

        const { products: items, pagination: pag } = await getProducts(params);
        if (!cancelled) {
          setProducts(items);
          setPagination(pag);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Failed to load category");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, page]);

  const goToPage = useCallback(
    (p: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (p > 1) next.set("page", String(p));
        else next.delete("page");
        return next;
      });
    },
    [setSearchParams],
  );

  if (loading) return <Spinner />;
  if (error) return <div className="mx-auto max-w-7xl px-6 py-10"><ErrorBanner message={error} /></div>;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: category?.name || "Category" },
        ]}
      />

      {category && (
        <div className="mt-6">
          <h1 className="font-display text-3xl font-bold text-ink">{category.name}</h1>
          {category.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{category.description}</p>
          )}
          {category.banner && (
            <div className="mt-6 overflow-hidden rounded-card">
              <img src={category.banner} alt={category.name} className="w-full object-cover" />
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        {products.length === 0 ? (
          <EmptyState
            title="No products in this category"
            description="Check back later or browse other categories."
            action={{ label: "View All Products", to: "/products" }}
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
                  onPageChange={goToPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
