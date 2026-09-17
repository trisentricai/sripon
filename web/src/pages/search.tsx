import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts } from "../api/products";
import type { ProductListItem } from "../types/models";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setProducts([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string> = { search: q };
        if (page > 1) params.page = String(page);

        const { products: items, pagination: pag } = await getProducts(params);
        if (!cancelled) {
          setProducts(items);
          setPagination(pag);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, page]);

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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Search" }]} />

      <div className="mt-4">
        {q ? (
          <>
            <h1 className="font-display text-2xl font-bold text-ink">
              Search results for &ldquo;{q}&rdquo;
            </h1>
            {!loading && pagination && (
              <p className="mt-1 text-sm text-ink-soft">
                {pagination.total} {pagination.total === 1 ? "result" : "results"} found
              </p>
            )}
          </>
        ) : (
          <h1 className="font-display text-2xl font-bold text-ink">Search</h1>
        )}
      </div>

      <div className="mt-8">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : !q ? (
          <EmptyState
            title="Enter a search term"
            description="Search for products by name, brand, or category."
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="No results found"
            description={`We couldn't find any products matching "${q}". Try a different search term.`}
            action={{ label: "Browse All Products", to: "/products" }}
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
